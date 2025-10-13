DROP TABLE files;

CREATE TABLE files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_name    VARCHAR(255) NOT NULL,
  file_path    VARCHAR(255) NOT NULL,
  file_size    BIGINT       NOT NULL,
  file_type    VARCHAR(100)  NOT NULL,
  file_summary TEXT         NOT NULL, 
  file_content LONGTEXT NOT NULL,
  upload_date  DATETIME     DEFAULT CURRENT_TIMESTAMP
);
