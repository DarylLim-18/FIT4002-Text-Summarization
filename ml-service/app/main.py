from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import time
import logging
<<<<<<< HEAD
from contextlib import asynccontextmanager
from sentence_transformers import SentenceTransformer

from app.config import Settings
from app.document_processor import DocumentProcessor
from app.ai_search import AISearchService, AISearchRequest, AISearchResponse

from models.mistral import Mistral7B
=======
import uuid

from app.config import settings
from services.ollama_service import OllamaService
from services.chroma_service import ChromaService
>>>>>>> 936e198 (Implement ML Service and update API.js)

# Global variables
model = None
document_processor = None
embedding_model = None
settings = Settings()
ai_search_service = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

<<<<<<< HEAD

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup and cleanup on shutdown"""
    global model, document_processor, embedding_model, ai_search_service
    try:

        # Initialize model
        model = Mistral7B(
            model_path=settings.model_path,
            device=settings.device,
            quantize=settings.quantize
        )
        logger.info(f"Model loaded successfully on {settings.device}")

        # Load a dedicated embedding model
        embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Embedding model loaded successfully")
        
        # Initialize document processor
        document_processor = DocumentProcessor()
        logger.info("Document processor initialized")

        # Initialize AI search service
        ai_search_service = AISearchService(model, embedding_model, document_processor)
        logger.info("AI Search Service initialized")

    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        raise
    yield
    # Shutdown - add cleanup code here if needed
    logger.info("Shutting down...")

# Initialize FastAPI app
app = FastAPI(
    title="Mistral 7B API",
    description="API for text generation using Mistral 7B",
    version="1.0.0",
    lifespan=lifespan
)

=======
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
>>>>>>> 936e198 (Implement ML Service and update API.js)
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

<<<<<<< HEAD
class DocumentProcessRequest(BaseModel):
    file_path: str
    file_name: str
    file_id: int

class DocumentProcessResponse(BaseModel):
    success: bool
    message: str
    file_id: int
    chunks_stored: int
=======
class SummarizationRequest(BaseModel):
    text: str
    max_length: Optional[int] = 150
    temperature: Optional[float] = 0.3

class SummarizationResponse(BaseModel):
    summary: str
    original_length: int
    summary_length: int
    compression_ratio: float
>>>>>>> 936e198 (Implement ML Service and update API.js)
    processing_time: float

class SearchRequest(BaseModel):
    query: str
    n_results: int = 5
<<<<<<< HEAD
=======
    filters: Optional[Dict[str, Any]] = None
>>>>>>> 936e198 (Implement ML Service and update API.js)

class SearchResponse(BaseModel):
    results: List[Dict[str, Any]]
    processing_time: float

<<<<<<< HEAD
# @app.on_event("startup")
# async def startup_event():
#     """Load model on startup"""
#     global model
#     try:
#         model = Mistral7B(
#             model_path=settings.model_path,
#             device=settings.device,
#             quantize=settings.quantize
#         )
#         logger.info(f"Model loaded successfully on {settings.device}")
#     except Exception as e:
#         logger.error(f"Failed to load model: {str(e)}")
#         raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")

=======
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
>>>>>>> 936e198 (Implement ML Service and update API.js)

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
        system_prompt = "You are a professional document summarizer. Create a concise, clear summary that in 50 words that captures the purpose of the document and its main points."
        
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

@app.post("/search", response_model=SearchResponse)
async def search_documents(request: SearchRequest):
    """Search similar documents"""
    try:
        start_time = time.time()
        
        # Get query embedding
        query_embedding = ollama_service.embed_text(request.query)
        
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

@app.post("/process-document", response_model=DocumentProcessResponse)
async def process_document(request: DocumentProcessRequest):
    """Process document and store in vector database"""
    if model is None or embedding_model is None:
        raise HTTPException(status_code=503, detail="Models not loaded")
    if document_processor is None:
        raise HTTPException(status_code=503, detail="Document processor not initialized")
    try:

        start_time = time.time()
        logger.info(f"Processing document: {request.file_name}")

        # Check if file exists
        if not os.path.exists(request.file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")
        
        # Process document and extract text
        processed_doc = document_processor.process_document(
            request.file_path, 
            request.file_name, 
            request.file_id
        )
        
        # Generate embeddings for text chunks
        chunks = document_processor.chunk_text(processed_doc["extracted_text"])
        embeddings = embedding_model.encode(chunks).tolist()
        
        # Store in vector database
        success = await document_processor.store_in_vector_db(processed_doc, embeddings)
        
        processing_time = time.time() - start_time
        
        return DocumentProcessResponse(
            success=success,
            message=f"Document processed and stored successfully" if success else "Failed to store in vector DB",
            file_id=request.file_id,
            chunks_stored=len(chunks),
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Document processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")

@app.post("/search-documents", response_model=SearchResponse)
async def search_documents(request: SearchRequest):
    """Search for similar documents using query"""
    if embedding_model is None:
        raise HTTPException(status_code=503, detail="Embedding model not loaded")
    
    try:
        start_time = time.time()
        
        # Generate embedding for query
        query_embedding = embedding_model.encode([request.query])[0].tolist()
        
        # Search in vector database
        search_results = document_processor.search_similar_documents(
            query_embedding, 
            request.n_results
        )
        
        processing_time = time.time() - start_time
        
        # Format results
        formatted_results = []
        for i in range(len(search_results["ids"])):
            formatted_results.append({
                "id": search_results["ids"][i],
                "content": search_results["documents"][i],
                "metadata": search_results["metadatas"][i],
                "similarity_score": 1 - search_results["distances"][i] if search_results["distances"] else 0
            })
        
        return SearchResponse(
            results=formatted_results,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.delete("/document/{file_id}")
async def delete_document_from_vector_db(file_id: int):
    """Delete document from vector database"""
    try:
        success = document_processor.delete_document_from_vector_db(file_id)
        return {"success": success, "message": f"Document {file_id} deleted from vector DB"}
    except Exception as e:
        logger.error(f"Delete error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
    
@app.get("/vector-db-status")
async def get_vector_db_status():
    """Get vector database status and document count"""
    try:
        # Get all documents in collection
        results = document_processor.collection.get()
        
        # Group by file_id to count unique files
        file_ids = set()
        for metadata in results["metadatas"]:
            if "file_id" in metadata:
                file_ids.add(metadata["file_id"])
        
        return {
            "collection_name": document_processor.collection_name,
            "total_chunks": len(results["ids"]),
            "unique_files": len(file_ids),
            "file_ids": list(file_ids),
            "status": "healthy"
        }
    except Exception as e:
        logger.error(f"Vector DB status error: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }
    
@app.post("/ai-search", response_model=AISearchResponse)
async def ai_search(request: AISearchRequest):
    """AI-enhanced search with customizable features"""
    if ai_search_service is None:
        raise HTTPException(status_code=503, detail="AI Search Service not initialized")
    
    try:
        return await ai_search_service.hybrid_search(request)
    except Exception as e:
        logger.error(f"AI search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI search failed: {str(e)}")

@app.post("/smart-search")
async def smart_search(query: str, n_results: int = 5):
    """Quick smart search with AI enhancement and explanations"""
    if ai_search_service is None:
        raise HTTPException(status_code=503, detail="AI Search Service not initialized")
    
    try:
        return await ai_search_service.smart_search(query, n_results)
    except Exception as e:
        logger.error(f"Smart search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Smart search failed: {str(e)}")

@app.post("/deep-search")
async def deep_search(query: str, n_results: int = 5):
    """Thorough search with all AI features enabled"""
    if ai_search_service is None:
        raise HTTPException(status_code=503, detail="AI Search Service not initialized")
    
    try:
        return await ai_search_service.deep_search(query, n_results)
    except Exception as e:
        logger.error(f"Deep search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Deep search failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=False)