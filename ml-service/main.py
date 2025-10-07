from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.chroma_service import ChromaService
import logging

logger = logging.getLogger(__name__)

# Initialize ChromaDB service
chroma_service = ChromaService()

app = FastAPI()

# Request models
class Chunk(BaseModel):
    text: str
    start_pos: Optional[int] = 0
    end_pos: Optional[int] = 0

class AddRequest(BaseModel):
    file_id: str
    file_name: str
    file_type: str
    chunks: List[Chunk]

class SearchRequest(BaseModel):
    query: str
    n_results: Optional[int] = 5
    file_type_filter: Optional[str] = None

# ——— ChromaDB API Endpoints ——————————————————————————————————————
@app.post("/chroma/add")
async def add_to_chroma(request: dict):
    """Add document chunks to ChromaDB via ML service"""
    try:
        file_id = request.get("file_id")
        file_name = request.get("file_name")
        file_type = request.get("file_type")
        chunks = request.get("chunks", [])
        
        if not all([file_id, file_name, chunks]):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        added_count = 0
        for i, chunk in enumerate(chunks):
            try:
                # Generate embedding for chunk
                embedding_response = await embed_text({"text": chunk["text"]})
                embedding = embedding_response["embedding"]
                
                # Create document ID
                doc_id = f"file_{file_id}_chunk_{i}"
                
                # Prepare metadata
                metadata = {
                    "file_id": int(file_id),
                    "file_name": file_name,
                    "file_type": file_type,
                    "chunk_index": i,
                    "start_pos": chunk.get("start_pos", 0),
                    "end_pos": chunk.get("end_pos", len(chunk["text"])),
                    "upload_date": chunk.get("upload_date", "")
                }
                
                # Add to ChromaDB
                chroma_service.add_document(
                    document_id=doc_id,
                    text=chunk["text"],
                    embedding=embedding,
                    metadata=metadata
                )
                
                added_count += 1
                
            except Exception as chunk_error:
                logger.error(f"Failed to add chunk {i}: {str(chunk_error)}")
                continue
        
        return {
            "success": True,
            "added_count": added_count,
            "total_chunks": len(chunks)
        }
        
    except Exception as e:
        logger.error(f"ChromaDB add error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add to ChromaDB: {str(e)}")

@app.post("/chroma/search")
async def search_chroma(request: dict):
    """Search ChromaDB for similar documents"""
    try:
        query = request.get("query")
        n_results = request.get("n_results", 5)
        file_type_filter = request.get("file_type_filter")
        
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        # Generate embedding for query
        embedding_response = await embed_text({"text": query})
        query_embedding = embedding_response["embedding"]
        
        # Prepare where clause for filtering
        where_clause = None
        if file_type_filter:
            where_clause = {"file_type": file_type_filter}
        
        # Search ChromaDB
        results = chroma_service.search_similar(
            query_embedding=query_embedding,
            n_results=n_results * 2,  # Get more results to deduplicate by file
            where=where_clause
        )
        
        return {
            "success": True,
            "query": query,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"ChromaDB search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.delete("/chroma/delete/{file_id}")
async def delete_from_chroma(file_id: int):
    """Delete all chunks for a file from ChromaDB"""
    try:
        deleted_count = 0
        # Try to delete chunks (we don't know exactly how many exist)
        for i in range(100):  # Assume max 100 chunks per file
            doc_id = f"file_{file_id}_chunk_{i}"
            if chroma_service.delete_document(doc_id):
                deleted_count += 1
            else:
                # If we can't delete this chunk, assume no more chunks exist
                if i > 0:  # Only break if we've deleted at least one
                    break
        
        return {
            "success": True,
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        logger.error(f"ChromaDB delete error: {str(e)}")
        return {"success": False, "error": str(e)}

@app.get("/chroma/stats")
async def get_chroma_stats():
    """Get ChromaDB collection statistics"""
    try:
        stats = chroma_service.get_collection_stats()
        return {"success": True, "stats": stats}
    except Exception as e:
        logger.error(f"ChromaDB stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")