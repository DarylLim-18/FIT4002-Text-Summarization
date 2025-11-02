# ML Service

This is the machine learning microservice for the Document Manager application. It provides text generation, embedding, summarization, and semantic search capabilities using Ollama and ChromaDB.

## Technologies

- **Framework**: FastAPI with Python 3.8+
- **LLM**: Ollama (supports multiple models including mistral, llama3.2:1b, llama3.2:3b)
- **Embeddings**: Nomic Embed Text (384-dimensional vectors)
- **Vector Database**: ChromaDB for embeddings and semantic search
- **Configuration**: Pydantic Settings with environment variable support
- **Dependencies**: See [`requirements.txt`](requirements.txt)

## Features

- **Text Generation**: Context-aware text generation with configurable parameters
- **Document Summarization**: Automatic summarization with compression metrics
- **Text Embeddings**: High-quality semantic embeddings for documents
- **Semantic Search**: Vector-based similarity search with query enhancement
- **Document Management**: Add, retrieve, and delete documents with metadata
- **Health Monitoring**: Service health checks and statistics
- **Fallback Mechanisms**: Graceful degradation when services are unavailable

## Setup Instructions

### Prerequisites

1. **Python 3.8+** installed
2. **Ollama** installed and running
3. **pip** package manager

### 1. Install Dependencies

```bash
cd ml-service
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the `ml-service` directory:

```dotenv
# Ollama Configuration
ML_SERVICE_OLLAMA_HOST=http://localhost:11434
ML_SERVICE_OLLAMA_MODEL=mistral

# ChromaDB Configuration
ML_SERVICE_CHROMA_PERSIST_DIRECTORY=./chroma_db
ML_SERVICE_CHROMA_COLLECTION_NAME=documents

# Server Configuration
ML_SERVICE_HOST=0.0.0.0
ML_SERVICE_PORT=8000

# Performance Configuration
ML_SERVICE_RATE_LIMIT=5
ML_SERVICE_ENABLE_CACHE=true
ML_SERVICE_CACHE_SIZE=1000

# ChromaDB Search Configuration
ML_SERVICE_NUM_RESULTS=5
```

**Note**: All environment variables are prefixed with `ML_SERVICE_` and are case-insensitive.

### 3. Setup Ollama

Install and start Ollama service:

```bash
# Start Ollama service
ollama serve

# In another terminal, pull the required models
ollama pull mistral
ollama pull nomic-embed-text
```

### 4. Start the ML Service

```bash
# From the ml-service directory
python -m app.main
```

The service will be available at `http://localhost:8000`

## API Endpoints

### Health & Monitoring

- **`GET /`** - Service health check and status
  - Returns service status, Ollama availability, and ChromaDB stats
  
- **`GET /stats`** - Detailed service statistics
  - Returns model information and collection metrics

### Text Generation

- **`POST /generate`** - Generate text using LLM
  ```json
  {
    "prompt": "Explain quantum computing",
    "system_prompt": "You are a helpful AI assistant",
    "temperature": 0.7,
    "max_tokens": 512
  }
  ```

- **`POST /summarize`** - Summarize text (max 50 words)
  ```json
  {
    "text": "Long document text...",
    "max_length": 150,
    "temperature": 0.3
  }
  ```

### Embeddings

- **`POST /embed`** - Generate text embeddings
  ```json
  {
    "text": "Sample document text"
  }
  ```

### Document Management

- **`POST /documents`** - Add document to vector database
  ```json
  {
    "document_id": "doc_123",
    "text": "Document content",
    "metadata": {"author": "John Doe", "category": "research"}
  }
  ```

- **`DELETE /documents/{document_id}`** - Remove document

### Search

- **`POST /search`** - Semantic search with query enhancement
  ```json
  {
    "query": "machine learning algorithms",
    "filters": {"category": "technical"}
  }
  ```

## Testing

Run the comprehensive test suite to verify setup:

```bash
cd ml-service
python services/test_service.py
```

The test suite validates:
- ✅ Health check endpoint
- ✅ Text generation functionality
- ✅ Embedding generation
- ✅ Document addition and storage
- ✅ Semantic search capabilities
- ✅ Text summarization
- ✅ Statistics retrieval
- ✅ Service availability

Test output includes:
- Response validation
- Processing time metrics
- Automatic cleanup of test documents

## Configuration

### Environment Variables

All configuration can be overridden via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `ML_SERVICE_OLLAMA_HOST` | `http://localhost:11434` | Ollama service URL |
| `ML_SERVICE_OLLAMA_MODEL` | `mistral` | LLM model name |
| `ML_SERVICE_CHROMA_PERSIST_DIRECTORY` | `./chroma_db` | ChromaDB storage path |
| `ML_SERVICE_CHROMA_COLLECTION_NAME` | `documents` | Collection name |
| `ML_SERVICE_HOST` | `0.0.0.0` | Server bind address |
| `ML_SERVICE_PORT` | `8000` | Server port (1024-65535) |
| `ML_SERVICE_RATE_LIMIT` | `5` | Requests per minute per IP |
| `ML_SERVICE_ENABLE_CACHE` | `true` | Enable response caching |
| `ML_SERVICE_CACHE_SIZE` | `1000` | Maximum cached items |

