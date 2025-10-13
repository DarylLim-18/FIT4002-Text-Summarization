'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { useDropzone } from 'react-dropzone'
import { FaCloudUploadAlt } from 'react-icons/fa'
import Notification from './Notification'

export default function UploadDropzone({ onUploaded = () => {} }) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [notif, setNotif] = useState(null)
  const [title, setTitle] = useState(null)

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles.length) return
    setIsProcessing(true)
    setError(null)

    const file = acceptedFiles[0]
    const form = new FormData()
    form.append('file', file)

    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/files/upload`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      // show success notification
      setNotif(`Your file "${data.file_name}" was uploaded.`)
      setTitle('File Upload')

      // refresh your list
      router.refresh()
      onUploaded(data)
    } catch (e) {
      console.error(e)
      setError('Upload failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [router, onUploaded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    }
  })

  return (
    <>
      {/* Notification */}
      {notif && (
        <Notification
          title={title}
          message={notif}
          onDone={() => {
            setNotif(null);
            setTitle(null)
          }}
        />
      )}

      {/* Dropzone UI */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
          isDragActive
            ? 'border-blue-400 bg-slate-800'
            : 'border-slate-600 hover:border-slate-400'
        }`}
      >
        <input {...getInputProps()} />
        {isProcessing ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="h-8 w-8 border-4 border-t-4 border-t-transparent border-blue-500 rounded-full animate-spin" />
            <span className="text-blue-400">Processing...</span>
          </div>
        ) : (
          <>
            <FaCloudUploadAlt size={48} className="mx-auto mb-4 text-slate-400" />
            <p className="text-lg font-medium">Click to upload or drag and drop</p>
            <p className="text-sm text-slate-500 mt-1">PDF, DOCX, or TXT</p>
            {error && <p className="mt-2 text-red-400">{error}</p>}
          </>
        )}
      </div>
    </>
  )
}

