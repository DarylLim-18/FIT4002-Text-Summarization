'use client'

import { FaFilePdf, FaFileWord, FaFileAlt } from 'react-icons/fa'

export default function FileIcon({ type, className = 'w-6 h-6 flex-shrink-0' }) {
  if (type.includes('pdf')) return <FaFilePdf className={`${className} text-red-500`} />
  if (type.includes('officedocument') || type.includes('wordprocessingml') || type.includes('docx')) return <FaFileWord className={`${className} text-blue-500`} />
  return <FaFileAlt className={`${className} text-white`} />
}