### Ollama Models

The system currently uses Mistral 7B but LLM can be changed in `.env`:

```dotenv
ML_SERVICE_OLLAMA_MODEL=mistral        # Default Mistral model (lower hardware requirements)
ML_SERVICE_OLLAMA_MODEL=llama3.2:1b    # Llama 3.2 1B (more capable)
ML_SERVICE_OLLAMA_MODEL=llama3.2:3b    # Llama 3.2 3B (even more capable)
```

### ChromaDB Storage

ChromaDB data is persisted in the configured directory. To reset:

```bash
rm -rf chroma_db/
```

### Performance Tuning

For better performance on Mac:

```bash
# Enable Metal GPU acceleration
export OLLAMA_GPU=1

# Adjust rate limiting
ML_SERVICE_RATE_LIMIT=10
```

## Troubleshooting

### Common Issues

1. **Ollama not available**
   ```bash
   # Check if Ollama is running
   curl http://localhost:11434/api/tags
   
   # Start Ollama if not running
   ollama serve
   ```

2. **Model not found**
   ```bash
   # Pull the required models
   ollama pull mistral
   ollama pull nomic-embed-text
   ```

3. **Port already in use**
   ```bash
   # Change port in .env file
   ML_SERVICE_PORT=8001
   ```

4. **Permission denied for ChromaDB**
   ```bash
   # Ensure write permissions
   chmod -R 755 ./chroma_db
   ```

5. **Import errors**
   ```bash
   # Reinstall dependencies
   pip install -r requirements.txt --force-reinstall
   ```

6. **Embedding generation fails**
   - The service automatically falls back to hash-based embeddings
   - Check logs for warnings
   - Ensure `nomic-embed-text` model is installed

## Project Structure

```
ml-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application with all endpoints
│   └── config.py            # Pydantic settings and configuration
├── services/
│   ├── __init__.py
│   ├── ollama_service.py    # Ollama LLM integration
│   ├── chroma_service.py    # ChromaDB vector database
│   └── test_service.py      # Integration test suite
├── chroma_db/               # ChromaDB persistent storage
├── requirements.txt         # Python dependencies
├── .env                     # Environment configuration
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

### Key Components

- **`app/main.py`**: FastAPI application with request/response models and endpoints
- **`app/config.py`**: Centralized configuration with validation
- **`services/ollama_service.py`**: LLM integration with fallback mechanisms
- **`services/chroma_service.py`**: Vector database operations
- **`services/test_service.py`**: Comprehensive integration tests

## Integration

The ML Service integrates with the main backend API:

### Backend → ML Service

- **Document Storage**: `POST /documents` to add uploaded files
- **Semantic Search**: `POST /search` for finding relevant documents
- **Summarization**: `POST /summarize` for AI-powered summaries
- **Text Generation**: `POST /generate` for custom AI responses

### Configuration in Backend

```dotenv
ML_SERVICE_URL=http://localhost:8000
```

### Example Integration

```javascript
// Backend API call to ML Service
const response = await fetch('http://localhost:8000/summarize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: documentContent,
    max_length: 150,
    temperature: 0.3
  })
});

const { summary, compression_ratio } = await response.json();
```

## Development

### Adding New Endpoints

1. Add request/response models in [`app/main.py`](app/main.py)
2. Implement endpoint logic with proper error handling
3. Add tests in [`services/test_service.py`](services/test_service.py)

### Adding New Models

1. Pull model with Ollama:
   ```bash
   ollama pull model-name
   ```

2. Update `.env`:
   ```dotenv
   ML_SERVICE_OLLAMA_MODEL=model-name
   ```

### Custom Services

Extend or create new services in the `services/` directory following the established patterns:

- Use custom exceptions for error handling
- Implement comprehensive logging
- Add input validation
- Write unit tests

### Code Quality

The codebase follows these principles:

- **Clean Code**: Well-documented, readable, and maintainable
- **Type Safety**: Full type hints with Pydantic models
- **Error Handling**: Custom exceptions with proper logging
- **Testing**: Comprehensive integration tests
- **Configuration**: Environment-based with validation
- **Best Practices**: PEP 8, docstrings, and design patterns

## Security Notes

- The service runs on `0.0.0.0` by default
- In production:
  - Enable authentication middleware
  - Use HTTPS/TLS encryption
  - Implement rate limiting per user (currently per IP)
  - Secure ChromaDB directory with proper permissions
  - Use secrets management for API keys
  - Enable CORS only for trusted origins
  
- ChromaDB data contains document content - secure the `chroma_db/` directory
- Consider encryption at rest for sensitive documents
- Validate and sanitize all user inputs

## Monitoring & Logging

The service provides structured logging:

```python
# Log levels used
INFO  - Service startup, successful operations
DEBUG - Detailed operation metrics
WARN  - Fallback mechanisms, degraded performance
ERROR - Operation failures with stack traces
```

Access logs via:
```bash
# View service logs
tail -f logs/ml-service.log

# Monitor in real-time
python -m app.main | tee logs/ml-service.log
```

## API Documentation

Interactive API documentation is available when the service is running:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## License

This ML Service is part of the FIT4002 Text Summarization project.