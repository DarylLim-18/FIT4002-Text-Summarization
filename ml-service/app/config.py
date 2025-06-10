from pydantic_settings import BaseSettings
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
    
    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Rate limiting
    rate_limit: int = 5  # requests per minute per IP
    
    # Cache settings
    enable_cache: bool = True
    cache_size: int = 1000  # number of items
    
    class Config:
        env_prefix = "MISTRAL_"