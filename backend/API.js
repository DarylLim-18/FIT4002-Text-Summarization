const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Debug environment variables
console.log('Environment variables loaded:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASS:', process.env.DB_PASS ? '[HIDDEN]' : 'undefined');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('Current working directory:', process.cwd());


const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_BACKEND_URL = (process.env.PUBLIC_BACKEND_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  allowedOrigins.push('http://localhost:3000');
}

const app = express();

// Allow requests from configured origins

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked CORS origin: ${origin}`);
      callback(null, false);
    }
  },
}));
app.use(express.json());

// ——— ML Service Configuration ——————————————————————————————
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8888';

// Helper function to check ML service availability
async function checkMLService() {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.warn('ML Service not available:', error.message);
    return false;
  }
}

// ——— Set up uploads folder & Multer with diskStorage —————————————————
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// Preserve the original file extension on disk
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, uniqueName + ext);
  }
});
const upload = multer({ storage });

// Serve uploads statically (all files forced inline)
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    setHeaders(res) {
      res.setHeader('Content-Disposition', 'inline');
    }
  })
);

// ——— MySQL Connection Pool ——————————————————————————————
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

pool.execute('SELECT 1').then(() => {
  console.log('✅ Database connected successfully');
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
});

// ——— Helper Functions ——————————————————————————————————————
async function getSummary(text) {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/summarize`, {
      text: text.substring(0, 5000), // Limit text length
      max_length: 150,
      temperature: 0.3
    }, { timeout: 30000 });
    
    return response.data.summary;
  } catch (error) {
    console.error('ML Service summarization failed:', error.message);
    // Fallback summary
    const wordCount = text.split(' ').length;
    return `Document uploaded successfully. Contains approximately ${wordCount} words.`;
  }
}

async function getEmbedding(text) {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/embed`, {
      text: text.substring(0, 1000) // Limit text length for embedding
    }, { timeout: 15000 });
    
    return response.data.embedding;
  } catch (error) {
    console.error('ML Service embedding failed:', error.message);
    throw error;
  }
}

async function searchSimilarDocuments(query, filters = null) {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/search`, {
      query,
      filters
    }, { timeout: 15000 });
    
    return response.data.results;
  } catch (error) {
    console.error('ML Service search failed:', error.message);
    throw error;
  }
}

