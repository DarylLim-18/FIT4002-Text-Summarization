'use client'

import { useCallback, useState } from 'react'
import UploadDropzone from './UploadDropzone'
import RecentFiles from './RecentFiles'
import PreviewModal from './PreviewModal'
import axios from 'axios'

export default function DashboardClient() {
  const [viewDoc, setViewDoc] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleView = async (docMeta) => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/files/${docMeta.id}`)
      setViewDoc(data)
    } catch (e) {
      console.error("Failed to load document:", e)
    }
  }

  const handleUploaded = useCallback(() => {
    setRefreshKey(key => key + 1)
  }, [])

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <UploadDropzone onUploaded={handleUploaded} />
        </div>
        <div className="lg:col-span-7">
          <RecentFiles onView={handleView} refreshKey={refreshKey} />
        </div>
      </div>
      {viewDoc && <PreviewModal document={viewDoc} onClose={() => setViewDoc(null)} />}
    </>
  )
}

