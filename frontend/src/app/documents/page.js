'use client'

import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'

import SearchBar from '../../../components/SearchBar'
import DocumentList from '../../../components/DocumentList'
import PreviewModal from '../../../components/PreviewModal'
import Notification from '../../../components/Notification'
import DeleteConfirmModal from '../../../components/DeleteConfirmModal'

//UI helper
function TypeSelect({ value, onChange }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="peer appearance-none bg-slate-800/60 text-slate-200
                   border border-white/10 rounded-lg
                   pl-3 pr-9 py-2
                   shadow-sm shadow-black/20
                   transition-all duration-200 ease-out
                   hover:bg-slate-700/50 hover:-translate-y-0.5 hover:shadow-md
                   focus:outline-none focus:ring-2 focus:ring-sky-400/40"
      >
        <option value="all">All</option>
        <option value="pdf">PDF</option>
        <option value="docx">DOCX</option>
        <option value="txt">TXT</option>
      </select>

      {/* custom caret */}
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4
                   text-slate-300 transition-transform duration-200 ease-out
                   peer-focus:rotate-180"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  )
}

function SortToggle({ order, onToggle }) {
  const label = order === 'asc' ? 'Oldest → Newest' : 'Newest → Oldest'
  return (
    <button
      onClick={onToggle}
      title="Toggle newest/oldest"
      aria-pressed={order === 'asc'}
      className="group inline-flex items-center gap-2 rounded-lg
                 bg-slate-800/60 text-slate-200
                 border border-white/10 px-3 py-2
                 shadow-sm shadow-black/20
                 transition-all duration-200 ease-out
                 hover:bg-slate-700/50 hover:-translate-y-0.5 hover:shadow-md
                 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
    >
      {/* arrow icon rotates to suggest direction */}
      <svg
        className={`h-4 w-4 transition-transform duration-300 ease-out ${order === 'asc' ? 'rotate-180' : ''}`}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden
      >
        {/* vertical bidirectional arrow */}
        <path d="M12 4v16" />
        <path d="M9 7l3-3 3 3" />
        <path d="M15 17l-3 3-3-3" />
      </svg>
      <span className="text-sm">{label}</span>
    </button>
  )
}


//Page
export default function DocumentsPage() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [viewDoc, setViewDoc] = useState(null)
  const [searchBy, setSearchBy] = useState('content')
  const [error, setError] = useState(null)
  const [notif, setNotif] = useState(null)
  const [title, setTitle] = useState(null)

  const [fileType, setFileType] = useState('all')
  const [sortOrder, setSortOrder] = useState('desc')

  // delete confirm state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  useEffect(() => {
    const performSearch = async () => {
      setLoading(true)
      setError(null)

      try {
        let response;
        
        if (searchBy === 'context' && query.trim()) {
          // Use context search endpoint with ML service
          const fileTypeMapping = {
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain',
            'all': null
          };

          response = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/files/context-search`, {
            query: query,
            n_results: 20,
            file_type_filter: fileTypeMapping[fileType]
          });

          // Context search returns results in a different format
          const contextResults = response.data.results || [];
          setFiles(sortOrder === 'asc' ? contextResults.slice().reverse() : contextResults);
        } else {
          // Use traditional search endpoint
          const params = { q: query, type: fileType };
          response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/files/search`, { params });
          setFiles(sortOrder === 'asc' ? response.data.slice().reverse() : response.data);
        }
      } catch (err) {
        console.error('Search failed:', err);
        if (searchBy === 'context') {
          setError('Context search failed. Make sure the ML service is running.');
        } else {
          setError('Search failed');
        }
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query, fileType, sortOrder, searchBy])

  const handleView = async (docMeta) => {
    try {
      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/files/${docMeta.id}`
      )
      setViewDoc(data)
    } catch {
      setError('Failed to load document for preview.')
    }
  }

  const askDelete = (id) => {
    setPendingDeleteId(id)
    setConfirmOpen(true)
  }

  const fileToDelete = useMemo(
    () => files.find((f) => f.id === pendingDeleteId),
    [files, pendingDeleteId]
  )

  const doDelete = async () => {
    if (!pendingDeleteId) return
    setDeleteLoading(true)
    setTitle('File Delete')
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/files/${pendingDeleteId}`)
      setFiles((f) => f.filter((doc) => doc.id !== pendingDeleteId))
      // showing file name feels nicer
      const name = fileToDelete?.file_name || 'Document'
      setNotif(`"${name}" was deleted.`)
    } catch {
      setError('Failed to delete document.')
      setNotif('Delete failed.')
    } finally {
      setDeleteLoading(false)
      setConfirmOpen(false)
      setPendingDeleteId(null)
    }
  }

  return (
    <main className="container mx-auto p-6 space-y-6">
      {notif && (
        <Notification
          title={title}
          message={notif}
          onDone={() => setNotif(null)}
        />
      )}
      {error && <p className="text-red-400">{error}</p>}
      {loading && <p className="text-blue-400">Loading...</p>}

      <SearchBar
        value={query}
        onSearch={setQuery}
        onClear={() => setQuery('')}
        searchBy={searchBy}
        onToggleSearchBy={setSearchBy}
      />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">
          {query
            ? `Results for “${query}” (${files.length})`
            : fileType !== 'all'
              ? `${fileType.toUpperCase()} Documents (${files.length})`
              : `All Documents (${files.length})`}
        </h3>

        <div className="flex items-center gap-3">
          <label className="text-slate-300">Type:</label>
          <TypeSelect value={fileType} onChange={setFileType} />
          <SortToggle
            order={sortOrder}
            onToggle={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
          />
        </div>
      </div>

      <DocumentList documents={files} onView={handleView} onDelete={askDelete} />

      {viewDoc && (
        <PreviewModal document={viewDoc} onClose={() => setViewDoc(null)} />
      )}

      <DeleteConfirmModal
        open={confirmOpen}
        loading={deleteLoading}
        title="Delete file"
        message={
          fileToDelete?.file_name
            ? `Are you sure you want to delete “${fileToDelete.file_name}”? This action cannot be undone.`
            : 'Are you sure you want to delete this file?'
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={doDelete}
        onCancel={() => !deleteLoading && setConfirmOpen(false)}
      />
    </main>
  )
}
