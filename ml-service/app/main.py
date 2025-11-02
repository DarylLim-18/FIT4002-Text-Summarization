"""
ML Service API - Main Application Module.

This module provides a FastAPI-based REST API for text generation, summarization,
embedding generation, and vector-based document search using Ollama and ChromaDB.

The service offers the following capabilities:
- Text generation using LLMs via Ollama
- Document summarization with configurable parameters
- Text embedding generation for semantic search
- Vector-based document storage and retrieval
- Semantic search with query enhancement
"""

import time
import logging
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from services.chroma_service import ChromaService
from services.ollama_service import OllamaService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Initialize FastAPI application
app = FastAPI(
    title="ML Service API",
    description="API for text generation and vector search using Ollama and ChromaDB",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Initialize services as singletons
ollama_service = OllamaService(
    host=settings.ollama_host, model=settings.ollama_model
)

chroma_service = ChromaService(
    persist_directory=settings.chroma_persist_directory,
    collection_name=settings.chroma_collection_name,
    num_results=settings.num_results
)

# ============================================================================
# Request/Response Models
# ============================================================================


class GenerationRequest(BaseModel):
    """Request model for text generation."""

    prompt: str = Field(
        ..., min_length=1, max_length=10000, description="Input prompt for text generation"
    )
    system_prompt: Optional[str] = Field(
        None, max_length=2000, description="Optional system prompt to guide generation"
    )
    temperature: float = Field(
        default=0.7,
        ge=0.0,
        le=2.0,
        description="Sampling temperature (0.0-2.0). Higher values produce more random output",
    )
    max_tokens: int = Field(
        default=512,
        ge=1,
        le=4096,
        description="Maximum number of tokens to generate",
    )


class GenerationResponse(BaseModel):
    """Response model for text generation."""

    text: str = Field(..., description="Generated text output")
    processing_time: float = Field(..., description="Processing time in seconds")


class EmbeddingRequest(BaseModel):
    """Request model for embedding generation."""

    text: str = Field(
        ..., min_length=1, max_length=50000, description="Text to generate embedding for"
    )


class EmbeddingResponse(BaseModel):
    """Response model for embedding generation."""

    embedding: List[float] = Field(..., description="Generated embedding vector")
    dimension: int = Field(..., description="Dimensionality of the embedding")
    processing_time: float = Field(..., description="Processing time in seconds")


class SummarizationRequest(BaseModel):
    """Request model for text summarization."""

    text: str = Field(
        ..., min_length=1, max_length=100000, description="Text to summarize"
    )
    max_length: Optional[int] = Field(
        default=150,
        ge=10,
        le=1000,
        description="Maximum length of summary in tokens",
    )
    temperature: Optional[float] = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Sampling temperature for summary generation",
    )


class SummarizationResponse(BaseModel):
    """Response model for text summarization."""

    summary: str = Field(..., description="Generated summary")
    original_length: int = Field(..., description="Word count of original text")
    summary_length: int = Field(..., description="Word count of summary")
    compression_ratio: float = Field(
        ..., description="Ratio of summary length to original length"
    )
    processing_time: float = Field(..., description="Processing time in seconds")


class SearchRequest(BaseModel):
    """Request model for semantic search."""

    query: str = Field(
        ..., min_length=1, max_length=1000, description="Search query"
    )
    filters: Optional[Dict[str, Any]] = Field(
        None, description="Optional metadata filters"
    )


class SearchResponse(BaseModel):
    """Response model for semantic search."""

    results: List[Dict[str, Any]] = Field(..., description="Search results")
    processing_time: float = Field(..., description="Processing time in seconds")


class DocumentRequest(BaseModel):
    """Request model for adding documents."""

    document_id: str = Field(
        ..., min_length=1, max_length=255, description="Unique document identifier"
    )
    text: str = Field(..., min_length=1, description="Document text content")
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Optional document metadata"
    )


class DocumentResponse(BaseModel):
    """Response model for document operations."""

    document_id: str = Field(..., description="Document identifier")
    status: str = Field(..., description="Operation status")
    processing_time: float = Field(..., description="Processing time in seconds")


class HealthCheckResponse(BaseModel):
    """Response model for health check endpoint."""

    status: str = Field(..., description="Service status")
    service: str = Field(..., description="Service name")
    ollama_available: bool = Field(..., description="Ollama service availability")
    chroma_stats: Dict[str, Any] = Field(..., description="ChromaDB statistics")


# ============================================================================
# Lifecycle Events
# ============================================================================


@app.on_event("startup")
async def startup_event() -> None:
    """
    Initialize services on application startup.

    Checks Ollama service availability and logs initialization status.
    """
    logger.info("Starting ML Service...")

    # Verify Ollama availability
    if not ollama_service.is_available():
        logger.warning(
            "Ollama service is not available. "
            "Please ensure Ollama is running on %s",
            settings.ollama_host,
        )
    else:
        logger.info("Ollama service is ready (model: %s)", settings.ollama_model)

    logger.info("ChromaDB service initialized")
    logger.info("ML Service is ready to accept requests")

