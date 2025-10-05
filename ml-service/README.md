# ML Service

This is the machine learning microservice for the Document Manager application. It provides text generation, embedding, and semantic search capabilities using Ollama and ChromaDB.

## 🛠 Technologies

- **Framework**: FastAPI with Python 3.8+
- **LLM**: Ollama (mistral model)
- **Vector Database**: ChromaDB for embeddings and semantic search
- **Dependencies**: See [`requirements.txt`](requirements.txt)

## 🚀 Setup Instructions

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
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=mistral

# ChromaDB Configuration
CHROMA_PERSIST_DIRECTORY=./chroma_db
CHROMA_COLLECTION_NAME=documents

# Server Configuration
HOST=0.0.0.0
PORT=8888
```

### 3. Setup Ollama

Install and start Ollama service:

```bash
# Start Ollama service
ollama serve

# In another terminal, pull the required model
ollama pull mistral
```

### 4. Start the ML Service

```bash
# From the ml-service directory
python -m app.main
```

The service will be available at `http://localhost:8888`

## 📡 API Endpoints

### Health Check
- `GET /` - Service health and status

### Text Generation
- `POST /generate` - Generate text using Ollama

### Document Management
- `POST /documents` - Add document to vector database
- `DELETE /documents/{document_id}` - Remove document

### Search
- `POST /search` - Semantic search using embeddings
- `GET /stats` - Get collection statistics

### ChromaDB Direct Access
- `POST /chroma/add` - Add document chunks
- `POST /chroma/search` - Search document chunks
- `DELETE /chroma/delete/{file_id}` - Delete file chunks
- `GET /chroma/stats` - ChromaDB statistics

## 🧪 Testing

Run the test suite to verify setup:

```bash
cd ml-service
python services/test_service.py
```

This will test:
- ✅ Health check
- ✅ Text generation
- ✅ Embedding generation
- ✅ Document addition
- ✅ Semantic search
- ✅ Statistics retrieval

## 🔧 Configuration

### Ollama Models

You can change the model by updating the `.env` file:

```dotenv
OLLAMA_MODEL=mistral        # Default Mistral model
```

### ChromaDB Storage

ChromaDB data is persisted in the `./chroma_db` directory. To reset the database:

```bash
rm -rf chroma_db/
```

### Performance Tuning

For better performance on Mac:

```bash
# Set Ollama to use Metal GPU acceleration
export OLLAMA_GPU=1
```

## 🐛 Troubleshooting

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
   # Pull the required model
   ollama pull mistral
   ```

3. **Port already in use**
   ```bash
   # Change port in .env file
   PORT=8889
   ```

4. **Permission denied for ChromaDB**
   ```bash
   # Ensure write permissions
   chmod -R 755 ./chroma_db
   ```

## 📁 Project Structure

```
ml-service/
├── app/
│   ├── main.py          # FastAPI application
│   └── config.py        # Configuration settings
├── services/
│   ├── ollama_service.py    # Ollama integration
│   ├── chroma_service.py    # ChromaDB integration
│   └── test_service.py      # Test suite
├── requirements.txt     # Python dependencies
├── .env                # Environment variables
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## 🔗 Integration

The ML Service integrates with the main backend API at:
- Backend calls `POST /documents` to add uploaded files
- Backend calls `POST /search` for semantic search
- Backend calls `POST /generate` for AI summaries

Configure the backend to connect by setting:
```dotenv
ML_SERVICE_URL=http://localhost:8888
```

## 📝 Development

### Adding New Models

1. Pull model with Ollama:
   ```bash
   ollama pull model-name
   ```

2. Update [`app/config.py`](app/config.py):
   ```python
   ollama_model: str = "model-name"
   ```

### Custom Embeddings

Modify [`services/ollama_service.py`](services/ollama_service.py) to use different embedding methods or models.

## 🔒 Security Notes

- The service runs on `0.0.0.0` by default for Docker compatibility
- In production, consider using authentication middleware
- ChromaDB data contains document content - secure the `chroma_db/` directory
