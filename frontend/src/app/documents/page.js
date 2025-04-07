'use client';
import { useState } from 'react';
import UploadModal from '../components/UploadModal';
import DocumentList from '../components/DocumentList';

export default function AllDocuments() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1); // Triggers DocumentList refresh
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{color: 'black'}}>All Documents</h1>
      <UploadModal onUploadSuccess={handleUploadSuccess} />
      <DocumentList key={refreshKey} />
    </div>
  );
}