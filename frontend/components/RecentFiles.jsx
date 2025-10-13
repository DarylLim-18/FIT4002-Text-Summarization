'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import FileListItem from './FileListItem'
import Notification from './Notification'
import DeleteConfirmModal from './DeleteConfirmModal'

export default function RecentFiles({ onView, refreshKey = 0 }) {
  const [files, setFiles] = useState([])
  const [error, setError] = useState(null)
  const [notif, setNotif] = useState(null)
  const [title, setTitle] = useState(null)

  // delete confirm state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toDelete, setToDelete] = useState({ id: null, name: '' })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/files`)
        if (!cancelled) {
          setFiles(res.data)
          setError(null)
        }
      } catch {
        if (!cancelled) setError('Failed to load files')
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const askDelete = (id, name) => {
    setToDelete({ id, name })
    setConfirmOpen(true)
  }

  const doDelete = async () => {
    if (!toDelete.id) return
    setDeleteLoading(true)
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/files/${toDelete.id}`)
      setFiles(prev => prev.filter(f => f.id !== toDelete.id))
      setTitle('File Delete')
      setNotif(`"${toDelete.name}" was deleted.`)
    } catch {
      setError('Delete failed')
    } finally {
      setDeleteLoading(false)
      setConfirmOpen(false)
      setToDelete({ id: null, name: '' })
    }
  }

  return (
    <>
      {/* Notification */}
      {notif && (
        <Notification
          title={title}
          message={notif}
          onDone={() => {
            setNotif(null)
            setTitle(null)
          }}
        />
      )}

      <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg h-full">
        <h2 className="text-2xl font-bold text-white mb-4">Recent Files</h2>
        {error && <p className="mb-2 text-red-400">{error}</p>}
        <div className="space-y-3">
          {files.slice(0, 5).map(file => (
            <FileListItem
              key={file.id}
              document={file}
              onView={() => onView(file)}
              onDelete={() => askDelete(file.id, file.file_name)}
            />
          ))}
        </div>
      </div>

      <DeleteConfirmModal
        open={confirmOpen}
        loading={deleteLoading}
        title="Delete file"
        message={
          toDelete.name
            ? `Are you sure you want to delete “${toDelete.name}”? This action cannot be undone.`
            : 'Are you sure you want to delete this file?'
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={doDelete}
        onCancel={() => !deleteLoading && setConfirmOpen(false)}
      />
    </>
  )
}
