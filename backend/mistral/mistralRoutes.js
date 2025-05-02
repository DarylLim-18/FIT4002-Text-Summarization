const express = require('express');
const router = express.Router();
const mistralService = require('../services/mistralService');

// Middleware to check if Mistral service is available
const checkMistralAvailability = async (req, res, next) => {
  const isAvailable = await mistralService.isAvailable();
  if (!isAvailable) {
    return res.status(503).json({ error: 'Mistral service is not available' });
  }
  next();
};

// Apply middleware to all routes
router.use(checkMistralAvailability);

// Generate text
router.post('/generate', async (req, res) => {
  try {
    const { prompt, options } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const result = await mistralService.generateText(prompt, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get embedding
router.post('/embed', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const result = await mistralService.getEmbedding(text);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;