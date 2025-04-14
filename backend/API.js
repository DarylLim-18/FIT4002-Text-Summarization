const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;


//NOTE: THIS IS ALL SETUP DO NOT INTERFERE WITH ANY OF THIS OR ELSE IT WONT FUCKING WORK
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

// Multer Storage Setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });
// END OF SETUP


// HERE ONWARDS ARE THE API's

// Upload Endpoint
/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Uploads a document
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
 *         description: Document uploaded successfully
 */
app.post('/upload', upload.single('file'), (req, res) => {
    const { filename, path: filepath, mimetype } = req.file;

    const document = {
        filename: filename,
        path: filepath,
        type: mimetype.split('/')[1] // e.g., 'pdf', 'docx', 'plain'
    };

    const sql = 'INSERT INTO file SET ?';
    db.query(sql, document, (err, result) => {
        if (err) throw err;
        console.log('File metadata inserted with ID:', result.insertId);
        res.send('File uploaded and metadata saved successfully');
    });
});

// Download by ID
/**
 * @swagger
 * /download/{id}:
 *   get:
 *     summary: Downloads a document by ID
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of the document to download
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document downloaded successfully
 *       404:
 *         description: Document not found
 */
app.get('/download/:id', (req, res) => {
    const documentId = req.params.id;
    const sql = 'SELECT * FROM file WHERE id = ?';

    db.query(sql, [documentId], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            const { path: filepath, filename } = result[0];
            res.download(filepath, filename);
        } else {
            res.status(404).send('File not found');
        }
    });
});

// Delete by ID
/**
 * @swagger
 * /delete/{id}:
 *   delete:
 *     summary: Deletes a document by ID
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of the document to delete
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       404:
 *         description: Document not found
 */
app.delete('/delete/:id', (req, res) => {
    const documentId = req.params.id;

    // First, get the file path
    const getPathSql = 'SELECT path FROM file WHERE id = ?';
    db.query(getPathSql, [documentId], (err, result) => {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).send('File not found in DB');
        }

        const filepath = result[0].path;

        // Then delete the record from DB
        const deleteSql = 'DELETE FROM file WHERE id = ?';
        db.query(deleteSql, [documentId], (err, delResult) => {
            if (err) throw err;

            // Try to delete file from filesystem
            fs.unlink(filepath, (fsErr) => {
                if (fsErr) {
                    console.warn('File not found on disk or already deleted.');
                }
                res.send('File deleted successfully');
            });
        });
    });
});

app.get('/', (req, res) => {
    res.send('Welcome to the Document Upload API!');
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
