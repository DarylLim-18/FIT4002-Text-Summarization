"""
ChromaDB Service Module.

This module provides a service layer for interacting with ChromaDB, a vector database
for storing and retrieving document embeddings. It supports document storage, semantic
search, and collection management.

Key Features:
- Document embedding storage with metadata
- Similarity search using cosine distance
- Document lifecycle management (add, delete, query)
- Collection statistics and monitoring
"""


import logging
from typing import Any, List, Dict, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

logger = logging.getLogger(__name__)


class ChromaServiceError(Exception):
    """Base exception for ChromaDB service errors."""
    pass


class DocumentNotFoundError(ChromaServiceError):
    """Exception raised when a document is not found."""
    pass


class ChromaService:
    """
    Service for managing document embeddings in ChromaDB.
    
    This class provides a high-level interface for storing document embeddings,
    performing similarity searches, and managing the vector database collection.
    
    Attributes:
        persist_directory: Directory path for ChromaDB persistence
        collection_name: Name of the ChromaDB collection
        num_results: Number of results to return for similarity searches
        client: ChromaDB client instance
        collection: ChromaDB collection instance
    """
    
    # Constants
    DEFAULT_SIMILARITY_METRIC = "cosine"
    
    def __init__(
        self, 
        persist_directory: str = "./chroma_db", 
        collection_name: str = "documents",
        num_results: int = 5
    ) -> None:
        """
        Initialize ChromaDB service with persistent storage.
        
        Args:
            persist_directory: Directory path for ChromaDB data persistence
            collection_name: Name of the collection to create/use
            num_results: Number of results to return for similarity searches
            
        Raises:
            ChromaServiceError: If initialization fails
        """
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        self.num_results = num_results

        try:
            # Initialize ChromaDB client with persistent storage
            self.client = chromadb.PersistentClient(
                path=persist_directory,
                settings=ChromaSettings(anonymized_telemetry=False)
            )
            
            # Get or create collection with cosine similarity
            self.collection = self.client.get_or_create_collection(
                name=collection_name,
                metadata={"hnsw:space": self.DEFAULT_SIMILARITY_METRIC}
            )
            
            logger.info(
                "ChromaDB service initialized (collection: %s, path: %s)",
                collection_name,
                persist_directory
            )
            
        except Exception as e:
            logger.error("Failed to initialize ChromaDB service: %s", str(e), exc_info=True)
            raise ChromaServiceError(f"ChromaDB initialization failed: {str(e)}") from e
    
        
    def add_document(
        self,
        document_id: str,
        text: str,
        embedding: List[float],
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Add a document with its embedding to the vector database.
        
        Args:
            document_id: Unique identifier for the document
            text: Document text content
            embedding: Pre-computed embedding vector
            metadata: Optional metadata (e.g., {"author": "John", "date": "2024-01-01"})
            
        Returns:
            The document ID that was added
            
        Raises:
            ChromaServiceError: If document addition fails
            ValueError: If inputs are invalid
            
        Example:
            >>> service = ChromaService()
            >>> doc_id = service.add_document(
            ...     document_id="doc_123",
            ...     text="Sample document",
            ...     embedding=[0.1, 0.2, 0.3],
            ...     metadata={"category": "research"}
            ... )
        """
        # Validate inputs
        if not document_id or not isinstance(document_id, str):
            raise ValueError("document_id must be a non-empty string")
        
        if not text or not isinstance(text, str):
            raise ValueError("text must be a non-empty string")
        
        if not embedding or not isinstance(embedding, list):
            raise ValueError("embedding must be a non-empty list of floats")
        
        try:
            self.collection.add(
                documents=[text],
                embeddings=[embedding],
                metadatas=[metadata or {}],
                ids=[document_id]
            )
            
            logger.info("Added document '%s' to ChromaDB (text_length: %d)", document_id, len(text))
            return document_id
            
        except Exception as e:
            logger.error(
                "Failed to add document '%s': %s", 
                document_id, 
                str(e), 
                exc_info=True
            )
            raise ChromaServiceError(f"Failed to add document: {str(e)}") from e
    
    def search_similar(
        self,
        query_embedding: List[float],
        where: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Search for similar documents using embedding similarity.
        
        Performs a k-nearest neighbor search using cosine similarity to find
        the most relevant documents based on the query embedding.
        
        Args:
            query_embedding: Query embedding vector
            where: Optional metadata filter (e.g., {"category": "research"})
            
        Returns:
            Dictionary containing:
                - documents: List of matching document texts
                - metadatas: List of metadata dicts
                - distances: List of similarity distances (lower is more similar)
                - count: Number of results returned
                
        Raises:
            ChromaServiceError: If search fails
            ValueError: If inputs are invalid
            
        Example:
            >>> results = service.search_similar(
            ...     query_embedding=[0.1, 0.2, 0.3],
            ...     n_results=5,
            ...     where={"category": "research"}
            ... )
            >>> print(f"Found {results['count']} documents")
        """
        # Validate inputs
        if not query_embedding or not isinstance(query_embedding, list):
            raise ValueError("query_embedding must be a non-empty list of floats")
        
        try:
            # Request more results to account for duplicate files
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=self.num_results * 10,
                where=where,
                include=["documents", "metadatas", "distances"]
            )

            documents = results.get("documents", [[]])[0]
            metadatas = results.get("metadatas", [[]])[0]
            distances = results.get("distances", [[]])[0]

            # Deduplicate by file_id (from metadata), keeping the best chunk per file
            seen_file_ids = {}
            unique_docs = []
            unique_metas = []
            unique_dists = []

            for doc, meta, dist in zip(documents, metadatas, distances):
                # Get the file_id from metadata
                file_id = meta.get('file_id')
                
                # Skip if no file_id in metadata
                if file_id is None:
                    logger.warning("Document missing file_id in metadata, skipping")
                    continue
                
                # Keep only the chunk with the lowest distance for each file
                if file_id not in seen_file_ids:
                    # First chunk from this file - add it
                    seen_file_ids[file_id] = len(unique_docs)
                    unique_docs.append(doc)
                    unique_metas.append(meta)
                    unique_dists.append(dist)
                elif dist < unique_dists[seen_file_ids[file_id]]:
                    # Better chunk from same file - replace it
                    idx = seen_file_ids[file_id]
                    unique_docs[idx] = doc
                    unique_metas[idx] = meta
                    unique_dists[idx] = dist
                
                # Stop once we have enough unique files
                if len(seen_file_ids) >= self.num_results:
                    break

            formatted_results = {
                "documents": unique_docs[:self.num_results],
                "metadatas": unique_metas[:self.num_results],
                "distances": unique_dists[:self.num_results],
                "count": len(unique_docs[:self.num_results])
            }
            
            logger.info(
                "Search completed: found %d unique files from %d total chunks",
                len(unique_docs),
                len(documents)
            )
            return formatted_results
            
        except Exception as e:
            logger.error("Search failed: %s", str(e), exc_info=True)
            raise ChromaServiceError(f"Failed to search: {str(e)}") from e
    
    def delete_document(self, document_id: str) -> bool:
        """
        Delete a document from the collection.
        
        Args:
            document_id: Unique identifier of the document to delete
            
        Returns:
            True if deletion was successful, False otherwise
            
        Raises:
            ValueError: If document_id is invalid
            
        Example:
            >>> success = service.delete_document("doc_123")
            >>> if success:
            ...     print("Document deleted successfully")
        """
        if not document_id or not isinstance(document_id, str):
            raise ValueError("document_id must be a non-empty string")
        
        try:
            self.collection.delete(ids=[document_id])
            logger.info("Deleted document '%s' from ChromaDB", document_id)
            return True
            
        except Exception as e:
            logger.error(
                "Failed to delete document '%s': %s", 
                document_id, 
                str(e), 
                exc_info=True
            )
            return False
    
    def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a specific document by ID.
        
        Args:
            document_id: Unique identifier of the document
            
        Returns:
            Dictionary with document data or None if not found
            
        Raises:
            ValueError: If document_id is invalid
        """
        if not document_id or not isinstance(document_id, str):
            raise ValueError("document_id must be a non-empty string")
        
        try:
            results = self.collection.get(
                ids=[document_id],
                include=["documents", "metadatas", "embeddings"]
            )
            
            if not results["ids"]:
                return None
            
            return {
                "id": results["ids"][0],
                "document": results["documents"][0],
                "metadata": results["metadatas"][0],
                "embedding": results["embeddings"][0]
            }
            
        except Exception as e:
            logger.error("Failed to get document '%s': %s", document_id, str(e))
            return None
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """
        Get collection statistics and metadata.
        
        Returns:
            Dictionary containing collection information:
                - collection_name: Name of the collection
                - document_count: Total number of documents
                - persist_directory: Storage directory path
                
        Example:
            >>> stats = service.get_collection_stats()
            >>> print(f"Collection has {stats['document_count']} documents")
        """
        try:
            count = self.collection.count()
            
            return {
                "collection_name": self.collection_name,
                "document_count": count,
                "persist_directory": self.persist_directory,
                "similarity_metric": self.DEFAULT_SIMILARITY_METRIC
            }
            
        except Exception as e:
            logger.error("Failed to get collection stats: %s", str(e), exc_info=True)
            return {
                "collection_name": self.collection_name,
                "document_count": 0,
                "persist_directory": self.persist_directory,
                "error": str(e)
            }
    
    def clear_collection(self) -> bool:
        """
        Clear all documents from the collection.
        
        Warning: This operation cannot be undone!
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get all document IDs
            all_ids = self.collection.get()["ids"]
            
            if all_ids:
                self.collection.delete(ids=all_ids)
                logger.warning("Cleared %d documents from collection '%s'", len(all_ids), self.collection_name)
            
            return True
            
        except Exception as e:
            logger.error("Failed to clear collection: %s", str(e), exc_info=True)
            return False
    
    def __repr__(self) -> str:
        """String representation of the service."""
        return (
            f"ChromaService(collection='{self.collection_name}', "
            f"directory='{self.persist_directory}')"
        )