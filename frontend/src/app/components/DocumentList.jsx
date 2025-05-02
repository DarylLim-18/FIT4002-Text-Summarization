'use client';
import { useState, useEffect } from 'react';
import styles from './DocumentList.module.css';
import { 
    FiFilter,
    FiBarChart
  } from 'react-icons/fi';

export default function DocumentList() {
  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);


  // Fetch documents from backend
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/files');
      const data = await res.json();
      setDocuments(data);
      setFilteredDocs(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };


  // Delete document by filename
  const handleDelete = async (file_id) => {
    try {
      const res = await fetch(`http://localhost:3000/files/${file_id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        console.error('Failed to delete:', await res.text());
      } else {
        console.log('File deleted');
        fetchDocuments(); // Refresh list
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };


  // Fetch once on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Search filter logic
  useEffect(() => {
    if (!searchTerm) {
      setFilteredDocs(documents);
    } else {
      const results = documents.filter(doc =>
        doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDocs(results);
    }
  }, [searchTerm, documents]);

  return (
    <div className={styles.container}>
      <input
        type="text"
        placeholder="Search documents..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={styles.searchInput}
      />

      {/* title with sort and filter button */}
      <div className={styles.headerContainer}>
        <h2 className={styles.title}>Uploaded Documents</h2>
        <div className={styles.actions}>
            <button className={styles.sortButton}>
            <FiBarChart className={styles.icon} /> Sort
            </button>
            <button className={styles.filterButton}>
            <FiFilter className={styles.icon} /> Filter
            </button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : documents.length === 0 ? (
        <p>No documents found</p>
      ) : filteredDocs.length === 0 ? (
        <p>No matching documents found</p>
      ) : (
        <ul className={styles.list}>
          {filteredDocs.map((doc) => (
            <li key={doc.file_id} className={styles.item}>
              <span>{doc.file_name}</span>
              <button
                onClick={() => handleDelete(doc.file_id)}
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
