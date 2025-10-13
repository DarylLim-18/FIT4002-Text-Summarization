'use client'

import FileIcon from './FileIcon'
import { FiEye, FiTrash2 } from 'react-icons/fi'

const formatSize = bytes => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileListItem({ document, onView, onDelete }) {
  const { id, file_name, file_size, file_type, upload_date } = document
  const date = new Date(upload_date).toLocaleDateString()
  const size = formatSize(file_size)

  return (
    <div className="flex items-center p-3 bg-slate-800 rounded-lg hover:bg-slate-700/50 transform-gpu hover:-translate-y-0.5 transition-all duration-150">
      <FileIcon type={file_type} />
      <div className="ml-3 flex-grow overflow-hidden">
        <p className="font-medium text-slate-200 truncate" title={file_name}>{file_name}</p>
        <p className="text-xs text-slate-400">Uploaded: {date} • {size}</p>
      </div>
      <div className="flex items-center space-x-2 ml-4">
        <button onClick={() => onView(document)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-full transition-colors">
          <FiEye className="w-5 h-5" />
        </button>
        <button onClick={() => onDelete(id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-600 rounded-full transition-colors">
          <FiTrash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
