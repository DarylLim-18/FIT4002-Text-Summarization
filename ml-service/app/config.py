from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Ollama settings
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "mistral"
    
    # ChromaDB settings
    chroma_persist_directory: str = "./chroma_db"
    chroma_collection_name: str = "documents"
    
    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Rate limiting
    rate_limit: int = 5  # requests per minute per IP
    
    # Cache settings
    enable_cache: bool = True
    cache_size: int = 1000  # number of items
    
    class Config:
        env_prefix = "ML_SERVICE_"

settings = Settings()