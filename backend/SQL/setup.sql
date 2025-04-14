USE FIT4002;

CREATE TABLE file (
    id INT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    path VARCHAR(255) NOT NULL,
    type ENUM('txt', 'pdf', 'docx') NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
