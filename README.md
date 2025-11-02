# FIT4002-Text-Summarization

An AI-powered document processing and search system built with Next.js, Node.js, and Python. Features semantic search, document processing, and AI-enhanced search capabilities powered by Mistral 7B.

## Team
- **Hanideepu Kodi    (33560625)**: Product Manager
- **Daryl Lim         (33560757)**: Backend Engineer
- **Chong Jet Shen    (33517495)**: Frontend Engineer
- **Nicholas Yew      (33642478)**: Q&A Test Engineer
- **Ammar Sirraj      (33187762)**: Machine Learning Engineer 


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

## Continuous Integration

This repository ships with a GitHub Actions workflow at `.github/workflows/ci.yml`. It runs automatically for pushes to `main`/`master` and for pull requests, and executes three parallel jobs:

- **Backend**: installs the Node dependencies declared in the root `package-lock.json` and performs a syntax check of `backend/API.js`.
- **Frontend**: installs the Next.js app dependencies, runs `npm run lint`, and builds the production bundle via `npm run build`.
- **ML Service**: sets up Python 3.11, installs `ml-service/requirements.txt`, and verifies the modules compile with `python -m compileall`.

Keep your changes green in CI before merging to ensure a consistent local setup for the whole team.

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

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/files/upload` | Upload a document, persist metadata, and queue ML summarization/vectorization. |
| GET | `/files` | List stored file metadata ordered by most recent upload. |
| GET | `/files/:id` | Retrieve metadata and content for a specific file. |
| DELETE | `/files/:id` | Remove a file, its metadata, and associated ML embeddings. |
| GET | `/files/search` | Perform keyword search across metadata and stored content. |
| POST | `/files/context-search` | Run semantic search against the ML service and enrich results with metadata. |

#### POST `/files/upload`

- **Purpose**: Ingest a document and kick off background ML processing (summary generation and vector embedding).
- **Request**: `multipart/form-data` with a single `file` field (supports TXT, PDF, DOCX) up to 10 MB.
- **Success Response (200)**: Returns the inserted database row (including `id`, `file_name`, `file_path`, `file_size`, `file_type`, `file_summary`, `file_content`, `upload_date`). `file_summary` may be `null` until the asynchronous summarization completes.
- **Error Responses**:
  - `400`: File too large, unsupported type, or text extraction failure (uploaded file is deleted).
  - `500`: Unexpected upload/storage error.
- **Side Effects**: On success, queues asynchronous summary generation via `/summarize` and embedding storage via `/documents` in the ML service.

#### GET `/files`

- **Purpose**: Fetch the catalog of uploaded files with their stored metadata.
- **Response (200)**: JSON array of file records ordered by `upload_date` descending.
- **Error Response (500)**: Database query failure.

#### GET `/files/:id`

- **Purpose**: Retrieve a single file’s metadata plus content for rendering.
- **Response (200)**: JSON object with metadata fields, a public `file_url`, plain-text `content` for TXT files, and `contentHTML` (converted via Mammoth) for DOCX files. PDF content is expected to be accessed via the `file_url`.
- **Error Responses**:
  - `404`: File not found.
  - `500`: Failed to read from disk or database.

#### DELETE `/files/:id`

- **Purpose**: Permanently delete a file everywhere (disk, database, ML embeddings).
- **Success Response (204)**: Empty body once deletion tasks are queued/completed.
- **Error Responses**:
  - `404`: File not found.
  - `500`: Failed to delete the file or database entry (the server attempts best-effort cleanup).

#### GET `/files/search`

- **Purpose**: Keyword search across stored metadata and truncated file content.
- **Query Parameters**:
  - `q` (optional, default `''`): Search term matched against `file_name`, `file_summary`, and `file_content`.
  - `type` (optional, default `all`): Filter by MIME category (`pdf`, `docx`, `txt`).
- **Response (200)**: JSON array of matching records ordered by `upload_date`.
- **Error Response (500)**: Search query execution failed.

#### POST `/files/context-search`

- **Purpose**: Semantic search leveraging the ML service’s vector store.
- **Request Body**:
  - `query` (string, required): Natural-language prompt to search for.
  - `file_type_filter` (optional): MIME filter matching stored metadata (`application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`, or `all`).
- **Success Response (200)**: JSON object with the original `query`, `results` array, and `total_found`. Each result includes metadata fields, `file_url`, `similarity_score` (1 − distance), and a `matched_text` snippet.
- **Error Responses**:
  - `400`: Missing or empty `query`.
  - `503`: ML service unavailable (suggests falling back to keyword search).
  - `500`: ML search failure or downstream database error.

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
