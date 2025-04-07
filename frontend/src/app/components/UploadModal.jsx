'use client';
import { useState } from 'react';
import styles from './UploadModal.module.css';

export default function UploadModal({ onUploadSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setSelectedFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        onUploadSuccess?.(); // Notify parent component
        setIsOpen(false);
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={styles.uploadButton}
      >
        Upload File
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div 
          className={styles.modalOverlay} 
          onClick={() => !isUploading && setIsOpen(false)}
        >
          <div 
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <button 
              className={styles.closeButton}
              onClick={() => !isUploading && setIsOpen(false)}
              disabled={isUploading}
            >
              ×
            </button>

            <h2>Upload Document</h2>
            
            {/* Drag & Drop Zone */}
            <div className={styles.dropZone}>
              {selectedFile ? (
                <p>Selected: {selectedFile.name}</p>
              ) : (
                <>
                  <p>Drag & drop files here</p>
                  <p className={styles.orText}>or</p>
                  <label className={styles.fileInputLabel}>
                    Browse Files
                    <input 
                      type="file" 
                      className={styles.fileInput}
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                  </label>
                </>
              )}
            </div>

            <button 
              className={styles.submitButton}
              onClick={handleSubmit}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}