from pydantic_settings import BaseSettings
<<<<<<< HEAD
import os
from typing import Optional

class Settings(BaseSettings):
    # Model settings
    model_path: str = "mistralai/Mistral-7B-Instruct-v0.2"

    # Uncomment for Windows CUDA support
    device: str = "cuda" if os.environ.get("USE_CPU") != "1" else "cpu"
    quantize: bool = True

    # Uncomment for CPU support
    # device: str = "cpu"
    # quantize: bool = False
=======
from typing import Optional

class Settings(BaseSettings):
    # Ollama settings
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "mistral"
    
    # ChromaDB settings
    chroma_persist_directory: str = "./chroma_db"
    chroma_collection_name: str = "documents"
>>>>>>> 936e198 (Implement ML Service and update API.js)
    
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