@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Clean up resources on application shutdown."""
    logger.info("Shutting down ML Service...")
    # Add any cleanup logic here for future development


# ============================================================================
# API Endpoints
# ============================================================================


@app.get("/", response_model=HealthCheckResponse)
async def health_check() -> HealthCheckResponse:
    """
    Health check endpoint.

    Returns:
        Service status and component availability information.

    Example:
        ```bash
        curl http://localhost:8000/
        ```
    """
    return HealthCheckResponse(
        status="healthy",
        service="ML Service",
        ollama_available=ollama_service.is_available(),
        chroma_stats=chroma_service.get_collection_stats(),
    )


@app.post("/generate", response_model=GenerationResponse)
async def generate_text(request: GenerationRequest) -> GenerationResponse:
    """
    Generate text using Ollama LLM.

    Args:
        request: Generation request with prompt and parameters.

    Returns:
        Generated text and processing metrics.

    Raises:
        HTTPException: If generation fails.

    Example:
        ```json
        {
            "prompt": "Explain artificial intelligence in simple terms.",
            "temperature": 0.7,
            "max_tokens": 200
        }
        ```
    """
    try:
        start_time = time.time()

        result = ollama_service.generate(
            prompt=request.prompt,
            system_prompt=request.system_prompt,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        processing_time = time.time() - start_time
        logger.info(
            "Generated text in %.2fs (length: %d chars)",
            processing_time,
            len(result),
        )

        return GenerationResponse(text=result, processing_time=processing_time)

    except Exception as e:
        logger.error("Generation error: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Generation failed: {str(e)}"
        ) from e


@app.post("/embed", response_model=EmbeddingResponse)
async def embed_text(request: EmbeddingRequest) -> EmbeddingResponse:
    """
    Generate text embedding vector.

    Args:
        request: Embedding request with text.

    Returns:
        Embedding vector and metadata.

    Raises:
        HTTPException: If embedding generation fails.

    Example:
        ```json
        {
            "text": "Machine learning is a subset of AI"
        }
        ```
    """
    try:
        start_time = time.time()

        embedding = ollama_service.embed_text(request.text)
        processing_time = time.time() - start_time

        logger.info(
            "Generated embedding in %.2fs (dimension: %d)",
            processing_time,
            len(embedding),
        )

        return EmbeddingResponse(
            embedding=embedding,
            dimension=len(embedding),
            processing_time=processing_time,
        )

    except Exception as e:
        logger.error("Embedding error: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Embedding failed: {str(e)}"
        ) from e

    
@app.post("/summarize", response_model=SummarizationResponse)
async def summarize_text(request: SummarizationRequest) -> SummarizationResponse:
    """
    Summarize text using Ollama LLM.

    Creates a concise summary while preserving key information.
    Configured to generate summaries under 50 words.

    Args:
        request: Summarization request with text and parameters.

    Returns:
        Summary and compression metrics.

    Raises:
        HTTPException: If summarization fails.

    Example:
        ```json
        {
            "text": "Long document text...",
            "max_length": 150,
            "temperature": 0.3
        }
        ```
    """
    try:
        start_time = time.time()

        # Construct summarization prompt
        prompt = (
            f"Summarize the following document:\n\n{request.text}\n\nSummary:"
        )
        system_prompt = (
            "You are a professional document summarizer. Create a concise, "
            "clear summary in 50 words that captures the purpose of the document "
            "and its main points. DO NOT EXCEED 50 WORDS."
        )

        # Generate summary
        summary = ollama_service.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=request.temperature,
            max_tokens=request.max_length,
        )

        processing_time = time.time() - start_time

        # Calculate compression metrics
        original_length = len(request.text.split())
        summary_length = len(summary.split())
        compression_ratio = (
            summary_length / original_length if original_length > 0 else 0.0
        )

        logger.info(
            "Summarized document in %.2fs (compression: %.2f%%)",
            processing_time,
            compression_ratio * 100,
        )

        return SummarizationResponse(
            summary=summary.strip(),
            original_length=original_length,
            summary_length=summary_length,
            compression_ratio=compression_ratio,
            processing_time=processing_time,
        )

    except Exception as e:
        logger.error("Summarization error: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Summarization failed: {str(e)}"
        ) from e


@app.post("/search", response_model=SearchResponse)
async def search_documents(request: SearchRequest) -> SearchResponse:
    """
    Perform semantic search across stored documents.

    Optionally enhances queries using LLM for improved search results.

    Args:
        request: Search request with query and parameters.

    Returns:
        Ranked search results with similarity scores.

    Raises:
        HTTPException: If search fails.

    Example:
        ```json
        {
            "query": "machine learning algorithms",
            "filters": {"category": "technical"}
        }
        ```
    """
    try:
        start_time = time.time()
        query_to_embed = request.query

        # Query enhancement for better semantic matching
        enable_query_enhancement = True # Disable if insufficient resources

        if enable_query_enhancement:
            query_to_embed = _enhance_search_query(request.query)

        # Generate embedding for the query
        query_embedding = ollama_service.embed_text(query_to_embed)

        # Perform vector search
        results = chroma_service.search_similar(
            query_embedding=query_embedding,
            where=request.filters,
        )

        processing_time = time.time() - start_time

        # Format results for response
        formatted_results = _format_search_results(results)

        logger.info(
            "Search completed in %.2fs (found %d results)",
            processing_time,
            len(formatted_results),
        )

        return SearchResponse(
            results=formatted_results, processing_time=processing_time
        )

    except Exception as e:
        logger.error("Search error: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Search failed: {str(e)}"
        ) from e


@app.post("/documents", response_model=DocumentResponse)
async def add_document(request: DocumentRequest) -> DocumentResponse:
    """
    Add document to vector database.

    Generates embedding and stores document for semantic search.

    Args:
        request: Document request with ID, text, and metadata.

    Returns:
        Document operation status and timing.

    Raises:
        HTTPException: If document addition fails.

    Example:
        ```json
        {
            "document_id": "doc_123",
            "text": "Document content...",
            "metadata": {"author": "John Doe", "date": "2024-01-01"}
        }
        ```
    """
    try:
        start_time = time.time()

        # Generate embedding for document
        embedding = ollama_service.embed_text(request.text)

        # Store in ChromaDB
        document_id = chroma_service.add_document(
            document_id=request.document_id,
            text=request.text,
            embedding=embedding,
            metadata=request.metadata or {},
        )

        processing_time = time.time() - start_time

        logger.info(
            "Added document '%s' in %.2fs", document_id, processing_time
        )

        return DocumentResponse(
            document_id=document_id,
            status="success",
            processing_time=processing_time,
        )

    except Exception as e:
        logger.error("Document addition error: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to add document: {str(e)}"
        ) from e


@app.delete("/documents/{document_id}")
async def delete_document(document_id: str) -> Dict[str, str]:
    """
    Delete document from vector database.

    Args:
        document_id: Unique identifier of document to delete.

    Returns:
        Deletion status message.

    Raises:
        HTTPException: If document not found or deletion fails.

    Example:
        ```bash
        curl -X DELETE http://localhost:8000/documents/doc_123
        ```
    """
    try:
        success = chroma_service.delete_document(document_id)

        if success:
            logger.info("Deleted document '%s'", document_id)
            return {
                "status": "success",
                "message": f"Document {document_id} deleted",
            }
        else:
            raise HTTPException(
                status_code=404, detail=f"Document {document_id} not found"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Document deletion error: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to delete document: {str(e)}"
        ) from e


@app.get("/stats")
async def get_stats() -> Dict[str, Any]:
    """
    Get service statistics and health information.

    Returns:
        Service metrics including Ollama availability and ChromaDB stats.

    Example:
        ```bash
        curl http://localhost:8000/stats
        ```
    """
    return {
        "ollama_available": ollama_service.is_available(),
        "ollama_model": settings.ollama_model,
        "chroma_stats": chroma_service.get_collection_stats(),
    }


# ============================================================================
# Helper Functions
# ============================================================================


def _enhance_search_query(original_query: str) -> str:
    """
    Enhance search query using LLM for better semantic matching.

    Args:
        original_query: Original user search query.

    Returns:
        Enhanced query with synonyms and related terms.
    """
    try:
        enhance_prompt = f"""Original search query: "{original_query}"

