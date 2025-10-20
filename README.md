# FIT4002-Text-Summarization

An AI-powered document processing and search system built with Next.js, Node.js, and Python. Features semantic search, document processing, and AI-enhanced search capabilities powered by Mistral 7B.

## Team
- **Hanideepu Kodi(33560625)**: Product Manager
- **Daryl Lim(33560625)**: Backend Developer
- **Ammar Sirraj(33560625)**: Machine Learning Engineer
- **Jet Shen(33560625)**: Frontend Developer
- **Nicholas Yew(33560625)**: Q&A Test Engineer

## System Architecture

- **Frontend**: Next.js React application
- **Backend**: Node.js/Express API server with MySQL database
- **ML Service**: Python FastAPI service integrated with Mistral 7B via Ollama
- **Vector Database**: ChromaDB for semantic search
- **File Storage**: Local file system

## Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **MySQL** (v8.0 or higher)
- **Git**
- **Ollama CLI** (for hosting the Mistral models)

## Project Structure

```
FIT4002-Text-Summarization/
|-- frontend/          # Next.js React application
|-- backend/           # Node.js API server
|-- ml-service/        # Python ML service with Mistral
`-- README.md
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/FIT4002-Text-Summarization.git
cd FIT4002-Text-Summarization
```

### 2. Backend Setup

1. Install MySQL and configure your username and password (examples assume the default `root` user).
2. From the project root, initialize the database schema:
   ```bash
   mysql -u <your-user> -p < backend/setup.sql
   ```
3. Create `backend/.env` with:
   ```env
   PORT=4000

   DB_HOST=localhost
   DB_USER=(your username)
   DB_PASS=(your password)
   DB_NAME=(your db name)

   ML_SERVICE_URL=http://localhost:8000
   CHROMA_PATH=http://localhost:8001
   CHROMA_COLLECTION=documents
   HOST=0.0.0.0
   PUBLIC_BACKEND_URL=http://192.168.0.109:4000
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://192.168.0.109:3000
   ```
4. Install the required Node dependencies from the project root:
   ```bash
   npm install
   npm install pdf-parse mammoth dotenv --save
   ```
5. Start the API from the backend directory:
   ```bash
   cd backend
   npm install   # if npm reports no package.json, you can skip this step
   node API.js
   ```

### 3. Frontend Setup

1. Install Node.js and make sure `node` and `npm` are available in `PATH`.
2. Create `frontend/.env` with:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://192.168.0.109:4000
   ```
3. Install dependencies and start the development server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   The Next.js dev server runs on `http://localhost:3000` by default (use `-p 3001` if 3000 is occupied).

### 4. ML-Service Setup

1. Ensure Python and pip are installed and available in `PATH` (during Python installation, select "Install pip" and "Add python.exe to PATH").
2. Create `ml-service/.env` with:
   ```env
   # Ollama Configuration
   ML_SERVICE_OLLAMA_HOST=http://localhost:11434
   ML_SERVICE_OLLAMA_MODEL=mistral

   # ChromaDB Configuration
   ML_SERVICE_CHROMA_PERSIST_DIRECTORY=./chroma_db
   ML_SERVICE_CHROMA_COLLECTION_NAME=documents

   # Server Configuration
   ML_SERVICE_HOST=0.0.0.0
   ML_SERVICE_PORT=8000

   # Performance Settings
   ML_SERVICE_RATE_LIMIT=5
   ML_SERVICE_ENABLE_CACHE=true
   ML_SERVICE_CACHE_SIZE=1000
   ```
3. Install dependencies, provision the Ollama models, and start the ML service:
   ```bash
   cd ml-service
   pip install -r requirements.txt
   winget install Ollama.Ollama
   ollama pull mistral
   ollama pull nomic-embed-text
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

## Running the Application

To run the full stack, start each service in its own terminal after completing the setup steps:

1. **MySQL** - ensure the MySQL server is running.
2. **Backend API** - from `backend/`, run `node API.js` (listens on `http://localhost:4000`).
3. **ML Service** - from `ml-service/`, run `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
4. **Frontend** - from `frontend/`, run `npm run dev` (Next.js dev server on `http://localhost:3000` by default).

## Usage

### 1. Upload Documents

- Navigate to `http://localhost:3000`
- Use the upload interface to submit PDF, DOCX, or TXT files
- Files are processed automatically and stored in the vector database

### 2. Search Documents

#### Basic Search
```bash
curl -X POST "http://localhost:4000/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "your search query", "n_results": 3}'
```

#### AI-Enhanced Search
```bash
# Smart search with AI enhancement
curl -X POST "http://localhost:4000/smart-search" \
  -H "Content-Type: application/json" \
  -d '{"query": "your search query", "n_results": 3}'

# Deep search with full AI features
curl -X POST "http://localhost:4000/deep-search" \
  -H "Content-Type: application/json" \
  -d '{"query": "your search query", "n_results": 3}'
```

## API Endpoints

### Backend API (Port 4000)

- `POST /upload` - Upload documents
- `GET /files` - List all files
- `GET /download/:id` - Download file by ID
- `DELETE /delete/:id` - Delete file by ID
- `POST /search` - Basic semantic search
- `POST /ai-search` - Customizable AI search
- `POST /smart-search` - Quick AI-enhanced search
- `POST /deep-search` - Comprehensive AI search

### ML Service API (Port 8000)

- `GET /` - Health check
- `POST /process-document` - Process uploaded document
- `POST /search-documents` - Vector similarity search
- `GET /vector-db-status` - Check vector database status

## Testing the Setup

1. **Test Backend**
   ```bash
   curl http://localhost:4000/files
   ```
2. **Test ML Service**
   ```bash
   curl http://localhost:8000/
   ```
3. **Test Vector Database**
   ```bash
   curl http://localhost:8000/vector-db-status
   ```
4. **Test Search Flow**
   ```bash
   curl -X POST "http://localhost:4000/search" \
     -H "Content-Type: application/json" \
     -d '{"query": "test", "n_results": 3}'
   ```
