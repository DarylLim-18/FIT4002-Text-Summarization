# FIT4002-Text-Summarization

An AI-powered document processing and search system built with Next.js, Node.js, and Python. Features semantic search, document processing, and AI-enhanced search capabilities using Mistral 7B.

## System Architecture

- **Frontend**: Next.js React application
- **Backend**: Node.js/Express API server with MySQL database
- **ML Service**: Python FastAPI service with Mistral 7B model
- **Vector Database**: ChromaDB for semantic search
- **File Storage**: Local file system

## Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **MySQL** (v8.0 or higher)
- **Git**

## Project Structure

```
FIT4002-Text-Summarization/
├── frontend/          # Next.js React application
├── backend/           # Node.js API server
├── ml-service/        # Python ML service with Mistral
└── README.md
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/FIT4002-Text-Summarization.git
cd FIT4002-Text-Summarization
```

### 2. Database Setup

#### Install and Configure MySQL (Hani pls add here)


### 3. Backend Setup

```bash
# After ensuring mysql is running and setup
cd backend
npm install express mysql2 multer axios cors swagger-jsdoc swagger-ui-express
```

### 4. ML Service Setup

**Mac/Linux:**
```bash
cd ../ml-service

# Create Python virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

**Windows:**
```bash
cd ../ml-service

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### 5. Frontend Setup

```bash
cd ../frontend
npm install
```

## Running the Application

### Start All Services

You need to run **4 services simultaneously**. Open **4 separate terminal windows**:

#### Terminal 1: Start MySQL

**Mac:**
```bash
# Ensure MySQL is running
brew services start mysql

# Check if running
brew services list | grep mysql
```

**Windows:**
```bash
# Start MySQL service
net start MySQL80

# Check if running
sc query MySQL80
```

#### Terminal 2: Start Backend API

**Mac/Linux:**
```bash
cd backend
npm start
# Backend runs on http://localhost:3000
```

**Windows:**
```bash
cd backend
npm start
# Backend runs on http://localhost:3000
```

#### Terminal 3: Start ML Service

**Mac/Linux:**
```bash
cd ml-service
source venv/bin/activate  # Activate virtual environment
python -m app.main
# ML Service runs on http://localhost:8000
```

**Windows:**
```bash
cd ml-service
venv\Scripts\activate  # Activate virtual environment
python -m app.main
# ML Service runs on http://localhost:8000
```

#### Terminal 4: Start Frontend

```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:3001
```

## Usage

### 1. Upload Documents

- Navigate to `http://localhost:3001`
- Use the upload interface to upload PDF, DOCX, or TXT files
- Files are processed automatically and stored in the vector database

### 2. Search Documents

#### Basic Search
```bash
curl -X POST "http://localhost:3000/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "your search query", "n_results": 3}'
```

#### AI-Enhanced Search
```bash
# Smart search with AI enhancement
curl -X POST "http://localhost:3000/smart-search" \
  -H "Content-Type: application/json" \
  -d '{"query": "your search query", "n_results": 3}'

# Deep search with full AI features
curl -X POST "http://localhost:3000/deep-search" \
  -H "Content-Type: application/json" \
  -d '{"query": "your search query", "n_results": 3}'
```

## API Endpoints

### Backend API (Port 3000)

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

### Testing the Setup

#### 1. Test Backend
```bash
curl http://localhost:3000/files
```

#### 2. Test ML Service
```bash
curl http://localhost:8000/
```

#### 3. Test Vector Database
```bash
curl http://localhost:8000/vector-db-status
```

#### 4. Test Search Flow

**Search for content:**
```bash
curl -X POST "http://localhost:3000/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "n_results": 3}'
```

---