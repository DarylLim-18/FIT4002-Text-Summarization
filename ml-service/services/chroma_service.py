import chromadb
from chromadb.config import Settings as ChromaSettings
from typing import List, Dict, Any, Optional
import logging
import uuid

logger = logging.getLogger(__name__)

class ChromaService:
    def __init__(self, persist_directory: str = "./chroma_db", collection_name: str = "documents"):
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )
        
    def add_document(self, 
                    document_id: str,
                    text: str, 
                    embedding: List[float],
                    metadata: Dict[str, Any] = None) -> str:
        """
        Add a document to the vector database.
        
        Args:
            document_id: Unique identifier for the document
            text: Document text content
            embedding: Document embedding vector
            metadata: Additional metadata
            
        Returns:
            Document ID
        """
        try:
            self.collection.add(
                documents=[text],
                embeddings=[embedding],
                metadatas=[metadata or {}],
                ids=[document_id]
            )
            logger.info(f"Added document {document_id} to ChromaDB")
            return document_id
            
        except Exception as e:
            logger.error(f"Error adding document to ChromaDB: {str(e)}")
            raise Exception(f"Failed to add document: {str(e)}")
    
    def search_similar(self, 
                      query_embedding: List[float], 
                      n_results: int = 5,
                      where: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Search for similar documents.
        
        Args:
            query_embedding: Query embedding vector
            n_results: Number of results to return
            where: Metadata filter conditions
            
        Returns:
            Search results
        """
        try:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where,
                include=["documents", "metadatas", "distances"]
            )
            
            return {
                "documents": results["documents"][0] if results["documents"] else [],
                "metadatas": results["metadatas"][0] if results["metadatas"] else [],
                "distances": results["distances"][0] if results["distances"] else [],
                "count": len(results["documents"][0]) if results["documents"] else 0
            }
            
        except Exception as e:
            logger.error(f"Error searching ChromaDB: {str(e)}")
            raise Exception(f"Failed to search: {str(e)}")
    
    def delete_document(self, document_id: str) -> bool:
        """Delete a document from the collection"""
        try:
            self.collection.delete(ids=[document_id])
            logger.info(f"Deleted document {document_id} from ChromaDB")
            return True
        except Exception as e:
            logger.error(f"Error deleting document: {str(e)}")
            return False
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get collection statistics"""
        try:
            count = self.collection.count()
            return {
                "collection_name": self.collection_name,
                "document_count": count,
                "persist_directory": self.persist_directory
            }
        except Exception as e:
            logger.error(f"Error getting stats: {str(e)}")
            return {}