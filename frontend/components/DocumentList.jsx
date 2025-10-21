'use client'

import FileIcon from './FileIcon'
import { FiEye, FiTrash2 } from 'react-icons/fi'

// Format bytes → KB
const kb = 0;
const mb = 0;
const fmtSize = bytes => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentList({ documents, onView, onDelete }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {documents.map(doc => {
        const date = new Date(doc.upload_date).toLocaleDateString()
        const size = fmtSize(doc.file_size)
        const hasScore = typeof doc.similarity_score === 'number'
        const scorePercent = hasScore ? (doc.similarity_score * 100).toFixed(1) : null

        return (
          <div
            key={doc.id}
            className="bg-slate-800 p-6 rounded-2xl shadow-lg flex flex-col justify-between hover:bg-slate-700/50 transform-gpu hover:-translate-y-0.5 transition-all duration-150"
          >
            <div>
              <div className="flex items-center mb-2 space-x-2">
                <FileIcon type={doc.file_type} className="w-5 h-5" />
                <h4
                  className="font-medium text-slate-200 truncate"
                  title={doc.file_name}
                >
                  {doc.file_name}
                </h4>
                {hasScore && (
                  <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 text-xs rounded-full font-medium">
                    {scorePercent}%
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-3">
                {date} • {size}
              </p>
              <p className="text-sm text-slate-300 mb-6">
                {doc.file_summary}
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => onView(doc)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors"
              >
                <FiEye className="inline-block mr-1" /> View
              </button>
              <button
                onClick={() => onDelete(doc.id)}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-red-300 rounded-md transition-colors"
              >
                <FiTrash2 className="inline-block mr-1" /> Delete
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}   
