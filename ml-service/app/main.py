from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import time
import logging
import uuid

from app.config import settings
from services.ollama_service import OllamaService
from services.chroma_service import ChromaService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="ML Service API",
    description="API for text generation and vector search using Ollama and ChromaDB",
    version="1.0.0"
)

# Initialize services
ollama_service = OllamaService(
    host=settings.ollama_host,
    model=settings.ollama_model
)

chroma_service = ChromaService(
    persist_directory=settings.chroma_persist_directory,
    collection_name=settings.chroma_collection_name
)

# Pydantic models
class GenerationRequest(BaseModel):
    prompt: str
    system_prompt: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 512

class GenerationResponse(BaseModel):
    text: str
    processing_time: float

class EmbeddingRequest(BaseModel):
    text: str

class EmbeddingResponse(BaseModel):
    embedding: List[float]
    dimension: int
    processing_time: float

class SummarizationRequest(BaseModel):
    text: str
    max_length: Optional[int] = 150
    temperature: Optional[float] = 0.3

class SummarizationResponse(BaseModel):
    summary: str
    original_length: int
    summary_length: int
    compression_ratio: float
    processing_time: float

class SearchRequest(BaseModel):
    query: str
    n_results: int = 5
    filters: Optional[Dict[str, Any]] = None

class SearchResponse(BaseModel):
    results: List[Dict[str, Any]]
    processing_time: float

class DocumentRequest(BaseModel):
    document_id: str
    text: str
    metadata: Optional[Dict[str, Any]] = None

class DocumentResponse(BaseModel):
    document_id: str
    status: str
    processing_time: float

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting ML Service...")
    
    # Check Ollama availability
    if not ollama_service.is_available():
        logger.warning("Ollama service is not available")
    else:
        logger.info("Ollama service is ready")
    
    logger.info("ChromaDB service initialized")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok", 
        "service": "ML Service",
        "ollama_available": ollama_service.is_available(),
        "chroma_stats": chroma_service.get_collection_stats()
    }

