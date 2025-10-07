const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const cors = require('cors');
<<<<<<< HEAD
const fs = require('fs').promises;
=======
const axios = require('axios');
require('dotenv').config();

// Debug environment variables
console.log('Environment variables loaded:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASS:', process.env.DB_PASS ? '[HIDDEN]' : 'undefined');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('Current working directory:', process.cwd());
>>>>>>> 936e198 (Implement ML Service and update API.js)

const app = express();
const port = 3000;
app.use(cors());

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
// END OF SETUP


// HERE ONWARDS ARE THE API's

<<<<<<< HEAD
// Upload Route
/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload a file
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 */
app.post('/upload', upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).send('No file uploaded.');
=======
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

async function searchSimilarDocuments(query, nResults = 5, filters = null) {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/search`, {
      query,
      n_results: nResults,
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
>>>>>>> 6278a4e (Raw SQL File search Query Implemented)

    const fileName = file.originalname;
    const fileType = path.extname(file.originalname).substring(1); // pdf, docx, etc.
    const fileMime = file.mimetype;
    const fileSize = file.size;
    const relativePath = path.join('uploads', file.filename); // Relative path
    const fileDescription = req.body.description || null;
    const fileSummary = req.body.summary || null;

    const sql = `
        INSERT INTO file (file_name, file_type, file_mime, file_size, file_path, file_description, file_summary_text)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [fileName, fileType, fileMime, fileSize, relativePath, fileDescription, fileSummary];

<<<<<<< HEAD
    db.query(sql, values, (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(`File uploaded successfully with ID: ${result.insertId}`);
    });
});

<<<<<<< HEAD
// Download Route
/**
 * @swagger
 * /download/{id}:
 *   get:
 *     summary: Download a file by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *       404:
 *         description: File not found
 */
app.get('/download/:id', (req, res) => {
    const fileId = req.params.id;
    db.query('SELECT * FROM file WHERE file_id = ?', [fileId], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(404).send('File not found');
=======
// ——— API 5: Traditional Search ——————————————————————————————————
=======
    // 2) Summarize with ML Service
    let summary = '';
    if (text.trim()) {
      summary = await getSummary(text);
      console.log('✅ Generated summary with ML Service');
    } else {
      summary = 'Empty document or text extraction failed.';
    }

    // 3) Store metadata + content in DB
    const [result] = await pool.execute(
      `INSERT INTO files 
        (file_name, file_path, file_size, file_type, file_summary, file_content)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [originalname, filename, size, mimetype, summary, text]
    );

    const newId = result.insertId;
    const [rows] = await pool.execute('SELECT * FROM files WHERE id = ?', [newId]);
    
    // 4) Add to ML Service vector database in background
    if (text.trim()) {
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

    // 2) Delete from ML Service vector database first
    try {
      await axios.delete(`${ML_SERVICE_URL}/documents/file_${id}`, { timeout: 10000 });
      console.log(`✅ Deleted file ${id} from ML Service vector database`);
    } catch (mlError) {
      console.warn(`⚠️ Failed to delete file ${id} from ML Service:`, mlError.message);
    }

    // 3) Delete DB row before file deletion
    await pool.execute('DELETE FROM files WHERE id = ?', [id]);

    // 4) Delete the file from disk safely
    try {
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        console.log(`✅ Deleted file from disk: ${file_path}`);
      }
    } catch (fileError) {
      console.warn('Failed to delete file from disk:', fileError.message);
      // Don't fail the request if file deletion fails
    }

    res.status(204).end();
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ——— API 5: Traditional Search (GET) ——————————————————————————————————
>>>>>>> 936e198 (Implement ML Service and update API.js)
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
    const { query, n_results = 5, file_type_filter = null } = req.body;
    
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
      const mlResults = await searchSimilarDocuments(query, n_results * 2);
      
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
          file_url: `http://localhost:4000/uploads/${fileData.file_path}`,
          similarity_score: mlResult ? (1 - mlResult.distance) : 0,
          matched_text: mlResult ? mlResult.document.substring(0, 150) + '...' : ''
        };
      })
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, n_results);

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
>>>>>>> 6278a4e (Raw SQL File search Query Implemented)

        const file = results[0];
        res.setHeader('Content-Type', file.file_mime);
        res.setHeader('Content-Disposition', `attachment; filename=${file.file_name}`);
        res.send(file.file_data);
    });
});

// Delete by ID
/**
 * @swagger
 * /delete/{id}:
 *   delete:
 *     summary: Delete a file by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       404:
 *         description: File not found
 */
app.delete('/delete/:id', (req, res) => {
    const fileId = req.params.id;

    // Step 1: Get the file path from DB
    const getQuery = 'SELECT file_name FROM file WHERE file_id = ?';
    db.query(getQuery, [fileId], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(404).send({ message: 'File not found' });

        const filePath = path.join('uploads', getQuery);
        // Step 2: Delete the file from disk
        fs.unlink(filePath, (fsErr) => {
            if (fsErr && fsErr.code !== 'ENOENT') return res.status(500).send(fsErr);

            // Step 3: Delete from DB
            const deleteQuery = 'DELETE FROM file WHERE file_id = ?';
            db.query(deleteQuery, [fileId], (dbErr) => {
                if (dbErr) return res.status(500).send(dbErr);
                res.status(200).send({ message: 'File deleted successfully' });
            });
        });
    });
});


//list API
/**
 * @swagger
 * /files:
 *   get:
 *     summary: Get metadata for all uploaded files
 *     responses:
 *       200:
 *         description: A list of file metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   file_id:
 *                     type: integer
 *                   file_name:
 *                     type: string
 *                   file_type:
 *                     type: string
 *                   file_mime:
 *                     type: string
 *                   file_upload_date:
 *                     type: string
 *                   file_size:
 *                     type: integer
 */
app.get('/files', (req, res) => {
    const query = `
        SELECT 
            file_id, file_name, file_type, file_mime, file_upload_date, file_size
        FROM 
            file
        ORDER BY 
            file_upload_date DESC
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});


app.get('/', (req, res) => {
    res.send('Welcome to the Document Upload/Download API! Please type "/docs" at the end of the URL to go the testing interface');
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});