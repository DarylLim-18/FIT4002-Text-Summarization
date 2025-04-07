'use client';
import { useState, useEffect } from 'react';
import styles from './DocumentList.module.css';

export default function DocumentList() {
  const [documents, setDocuments] = useState([]);

  const fetchDocuments = async () => {
    const res = await fetch('/api/documents');
    setDocuments(await res.json());
  };

  const handleDelete = async (filename) => {
    await fetch('/api/documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    });
    fetchDocuments(); // Refresh list
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div className={styles.container}>
      <h2>Uploaded Documents</h2>
      {documents.length === 0 ? (
        <p>No documents uploaded yet</p>
      ) : (
        <ul className={styles.list}>
          {documents.map((doc) => (
            <li key={doc.name} className={styles.item}>
              <span>{doc.name}</span>
              <button 
                onClick={() => handleDelete(doc.name)}
                className={styles.deleteButton}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}