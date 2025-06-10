from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import time
import torch
import uvicorn
import logging
from contextlib import asynccontextmanager
from sentence_transformers import SentenceTransformer

from app.config import Settings
from app.document_processor import DocumentProcessor
from app.ai_search import AISearchService, AISearchRequest, AISearchResponse

from models.mistral import Mistral7B

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

class GenerationRequest(BaseModel):
    prompt: str
    max_length: int = 512
    temperature: float = 0.7
    top_p: float = 0.9
    system_prompt: Optional[str] = None

class GenerationResponse(BaseModel):
    text: str
    processing_time: float

class EmbeddingRequest(BaseModel):
    text: str

class EmbeddingResponse(BaseModel):
    embedding: List[float]
    dimension: int
    processing_time: float

class DocumentProcessRequest(BaseModel):
    file_path: str
    file_name: str
    file_id: int

class DocumentProcessResponse(BaseModel):
    success: bool
    message: str
    file_id: int
    chunks_stored: int
    processing_time: float

class SearchRequest(BaseModel):
    query: str
    n_results: int = 5

class SearchResponse(BaseModel):
    results: List[Dict[str, Any]]
    processing_time: float

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


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "model": "Mistral 7B", "device": settings.device}

@app.post("/generate", response_model=GenerationResponse)
async def generate_text(request: GenerationRequest):
    """Generate text based on prompt"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        start_time = time.time()
        result = model.generate(
            prompt=request.prompt,
            max_length=request.max_length,
            temperature=request.temperature,
            top_p=request.top_p,
            system_prompt=request.system_prompt
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
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        start_time = time.time()
        embedding = model.embed_text(request.text)
        processing_time = time.time() - start_time
        
        return EmbeddingResponse(
            embedding=embedding,
            dimension=len(embedding),
            processing_time=processing_time
        )
    except Exception as e:
        logger.error(f"Embedding error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")

@app.get("/memory")
async def get_memory_usage():
    """Get GPU memory usage if available"""
    if not torch.cuda.is_available():
        return {"device": "cpu", "memory_allocated": "N/A"}
    
    allocated = torch.cuda.memory_allocated(0) / (1024 ** 3)  # GB
    reserved = torch.cuda.memory_reserved(0) / (1024 ** 3)    # GB
    
    return {
        "device": torch.cuda.get_device_name(0),
        "memory_allocated_gb": round(allocated, 2),
        "memory_reserved_gb": round(reserved, 2)
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
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=False)