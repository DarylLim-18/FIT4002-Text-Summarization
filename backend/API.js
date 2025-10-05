const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

// Debug environment variables
console.log('Environment variables loaded:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASS:', process.env.DB_PASS ? '[HIDDEN]' : 'undefined');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('Current working directory:', process.cwd());

const app = express();

// Allow requests from localhost:3000
app.use(cors({
  origin: 'http://localhost:3000',
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
        const data = await pdfParse(fs.readFileSync(filePath));
        text = data.text;
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
    const file_url = `http://localhost:4000/uploads/${file_path}`;

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

// ——— Start Server ——————————————————————————————————————————
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
});