Expand this query by:
1. Adding relevant synonyms and related terms
2. Including technical terminology if applicable
3. Clarifying ambiguous terms
4. Keeping the core intent

Provide ONLY the enhanced query, no explanations."""

        system_prompt = (
            "You are a search query optimizer. Expand queries to improve "
            "semantic search results while preserving the original intent. "
            "Output only the enhanced query text."
        )

        enhanced_query = ollama_service.generate(
            prompt=enhance_prompt,
            system_prompt=system_prompt,
            temperature=0.3,  # Low temperature for consistency
            max_tokens=100,
        ).strip()

        # Validate enhanced query
        if 0 < len(enhanced_query) < 500:
            logger.info(
                "Enhanced query: '%s' -> '%s'", original_query, enhanced_query
            )
            return enhanced_query
        else:
            logger.warning(
                "Query enhancement produced invalid result, using original"
            )
            return original_query

    except Exception as e:
        logger.warning(
            "Query enhancement failed: %s, using original query", str(e)
        )
        return original_query


def _format_search_results(
    results: Dict[str, List[Any]]
) -> List[Dict[str, Any]]:
    """
    Format ChromaDB search results for API response.

    Args:
        results: Raw search results from ChromaDB.

    Returns:
        Formatted list of search results with documents, metadata, and scores.
    """
    formatted_results = []

    for i in range(len(results.get("documents", []))):
        formatted_results.append(
            {
                "document": results["documents"][i],
                "metadata": (
                    results["metadatas"][i]
                    if i < len(results.get("metadatas", []))
                    else {}
                ),
                "distance": (
                    results["distances"][i]
                    if i < len(results.get("distances", []))
                    else 0.0
                ),
            }
        )

    return formatted_results


# ============================================================================
# Application Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level="info",
    )