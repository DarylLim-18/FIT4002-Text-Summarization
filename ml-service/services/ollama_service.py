"""
Ollama Service Module.

This module provides a service layer for interacting with Ollama LLM services,
supporting text generation, embedding generation, and service health checks.

Key Features:
- Text generation with configurable parameters
- Text embedding generation using embedding models
- Service availability monitoring
- Error handling and fallback mechanisms
"""


import hashlib
import logging
from typing import List, Optional

import requests
from requests.exceptions import RequestException, Timeout

logger = logging.getLogger(__name__)


class OllamaServiceError(Exception):
    """Base exception for Ollama service errors."""
    pass


class OllamaConnectionError(OllamaServiceError):
    """Exception raised when connection to Ollama service fails."""
    pass


class OllamaGenerationError(OllamaServiceError):
    """Exception raised when text generation fails."""
    pass


class OllamaEmbeddingError(OllamaServiceError):
    """Exception raised when embedding generation fails."""
    pass


class OllamaService:
    """
    Service for interacting with Ollama LLM API.
    
    This class provides a high-level interface for text generation, embedding
    creation, and health monitoring of the Ollama service.
    
    Attributes:
        host: URL endpoint for the Ollama service
        model: Name of the LLM model to use for generation
        embedding_model: Name of the embedding model
        timeout_generate: Timeout for generation requests (seconds)
        timeout_embed: Timeout for embedding requests (seconds)
    """

    # Constants
    DEFAULT_EMBEDDING_MODEL = "nomic-embed-text"
    DEFAULT_EMBEDDING_DIMENSION = 384
    DEFAULT_TEMPERATURE = 0.7
    DEFAULT_MAX_TOKENS = 512
    TIMEOUT_GENERATE = 120
    TIMEOUT_EMBED = 60
    TIMEOUT_HEALTH = 10

    def __init__(
        self, 
        host: str = "http://localhost:11434", 
        model: str = "mistral",
        embedding_model: str = DEFAULT_EMBEDDING_MODEL
    ) -> None:
        """
        Initialize Ollama service client.
        
        Args:
            host: Ollama service endpoint URL
            model: LLM model name (e.g., 'mistral', 'llama3.2:1b')
            embedding_model: Embedding model name (default: 'nomic-embed-text')
            
        Raises:
            ValueError: If host or model is invalid
        """
        if not host or not isinstance(host, str):
            raise ValueError("host must be a non-empty string")
        
        if not model or not isinstance(model, str):
            raise ValueError("model must be a non-empty string")
        
        self.host = host.rstrip('/')
        self.model = model
        self.embedding_model = embedding_model
        self.timeout_generate = self.TIMEOUT_GENERATE
        self.timeout_embed = self.TIMEOUT_EMBED

        logger.info(
            "Ollama service initialized (host: %s, model: %s, embedding: %s)",
            self.host,
            self.model,
            self.embedding_model
        )
        
    def generate(
        self, 
        prompt: str, 
        system_prompt: Optional[str] = None,
        temperature: float = DEFAULT_TEMPERATURE,
        max_tokens: int = DEFAULT_MAX_TOKENS
    ) -> str:
        """
        Generate text using Ollama LLM.
        
        Args:
            prompt: The input prompt for text generation
            system_prompt: Optional system prompt to guide generation behavior
            temperature: Sampling temperature (0.0-2.0). Higher = more random
            max_tokens: Maximum number of tokens to generate
            
        Returns:
            Generated text string
            
        Raises:
            OllamaGenerationError: If generation fails
            ValueError: If inputs are invalid
            
        Example:
            >>> service = OllamaService()
            >>> text = service.generate(
            ...     prompt="Explain machine learning",
            ...     temperature=0.7,
            ...     max_tokens=200
            ... )
        """
        # Validate inputs
        if not prompt or not isinstance(prompt, str):
            raise ValueError("prompt must be a non-empty string")
        
        if not 0.0 <= temperature <= 2.0:
            raise ValueError("temperature must be between 0.0 and 2.0")
        
        if not 1 <= max_tokens <= 4096:
            raise ValueError("max_tokens must be between 1 and 4096")
        
        url = f"{self.host}/api/generate"
        
        # Format prompt with system message if provided
        full_prompt = self._format_prompt(prompt, system_prompt)
        
        payload = {
            "model": self.model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            }
        }
        
        try:
            logger.debug(
                "Generating text (model: %s, temperature: %.2f, max_tokens: %d)",
                self.model,
                temperature,
                max_tokens
            )
            
            response = requests.post(
                url, 
                json=payload, 
                timeout=self.timeout_generate
            )
            response.raise_for_status()
            
            result = response.json()
            generated_text = result.get("response", "").strip()
            
            if not generated_text:
                raise OllamaGenerationError("Empty response from Ollama service")
            
            logger.debug("Generated %d characters", len(generated_text))
            return generated_text
            
        except Timeout as e:
            logger.error("Generation timeout after %ds", self.timeout_generate)
            raise OllamaGenerationError(
                f"Generation timeout after {self.timeout_generate}s"
            ) from e
        except RequestException as e:
            logger.error("Generation request failed: %s", str(e), exc_info=True)
            raise OllamaGenerationError(f"Failed to generate text: {str(e)}") from e
        except Exception as e:
            logger.error("Unexpected error during generation: %s", str(e), exc_info=True)
            raise OllamaGenerationError(f"Unexpected error: {str(e)}") from e
    
    def embed_text(self, text: str) -> List[float]:
        """
        Generate text embedding vector using Ollama embedding model.
        
        Falls back to simple hash-based embedding if the embedding model
        is not available.
        
        Args:
            text: Text to generate embedding for
            
        Returns:
            Embedding vector as list of floats
            
        Raises:
            ValueError: If text is invalid
            
        Example:
            >>> service = OllamaService()
            >>> embedding = service.embed_text("Sample text")
            >>> print(len(embedding))  # 384
        """
        if not text or not isinstance(text, str):
            raise ValueError("text must be a non-empty string")
        
        url = f"{self.host}/api/embeddings"
        
        payload = {
            "model": self.embedding_model,
            "prompt": text
        }
        
        try:
            logger.debug("Generating embedding for text (length: %d)", len(text))
            
            response = requests.post(
                url, 
                json=payload, 
                timeout=self.timeout_embed
            )
            response.raise_for_status()
            
            result = response.json()
            embedding = result.get("embedding", [])
            
            if not embedding:
                logger.warning(
                    "Empty embedding from Ollama, using fallback method"
                )
                return self._simple_embedding(text)
            
            logger.debug("Generated embedding (dimension: %d)", len(embedding))
            return embedding
            
        except (RequestException, Timeout) as e:
            logger.warning(
                "Ollama embedding failed: %s, using fallback method", 
                str(e)
            )
            return self._simple_embedding(text)
        except Exception as e:
            logger.error(
                "Unexpected error during embedding: %s, using fallback", 
                str(e), 
                exc_info=True
            )
            return self._simple_embedding(text)
    
    def is_available(self) -> bool:
        """
        Check if Ollama service is available and responsive.
        
        Returns:
            True if service is available, False otherwise
            
        Example:
            >>> service = OllamaService()
            >>> if service.is_available():
            ...     print("Ollama is ready")
        """
        try:
            response = requests.get(
                f"{self.host}/api/tags", 
                timeout=self.TIMEOUT_HEALTH
            )
            is_up = response.status_code == 200
            
            if is_up:
                logger.debug("Ollama service is available")
            else:
                logger.warning("Ollama service returned status %d", response.status_code)
            
            return is_up
            
        except Exception as e:
            logger.debug("Ollama service not available: %s", str(e))
            return False
    
    def get_available_models(self) -> List[str]:
        """
        Get list of available models from Ollama service.
        
        Returns:
            List of model names
            
        Raises:
            OllamaConnectionError: If request fails
        """
        try:
            response = requests.get(
                f"{self.host}/api/tags",
                timeout=self.TIMEOUT_HEALTH
            )
            response.raise_for_status()
            
            data = response.json()
            models = [model.get("name", "") for model in data.get("models", [])]
            
            logger.info("Found %d available models", len(models))
            return models
            
        except Exception as e:
            logger.error("Failed to get available models: %s", str(e))
            raise OllamaConnectionError(
                f"Failed to get available models: {str(e)}"
            ) from e
        
    def _format_prompt(
        self, 
        prompt: str, 
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Format prompt with optional system message.
        
        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            
        Returns:
            Formatted prompt string
        """
        if system_prompt:
            return (
                f"System: {system_prompt}\n\n"
                f"User: {prompt}\n\n"
                f"Assistant:"
            )
        return prompt
    
    def _simple_embedding(self, text: str) -> List[float]:
        """
        Generate simple hash-based embedding as fallback.
        
        Warning: This is a basic fallback mechanism and should not be used
        in production. Use a proper embedding model instead.
        
        Args:
            text: Text to embed
            
        Returns:
            384-dimensional embedding vector
        """
        logger.warning("Using simple hash-based embedding (not suitable for production)")
        
        # Generate MD5 hash of text
        hash_obj = hashlib.md5(text.encode())
        hash_hex = hash_obj.hexdigest()
        
        # Convert hex to normalized float values
        embedding = []
        for i in range(0, len(hash_hex), 2):
            embedding.append(float(int(hash_hex[i:i+2], 16)) / 255.0)
        
        # Pad or truncate to standard dimension
        while len(embedding) < self.DEFAULT_EMBEDDING_DIMENSION:
            embedding.append(0.0)
        
        return embedding[:self.DEFAULT_EMBEDDING_DIMENSION]
    
    def __repr__(self) -> str:
        """String representation of the service."""
        return (
            f"OllamaService(host='{self.host}', model='{self.model}', "
            f"embedding_model='{self.embedding_model}')"
        )