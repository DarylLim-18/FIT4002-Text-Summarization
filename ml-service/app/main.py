from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import time
import torch
import uvicorn
import logging

from app.config import Settings
from models.mistral import Mistral7B

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize settings
settings = Settings()

# Initialize FastAPI app
app = FastAPI(
    title="Mistral 7B API",
    description="API for text generation using Mistral 7B",
    version="1.0.0"
)

# Global model instance
model = None

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

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    global model
    try:
        model = Mistral7B(
            model_path=settings.model_path,
            device=settings.device,
            quantize=settings.quantize
        )
        logger.info(f"Model loaded successfully on {settings.device}")
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")

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

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=False)