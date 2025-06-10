const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const cors = require('cors');
const fs = require('fs').promises;
const axios = require('axios');

const app = express();
const port = 3000;
app.use(cors());

// ML Service URL
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

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
app.post('/upload', upload.single('file'), async (req, res) => {
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

    db.query(sql, values, async (err, result) => {
        if (err) return res.status(500).send(err);
        // res.send(`File uploaded successfully with ID: ${result.insertId}`);
        const fileId = result.insertId;
        
        // Process document with ML service for vector database storage
        try {
            const fullFilePath = path.resolve(relativePath);

            //Logging
            console.log(`Attempting to call ML service at: ${ML_SERVICE_URL}`);
            console.log(`File path: ${fullFilePath}`);
            console.log(`File name: ${fileName}`);
            console.log(`File ID: ${fileId}`);
            
            // Call ML service to process document
            const processResponse = await axios.post(`${ML_SERVICE_URL}/process-document`, {
                file_path: fullFilePath,
                file_name: fileName,
                file_id: fileId
            });
            
            console.log(`Document processed and stored in vector DB: ${processResponse.data.message}`);
            
            res.json({ 
                message: `File uploaded successfully with ID: ${fileId}`,
                file_id: fileId,
                vector_db_status: 'success',
                chunks_stored: processResponse.data.chunks_stored
            });
            
        } catch (vectorError) {
            console.error('Vector DB processing error:', vectorError.response?.data || vectorError.message);
            
            // Still return success for file upload, but indicate vector DB issue
            res.json({ 
                message: `File uploaded successfully with ID: ${fileId}`,
                file_id: fileId,
                vector_db_status: 'failed',
                vector_db_error: vectorError.response?.data?.detail || vectorError.message
            });
        }
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

    // First, get the file information from database
    const fileId = req.params.id;
    const getFileQuery = 'SELECT * FROM file WHERE file_id = ?';
    
    try {
        db.query(getFileQuery, [fileId], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (results.length === 0) {
                return res.status(404).json({ error: 'File not found' });
            }
            
            const fileName = results[0].file_name;
            const filePath = results[0].file_path || `uploads/${fileName}`;
            
            try {

                // Delete from vector database
                try {
                    await axios.delete(`${ML_SERVICE_URL}/document/${fileId}`);
                    console.log(`Document ${fileId} deleted from vector DB`);
                } catch (vectorError) {
                    console.error('Vector DB deletion error:', vectorError.response?.data || vectorError.message);
                    // Continue with file deletion even if vector DB fails
                }
                
                // Delete the physical file
                await fs.unlink(filePath);
                
                // Delete the database record
                const deleteQuery = 'DELETE FROM file WHERE file_id = ?';
                db.query(deleteQuery, [fileId], (deleteErr, deleteResults) => {
                    if (deleteErr) {
                        console.error('Database delete error:', deleteErr);
                        return res.status(500).json({ error: 'Failed to delete from database' });
                    }
                    
                    res.json({ 
                        message: 'File deleted successfully',
                        fileName: fileName 
                    });
                });
                
            } catch (fileErr) {
                console.error('File deletion error:', fileErr);
                // Even if file deletion fails, try to remove from database
                const deleteQuery = 'DELETE FROM file WHERE file_id = ?';
                db.query(deleteQuery, [fileId], (deleteErr) => {
                    if (deleteErr) {
                        return res.status(500).json({ error: 'Failed to delete file and database record' });
                    }
                    res.json({ 
                        message: 'Database record deleted (file may not have existed)',
                        fileName: fileName 
                    });
                });
            }
        });
        
    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/search', async (req, res) => {
    try {
        const { query, n_results = 5 } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        
        // Call ML service for semantic search
        const searchResponse = await axios.post(`${ML_SERVICE_URL}/search-documents`, {
            query: query,
            n_results: n_results
        });
        
        res.json(searchResponse.data);
        
    } catch (error) {
        console.error('Search error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Search failed',
            details: error.response?.data?.detail || error.message
        });
    }
});

app.post('/ai-search', async (req, res) => {
    try {
        const response = await axios.post(`${ML_SERVICE_URL}/ai-search`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('AI search error:', error.response?.data || error.message);
        res.status(500).json({ error: 'AI search failed' });
    }
});

app.post('/smart-search', async (req, res) => {
    try {
        const { query, n_results = 5 } = req.body;
        const response = await axios.post(`${ML_SERVICE_URL}/smart-search?query=${encodeURIComponent(query)}&n_results=${n_results}`);
        res.json(response.data);
    } catch (error) {
        console.error('Smart search error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Smart search failed' });
    }
});

app.post('/deep-search', async (req, res) => {
    try {
        const { query, n_results = 5 } = req.body;
        const response = await axios.post(`${ML_SERVICE_URL}/deep-search?query=${encodeURIComponent(query)}&n_results=${n_results}`);
        res.json(response.data);
    } catch (error) {
        console.error('Deep search error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Deep search failed' });
    }
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
