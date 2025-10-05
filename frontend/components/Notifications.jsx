'use client'

import { useEffect } from 'react'

export default function Notification({
  title = '',
  message = '',
  type = 'info',     // you could style by type
  duration = 4000,   // auto-dismiss
  onDone            // callback after hide
}) {
  useEffect(() => {
    // play ding
    const audio = new Audio('/sounds/ding.mp3')
    audio.play().catch(() => {})

    // auto-dismiss
    const t = setTimeout(() => {
      onDone?.()
    }, duration)

    return () => clearTimeout(t)
  }, [duration, onDone])

  return (
    <div
      className="
        fixed bottom-6 left-6
        bg-gradient-to-r from-blue-500 to-indigo-600
        text-white
        px-6 py-4
        rounded-r-full rounded-l-md
        shadow-lg
        transform transition-transform duration-300
        animate-slide-in
      "
    >
      <strong className="block font-semibold">{title}</strong>
      <span className="block">{message}</span>
    </div>
  )
}
