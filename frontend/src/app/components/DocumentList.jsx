'use client';
import { useState, useEffect } from 'react';
import styles from './DocumentList.module.css';

export default function DocumentList() {
  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

//   const fetchDocuments = async () => {
//     const res = await fetch('/api/documents');
//     setDocuments(await res.json());
//   };

  // Fetch documents
  const fetchDocuments = async () => {
    const res = await fetch('/api/documents');
    // const data = await res.json();
    setDocuments(await res.json());
    setFilteredDocs(await res.json()); // Initialize filtered list

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

// Filter documents when search term changes
//   useEffect(() => {
//     if (!searchTerm) {
//       setFilteredDocs(documents); // Reset when search is empty
//     } else {
//       const results = documents.filter(doc => 
//         doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
//       );
//       setFilteredDocs(results);
//     }
//   }, [searchTerm, documents]);


  return (
    <div className={styles.container}>

        {/* Search bar */}
      <input
        type="text"
        placeholder="Search documents..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={styles.searchInput}
      />

      
      <h2>Uploaded Documents</h2>

      {/* Document list */}
      {/* {filteredDocs.length === 0 ? (
        <p>{documents.length === 0 ? 'Loading...' : 'No matching documents found'}</p>
      ) : (
        <ul className={styles.list}>
          {filteredDocs.map((doc) => (
            <li key={doc._id || doc.id} className={styles.item}>
              <span>{doc.filename}</span>
              <button 
                onClick={() => handleDelete(doc._id)}
                className={styles.deleteButton}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )} */}
      {documents.length === 0 ? (
        <p>No documents found</p>
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