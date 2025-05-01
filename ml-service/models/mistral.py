import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from typing import List, Dict, Any, Optional

class Mistral7B:
    def __init__(self, model_path: str = "mistralai/Mistral-7B-Instruct-v0.2", 
                 device: str = None, 
                 quantize: bool = True):
        """
        Initialize the Mistral 7B model.
        
        Args:
            model_path: Path or identifier for the model
            device: Device to run the model on ('cuda', 'cpu', etc.)
            quantize: Whether to use 4-bit quantization (reduces VRAM usage)
        """
        self.device = device if device else ('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Loading Mistral 7B on {self.device}...")
        
        # Model loading config
        kwargs = {"device_map": self.device}
        
        if quantize and self.device == 'cuda':
            kwargs.update({
                "load_in_4bit": True,
                "bnb_4bit_quant_type": "nf4",
                "bnb_4bit_compute_dtype": torch.float16,
            })
        
        # Load model and tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_path,
            torch_dtype=torch.float16 if self.device == 'cuda' else torch.float32,
            **kwargs
        )
        
        # Set padding token if not set
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        print("Model loaded successfully!")
    
    def generate(self, 
                prompt: str, 
                max_length: int = 512, 
                temperature: float = 0.7,
                top_p: float = 0.9,
                system_prompt: Optional[str] = None) -> str:
        """
        Generate text based on prompt.
        
        Args:
            prompt: The input prompt
            max_length: Maximum length of generated text
            temperature: Sampling temperature (higher = more creative)
            top_p: Nucleus sampling parameter
            system_prompt: Optional system prompt to control generation behavior
        
        Returns:
            Generated text
        """
        # Format with Mistral's expected chat template
        if system_prompt:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ]
            formatted_prompt = self.tokenizer.apply_chat_template(messages, tokenize=False)
        else:
            messages = [{"role": "user", "content": prompt}]
            formatted_prompt = self.tokenizer.apply_chat_template(messages, tokenize=False)
        
        # Tokenize input
        inputs = self.tokenizer(formatted_prompt, return_tensors="pt").to(self.device)
        
        # Generate
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_length=max_length,
                do_sample=True,
                temperature=temperature,
                top_p=top_p,
                pad_token_id=self.tokenizer.pad_token_id
            )
        
        # Decode and return only the generated part
        full_output = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        # Extract only the model's response, not the prompt
        response = full_output[len(formatted_prompt):].strip()
        return response

    def embed_text(self, text: str) -> List[float]:
        """
        Get embedding representation of text.
        Note: For better embeddings, consider using a dedicated embedding model.
        
        Args:
            text: Input text to embed
            
        Returns:
            Embedding vector
        """
        # Simple implementation - mean of all token representations
        # For production, use a dedicated embedding model like sentence-transformers
        inputs = self.tokenizer(text, return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.model(**inputs, output_hidden_states=True)
        
        # Use the last hidden state
        last_hidden_state = outputs.hidden_states[-1][0]
        # Average the token embeddings
        embedding = torch.mean(last_hidden_state, dim=0).cpu().numpy().tolist()
        return embedding