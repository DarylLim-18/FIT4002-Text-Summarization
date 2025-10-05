'use client'

import { useState } from 'react'
import UploadDropzone from './UploadDropzone'
import RecentFiles from './RecentFiles'
import PreviewModal from './PreviewModal'
import axios from 'axios'

export default function DashboardClient() {
  const [viewDoc, setViewDoc] = useState(null)

  const handleView = async (docMeta) => {
    try {
      const { data } = await axios.get(`http://localhost:4000/files/${docMeta.id}`)
      setViewDoc(data)
    } catch (e) {
      console.error("Failed to load document:", e)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <UploadDropzone />
        </div>
        <div className="lg:col-span-7">
          <RecentFiles onView={handleView} />
        </div>
      </div>
      {viewDoc && <PreviewModal document={viewDoc} onClose={() => setViewDoc(null)} />}
    </>
  )
}