CREATE DATABASE IF NOT EXISTS FIT4002;
USE FIT4002;
DROP TABLE IF EXISTS file;

CREATE TABLE file (
    file_id INT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255),
    file_type ENUM('pdf', 'docx', 'txt') NOT NULL,
    file_mime ENUM('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain') NOT NULL,
    file_upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    file_size INT,
    file_path VARCHAR(255),
    file_description TEXT,
    file_summary_text LONGTEXT
);