// ——— API 1: Upload & Summarize with ML Service ————————————————————————————————————
app.post('/files/upload', upload.single('file'), async (req, res) => {
  try {
    const { originalname, filename, size, mimetype } = req.file;
    const filePath = path.join(UPLOAD_DIR, filename);

    if (size > 10 * 1024 * 1024) { // 10MB limit
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }

    // 1) Extract text based on type
    let text = '';
    try {
      if (mimetype === 'text/plain') {
        text = fs.readFileSync(filePath, 'utf8');
      } else if (mimetype === 'application/pdf') {
        const parser = new PDFParse({ data: fs.readFileSync(filePath) });
        try {
          const result = await parser.getText();
          text = result.text;
        } finally {
          await parser.destroy().catch(cleanupError => {
            console.warn('PDF parser cleanup failed:', cleanupError.message);
          });
        }
      } else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const { value } = await mammoth.extractRawText({ path: filePath });
        text = value;
      } else {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'Unsupported file type' });
      }
    } catch (extractError) {
      console.error('Text extraction failed:', extractError);
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Failed to extract text from file' });
    }

    // 2) Summarize with ML Service (async) & prepare initial summary placeholder
    const hasText = text.trim().length > 0;
    let summary = hasText ? null : 'Empty document or text extraction failed.';

    // 3) Store metadata + content in DB
    const [result] = await pool.execute(
      `INSERT INTO files 
        (file_name, file_path, file_size, file_type, file_summary, file_content)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [originalname, filename, size, mimetype, summary, text.substring(0, 10000)]
    );

    const newId = result.insertId;
    const [rows] = await pool.execute('SELECT * FROM files WHERE id = ?', [newId]);
    
    if (hasText) {
      setImmediate(() => {
        (async () => {
          const generatedSummary = await getSummary(text);
          await pool.execute('UPDATE files SET file_summary = ? WHERE id = ?', [generatedSummary, newId]);
          console.log(`✅ Generated summary with ML Service (async) for file ${newId}`);
        })().catch(async err => {
          console.error(`❌ Async summary generation failed for file ${newId}:`, err.message);
          try {
            await pool.execute('UPDATE files SET file_summary = ? WHERE id = ?', ['Summary generation failed.', newId]);
          } catch (dbError) {
            console.error(`❌ Failed to persist summary failure message for file ${newId}:`, dbError.message);
          }
        });
      });
    }

    // 4) Add to ML Service vector database in background
    if (hasText) {
      setImmediate(async () => {
        try {
          await axios.post(`${ML_SERVICE_URL}/documents`, {
            document_id: `file_${newId}`,
            text: text.substring(0, 5000),
            metadata: {
              file_id: newId,
              file_name: originalname,
              file_type: mimetype,
              upload_date: new Date().toISOString()
            }
          }, { timeout: 30000 });
          console.log(`✅ Added file ${newId} to ML Service vector database`);
        } catch (mlError) {
          console.error('❌ ML Service document addition failed:', mlError.message);
        }
      });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ——— API 3: List all metadata ————————————————————————————————————
app.get('/files', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM files ORDER BY upload_date DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// ——— API 4: Delete file & metadata & ML Service entries ——————————————————————————————————
app.delete('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1) Find the record
    const [rows] = await pool.execute('SELECT * FROM files WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const { file_path } = rows[0];
    const fullPath = path.join(UPLOAD_DIR, file_path);

    // 2) Delete from ML Service vector database
    try {
      await axios.delete(`${ML_SERVICE_URL}/documents/file_${id}`, { timeout: 10000 });
      console.log(`✅ Deleted file ${id} from ML Service vector database`);
    } catch (mlError) {
      console.warn(`⚠️ Failed to delete file ${id} from ML Service:`, mlError.message);
    }

    // 3) Delete DB row
    await pool.execute('DELETE FROM files WHERE id = ?', [id]);

    // 4) Delete the file from disk
    fs.unlink(fullPath, (err) => {
      if (err) console.warn('Failed to delete file:', err);
    });

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ——— API 5: Traditional Search (GET) ——————————————————————————————————
app.get('/files/search', async (req, res) => {
  try {
    const { q = '', type = 'all' } = req.query;
    const searchTerm = `%${q}%`;

    sql = `
      SELECT id, file_name, file_path, file_size, file_type, file_summary, upload_date
      FROM files
      WHERE (file_name LIKE ? OR file_summary LIKE ? OR file_content LIKE ?)
    `;
    let params = [searchTerm, searchTerm, searchTerm];

    if (type === 'pdf') {
      sql += ` AND file_type = 'application/pdf'`;
    } else if (type === 'docx') {
      sql += ` AND file_type LIKE '%wordprocessingml%'`;
    } else if (type === 'txt') {
      sql += ` AND file_type = 'text/plain'`;
    }

    sql += ` ORDER BY upload_date DESC`;

    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ——— API 6: Context Search using ML Service ——————————————————————————————————
app.post('/files/context-search', async (req, res) => {
  try {
    const { query, file_type_filter = null } = req.body;
    
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Check ML Service availability
    if (!(await checkMLService())) {
      return res.status(503).json({ 
        error: 'ML Service not available - semantic search temporarily disabled',
        fallback_suggestion: 'Please use traditional search instead'
      });
    }

    console.log(`🔍 Context search for query: "${query}"`);
    
    try {
      // Search using ML Service
      const mlResults = await searchSimilarDocuments(query);
      
      if (mlResults.length === 0) {
        return res.json({
          query: query,
          results: [],
          total_found: 0
        });
      }

      // Extract file IDs from ML Service results
      const fileIds = mlResults
        .map(result => {
          const fileId = result.metadata?.file_id;
          return fileId ? parseInt(fileId) : null;
        })
        .filter(id => id !== null);

      if (fileIds.length === 0) {
        return res.json({
          query: query,
          results: [],
          total_found: 0
        });
      }

      // Get full file metadata from MySQL
      const placeholders = fileIds.map(() => '?').join(',');
      let sql = `SELECT id, file_name, file_path, file_size, file_type, file_summary, upload_date 
                 FROM files WHERE id IN (${placeholders})`;
      let params = fileIds;

      // Apply file type filter
      if (file_type_filter && file_type_filter !== 'all') {
        if (file_type_filter === 'application/pdf') {
          sql += ` AND file_type = 'application/pdf'`;
        } else if (file_type_filter === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          sql += ` AND file_type LIKE '%wordprocessingml%'`;
        } else if (file_type_filter === 'text/plain') {
          sql += ` AND file_type = 'text/plain'`;
        }
      }

      const [fileRows] = await pool.execute(sql, params);

      // Combine ML results with database metadata
      const enrichedResults = fileRows.map(fileData => {
        const mlResult = mlResults.find(r => r.metadata?.file_id === fileData.id);
        return {
          ...fileData,
          file_url: `${PUBLIC_BACKEND_URL}/uploads/${fileData.file_path}`,
          similarity_score: mlResult ? (1 - mlResult.distance) : 0,
          matched_text: mlResult ? mlResult.document.substring(0, 150) + '...' : ''
        };
      })
      .sort((a, b) => b.similarity_score - a.similarity_score);

      res.json({
        query: query,
        results: enrichedResults,
        total_found: enrichedResults.length
      });
      
    } catch (searchError) {
      console.error('ML Service search failed:', searchError.message);
      return res.status(500).json({ 
        error: 'Context search failed',
        fallback_suggestion: 'Please try traditional search instead'
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Context search failed' });
  }
}); // <- This closing brace was missing

// ——— API 2: Get metadata by ID ————————————————————————————————————
app.get('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute('SELECT * FROM files WHERE id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Not found' });
    }

    const {
      file_name,
      file_path,
      file_size,
      file_type,
      file_summary,
      upload_date,
    } = rows[0];

    const diskPath = path.join(UPLOAD_DIR, file_path);
    const file_url = `${PUBLIC_BACKEND_URL}/uploads/${file_path}`;

    let content = '';
    let contentHTML = '';

    if (file_type === 'text/plain') {
      content = fs.readFileSync(diskPath, 'utf8');
    } else if (file_type === 'application/pdf') {
      // Client will embed via file_url
    } else if (file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const { value } = await mammoth.convertToHtml({ path: diskPath });
      contentHTML = value;
    }

    res.json({
      id,
      file_name,
      file_size,
      file_type,
      file_summary,
      upload_date,
      file_url,
      content,
      contentHTML,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

// --- Start Server -----------------------------------------------------------------------------

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`Server running on ${PUBLIC_BACKEND_URL}`);
    console.log(`Listening on ${HOST}:${PORT}`);
    console.log(`Upload directory: ${UPLOAD_DIR}`);
  });
}

module.exports = app;
