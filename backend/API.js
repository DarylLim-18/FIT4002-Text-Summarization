const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const cors = require('cors');
const fs = require('fs').promises;

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

    db.query(sql, values, (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(`File uploaded successfully with ID: ${result.insertId}`);
    });
});

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