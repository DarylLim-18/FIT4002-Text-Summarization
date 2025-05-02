const axios = require('axios');

const MISTRAL_API_URL = process.env.MISTRAL_API_URL || 'http://localhost:8000';

/**
 * Service for interacting with Mistral 7B API
 */
class MistralService {
  /**
   * Generate text using Mistral 7B
   * @param {string} prompt - The input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - The generated text
   */
  async generateText(prompt, options = {}) {
    try {
      const response = await axios.post(`${MISTRAL_API_URL}/generate`, {
        prompt,
        max_length: options.maxLength || 512,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        system_prompt: options.systemPrompt
      });
      
      return response.data;
    } catch (error) {
      console.error('Error generating text with Mistral:', error.message);
      throw new Error(`Failed to generate text: ${error.message}`);
    }
  }
  
  /**
   * Get embeddings for text
   * @param {string} text - Input text to embed
   * @returns {Promise<Object>} - Text embedding
   */
  async getEmbedding(text) {
    try {
      const response = await axios.post(`${MISTRAL_API_URL}/embed`, {
        text
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting embedding from Mistral:', error.message);
      throw new Error(`Failed to get embedding: ${error.message}`);
    }
  }
  
  /**
   * Check if the Mistral service is available
   * @returns {Promise<boolean>} - Whether the service is available
   */
  async isAvailable() {
    try {
      const response = await axios.get(MISTRAL_API_URL);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new MistralService();