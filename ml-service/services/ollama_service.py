import requests
import json
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class OllamaService:
    def __init__(self, host: str = "http://localhost:11434", model: str = "mistral"):
        self.host = host.rstrip('/')
        self.model = model
        
    def generate(self, 
                prompt: str, 
                system_prompt: Optional[str] = None,
                temperature: float = 0.7,
                max_tokens: int = 512) -> str:
        """
        Generate text using Ollama Mistral model.
        
        Args:
            prompt: The input prompt
            system_prompt: Optional system prompt
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text
        """
        url = f"{self.host}/api/generate"
        
        # Format prompt with system message if provided
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"System: {system_prompt}\n\nUser: {prompt}\n\nAssistant:"
        
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
            response = requests.post(url, json=payload, timeout=120)
            response.raise_for_status()
            
            result = response.json()
            return result.get("response", "").strip()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Ollama generation error: {str(e)}")
            raise Exception(f"Failed to generate text: {str(e)}")
    
    def embed_text(self, text: str) -> List[float]:
        """
        Get embeddings using Ollama.
        Note: This requires an embedding model like 'nomic-embed-text'
        """
        url = f"{self.host}/api/embeddings"
        
        payload = {
            "model": "nomic-embed-text",  # You'll need to pull this model
            "prompt": text
        }
        
        try:
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            
            result = response.json()
            return result.get("embedding", [])
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Ollama embedding error: {str(e)}")
            # Fallback to a simple hash-based embedding for demo
            return self._simple_embedding(text)
    
    def _simple_embedding(self, text: str) -> List[float]:
        """Simple fallback embedding method"""
        # This is a very basic fallback - use a proper embedding model in production
        import hashlib
        hash_obj = hashlib.md5(text.encode())
        hash_hex = hash_obj.hexdigest()
        # Convert to float vector (384 dimensions for compatibility)
        embedding = []
        for i in range(0, len(hash_hex), 2):
            embedding.append(float(int(hash_hex[i:i+2], 16)) / 255.0)
        # Pad to 384 dimensions
        while len(embedding) < 384:
            embedding.append(0.0)
        return embedding[:384]
    
    def is_available(self) -> bool:
        """Check if Ollama service is available"""
        try:
            response = requests.get(f"{self.host}/api/tags", timeout=10)
            return response.status_code == 200
        except:
            return False