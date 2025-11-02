"""
Configuration Management Module for ML Service.

This module provides centralized configuration management using Pydantic Settings,
enabling environment-based configuration with validation and type safety.

Environment variables should be defined in ml-service/.env.
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application settings with environment variable support.
    
    All settings can be overridden via environment variables prefixed with 'ML_SERVICE_'.
    For example: ML_SERVICE_OLLAMA_HOST, ML_SERVICE_OLLAMA_MODEL, etc.
    
    Attributes:
        ollama_host: URL endpoint for the Ollama service
        ollama_model: Name of the LLM model to use (e.g., 'mistral', 'llama3.2:1b')
        chroma_persist_directory: Local directory path for ChromaDB persistence
        chroma_collection_name: Name of the ChromaDB collection for document storage
        host: Server host address (use '0.0.0.0' for external access)
        port: Server port number
        rate_limit: Maximum API requests per minute per IP address
        enable_cache: Whether to enable response caching
        cache_size: Maximum number of cached items
    """

    # Ollama Configuration
    ollama_host: str = Field(
        default="http://localhost:11434",
        description="Ollama service endpoint URL"
    )
    ollama_model: str = Field(
        default="mistral",
        description="LLM model name (e.g., 'mistral', 'llama3.2:1b', 'llama3.2:3b')"
    )
    
    # ChromaDB Configuration
    chroma_persist_directory: str = Field(
        default="./chroma_db",
        description="Directory path for ChromaDB data persistence"
    )
    chroma_collection_name: str = Field(
        default="documents",
        description="ChromaDB collection name for document embeddings"
    )
    
    # Server Configuration
    host: str = Field(
        default="0.0.0.0",
        description="Server bind address (0.0.0.0 for all interfaces)"
    )
    port: int = Field(
        default=8000,
        ge=1024,
        le=65535,
        description="Server port number (1024-65535)"
    )
    
    # Performance Configuration
    rate_limit: int = Field(
        default=5,
        ge=1,
        le=1000,
        description="API rate limit (requests per minute per IP)"
    )
    enable_cache: bool = Field(
        default=True,
        description="Enable response caching for improved performance"
    )
    cache_size: int = Field(
        default=1000,
        ge=10,
        le=100000,
        description="Maximum number of cached items"
    )

    # ChromaDB Search Configuration
    num_results: int = Field(
        default=5,
        ge=1,
        le=50,
        description="Number of results to return for similarity searches"
    )

    # Pydantic Settings Configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="ML_SERVICE_",
        case_sensitive=False,
        extra="ignore"  # Ignore extra fields in .env
    )
    
@lru_cache()
def get_settings() -> Settings:
    """
    Get cached application settings instance.
    
    Uses LRU cache to ensure singleton pattern and avoid repeated
    environment variable parsing.
    
    Returns:
        Cached Settings instance
        
    Example:
        >>> from app.config import get_settings
        >>> settings = get_settings()
        >>> print(settings.ollama_model)
    """
    return Settings()

# Global settings instance for backward compatibility
settings = get_settings()