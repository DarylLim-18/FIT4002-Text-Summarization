'use client'

import { useEffect, useRef, useState } from 'react'
import FileIcon from './FileIcon'
import { FiX } from 'react-icons/fi'

export default function PreviewModal({ document, onClose }) {
  const {
    file_name,
    file_summary,
    file_type,
    file_url,
    content,
    contentHTML,
    upload_date,
    file_size,
  } = document

  const [entered, setEntered] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const fmtSize = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`)
  const date = new Date(upload_date).toLocaleString()

  if (!document) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4
                  bg-black/50 backdrop-blur-sm
                  transition-opacity duration-300
                  ${entered ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`w-full max-w-4xl max-h-[90vh] outline-none
                    bg-slate-900 text-slate-100 rounded-2xl shadow-xl
                    border border-white/10
                    origin-center
                    transition-all duration-300 ease-out
                    ${entered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
                    flex flex-col overflow-hidden`}   // <-- constrain children
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileIcon type={file_type} className="w-6 h-6" />
            <h2 className="text-lg font-semibold truncate">{file_name}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-white/10">
            <FiX size={20} />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
          <section>
            <h3 className="font-semibold text-slate-200 mb-1">AI Summary</h3>
            <p className="text-slate-300 whitespace-pre-wrap">{file_summary}</p>
          </section>

          <section className="flex flex-col">
            <h3 className="font-semibold text-slate-200 mb-2">Full Content</h3>
            <div className="overflow-auto min-h-[40vh] max-h-[60vh] bg-slate-900 rounded-md p-3 whitespace-pre-wrap break-words border border-slate-700 custom-scrollbar">
              {file_type === 'application/pdf' && (
                <iframe
                  src={file_url}
                  className="w-full min-h-[50vh] h-[50vh] rounded"
                  title="PDF preview"
                />
              )}

              {file_type?.includes('wordprocessingml') && contentHTML && (
                <div
                  className="prose prose-invert max-w-none min-h-[50vh] h-[50vh] rounded"
                  dangerouslySetInnerHTML={{ __html: contentHTML }}
                />
              )}

              {file_type === 'text/plain' && (
                <pre className="whitespace-pre-wrap text-slate-300 min-h-[50vh] h-[50vh] rounded">{content}</pre>
              )}
            </div>
          </section>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 text-slate-400 text-sm shrink-0">
          <span>Uploaded: {date}</span>
          <span>Size: {fmtSize(file_size)}</span>
        </div>
      </div>
    </div>
  )
}
