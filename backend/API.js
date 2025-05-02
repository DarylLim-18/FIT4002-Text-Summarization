const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;


//NOTE: THIS IS ALL SETUP DO NOT INTERFERE WITH ANY OF THIS OR ELSE IT WONT WORK
// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'hanikodi4002!',
    database: 'FIT4002'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL');
});

//swagger setup
const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'File Upload API',
        version: '1.0.0',
        description: 'API for document uploads',
      },
      servers: [{ url: 'http://localhost:3000' }],
    },
    apis: [path.join(__dirname, 'API.js')],
};
  
const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.get('/openapi.json', (req, res) => res.json(swaggerSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// app.use('/api/mistral', mistralRoutes);

// Multer Storage Setup - what this does is it stores files temporarily in '/uploads' can be used as a cache system
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, file.originalname);
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
    db.query('DELETE FROM file WHERE file_id = ?', [fileId], (err, result) => {
        if (err) return res.status(500).send(err);
        if (result.affectedRows === 0) return res.status(404).send('File not found');
        res.send('File deleted successfully');
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