@app.post("/generate", response_model=GenerationResponse)
async def generate_text(request: GenerationRequest):
    """Generate text using Ollama"""
    try:
        start_time = time.time()
        result = ollama_service.generate(
            prompt=request.prompt,
            system_prompt=request.system_prompt,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        processing_time = time.time() - start_time
        
        return GenerationResponse(
            text=result,
            processing_time=processing_time
        )
    except Exception as e:
        logger.error(f"Generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.post("/embed", response_model=EmbeddingResponse)
async def embed_text(request: EmbeddingRequest):
    """Get text embedding"""
    try:
        start_time = time.time()
        embedding = ollama_service.embed_text(request.text)
        processing_time = time.time() - start_time
        
        return EmbeddingResponse(
            embedding=embedding,
            dimension=len(embedding),
            processing_time=processing_time
        )
    except Exception as e:
        logger.error(f"Embedding error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")
    
@app.post("/summarize", response_model=SummarizationResponse)
async def summarize_text(request: SummarizationRequest):
    """Summarize text using Ollama"""
    try:
        start_time = time.time()

        prompt = f"Summarize the following document:\n\n{request.text}\n\nSummary:"
        system_prompt = "You are a professional document summarizer. Create a concise, clear summary that in 50 words that captures the purpose of the document and its main points. DO NOT EXCEED 50 WORDS"
        
        # Generate summary
        summary = ollama_service.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=request.temperature,
            max_tokens=request.max_length
        )
        
        processing_time = time.time() - start_time
        
        # Calculate metrics
        original_length = len(request.text.split())
        summary_length = len(summary.split())
        compression_ratio = summary_length / original_length if original_length > 0 else 0
        
        return SummarizationResponse(
            summary=summary.strip(),
            original_length=original_length,
            summary_length=summary_length,
            compression_ratio=compression_ratio,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Summarization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")
    
async def rank_results(query: str, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Rerank search results using Ollama to compare query with document summaries.
    
    Args:
        query: Original search query
        results: List of search results with metadata
        
    Returns:
        Reranked list of results with relevance scores
    """
    try:
        ranked_results = []
        
        for result in results:
            # Extract summary from metadata or use document preview
            summary = result.get('metadata', {}).get('summary', '')
            if not summary:
                # Use first 200 chars of document as fallback
                summary = result.get('document', '')[:200]
            
            # Create relevance assessment prompt
            prompt = f"""Query: {query}

Document Summary: {summary}

On a scale of 0-10, rate how relevant this document is to the query. 
Consider semantic meaning, topic alignment, and usefulness.
Respond with ONLY a number between 0 and 10."""

            system_prompt = "You are a document relevance scorer. Provide only numerical scores."
            
            try:
                # Get relevance score from Ollama
                score_text = ollama_service.generate(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    temperature=0.1,  # Low temperature for consistent scoring
                    max_tokens=10
                )
                
                # Extract numeric score
                score = float(''.join(filter(str.isdigit, score_text.strip()[:2])))
                score = min(max(score, 0), 10)  # Clamp between 0-10
                
            except Exception as score_error:
                logger.warning(f"Scoring failed for result, using distance: {score_error}")
                # Fallback to distance-based score
                score = (1 - result.get('distance', 0.5)) * 10
            
            ranked_results.append({
                **result,
                'relevance_score': score
            })
        
        # Sort by relevance score (highest first)
        ranked_results.sort(key=lambda x: x['relevance_score'], reverse=True)
        logger.info(f"Reranked {len(ranked_results)} results based on relevance scores")
        return ranked_results
        
    except Exception as e:
        logger.error(f"Ranking error: {str(e)}")
        # Return original results if ranking fails
        return results

@app.post("/search", response_model=SearchResponse)
async def search_documents(request: SearchRequest):
    """Search similar documents"""
    try:
        start_time = time.time()

        to_enhance = True
        if to_enhance:
            # Enhance query using Mistral
            try:
                enhance_prompt = f"""Original search query: "{request.query}"

    Expand this query by:
    1. Adding relevant synonyms and related terms
    2. Including technical terminology if applicable
    3. Clarifying ambiguous terms
    4. Keeping the core intent

    Provide ONLY the enhanced query, no explanations."""

                system_prompt = """You are a search query optimizer. Expand queries to improve semantic search results while preserving the original intent. Output only the enhanced query text."""
                
                enhanced_query = ollama_service.generate(
                    prompt=enhance_prompt,
                    system_prompt=system_prompt,
                    temperature=0.3,  # Low temperature for consistent expansion
                    max_tokens=100
                ).strip()
                
                # Use enhanced query if it's reasonable, otherwise fall back to original
                if len(enhanced_query) > 0 and len(enhanced_query) < 500:
                    logger.info(f"Enhanced query: '{request.query}' -> '{enhanced_query}'")
                    query_to_embed = enhanced_query
                else:
                    logger.warning("Query enhancement produced invalid result, using original")
                    query_to_embed = request.query
                    
            except Exception as enhance_error:
                logger.warning(f"Query enhancement failed: {enhance_error}, using original query")
                query_to_embed = request.query
        else:
            query_to_embed = request.query
        
        # Get query embedding
        query_embedding = ollama_service.embed_text(query_to_embed)
        
        # Search in ChromaDB
        results = chroma_service.search_similar(
            query_embedding=query_embedding,
            n_results=request.n_results,
            where=request.filters
        )
        
        processing_time = time.time() - start_time
        
        # Format results
        formatted_results = []
        for i in range(len(results["documents"])):
            formatted_results.append({
                "document": results["documents"][i],
                "metadata": results["metadatas"][i] if i < len(results["metadatas"]) else {},
                "distance": results["distances"][i] if i < len(results["distances"]) else 0.0
            })
        
        return SearchResponse(
            results=formatted_results,
            processing_time=processing_time
        )
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.post("/documents", response_model=DocumentResponse)
async def add_document(request: DocumentRequest):
    """Add document to vector database"""
    try:
        start_time = time.time()
        
        # Get embedding for the document
        embedding = ollama_service.embed_text(request.text)
        
        # Add to ChromaDB
        document_id = chroma_service.add_document(
            document_id=request.document_id,
            text=request.text,
            embedding=embedding,
            metadata=request.metadata
        )
        
        processing_time = time.time() - start_time
        
        return DocumentResponse(
            document_id=document_id,
            status="success",
            processing_time=processing_time
        )
    except Exception as e:
        logger.error(f"Document addition error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add document: {str(e)}")

@app.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete document from vector database"""
    try:
        success = chroma_service.delete_document(document_id)
        if success:
            return {"status": "success", "message": f"Document {document_id} deleted"}
        else:
            raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        logger.error(f"Document deletion error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

@app.get("/stats")
async def get_stats():
    """Get service statistics"""
    return {
        "ollama_available": ollama_service.is_available(),
        "chroma_stats": chroma_service.get_collection_stats()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=False)