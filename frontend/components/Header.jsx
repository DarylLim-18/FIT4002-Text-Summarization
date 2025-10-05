'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaRegFileAlt } from 'react-icons/fa'
import { useRef, useState, useEffect } from 'react'

export default function Header() {
  const path = usePathname()
  if (path === '/') return null

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Documents', href: '/documents' },
  ]

  // Refs for each nav link element
  const linksRef = useRef({})
  // Style state for our sliding pill
  const [pillStyle, setPillStyle] = useState({
    width: 0,
    left:  0,
  })

  useEffect(() => {
    // on mount & whenever `path` changes, re-measure active link
    const activeLink = linksRef.current[path]
    if (activeLink) {
      setPillStyle({
        width: activeLink.offsetWidth,
        left:  activeLink.offsetLeft,
      })
    }
  }, [path])

  return (
    <header className="bg-slate-900 text-slate-100 shadow">
      <div className="container mx-auto flex items-center justify-between py-4 px-6">
        {/* Logo + Title */}
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="bg-blue-600 text-white rounded-full p-2">
            <FaRegFileAlt size={20} />
          </div>
          <span className="text-xl font-bold">Document Manager</span>
        </Link>

        {/* Nav */}
        <nav className="relative bg-slate-700/50 rounded-md">
          {/* Sliding pill */}
          <div
            className="absolute top-0 bg-blue-600 rounded-md h-full transition-all duration-300"
            style={{
              width:  `${pillStyle.width}px`,
              transform: `translateX(${pillStyle.left}px)`,
            }}
          />
          <div className="relative flex space-x-4">
            {navItems.map(({ label, href }) => {
              const isActive = path === href
              return (
                <Link
                  key={href}
                  href={href}
                  ref={el => (linksRef.current[href] = el)}
                  className={`relative px-4 py-2 rounded-md font-medium transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </header>
  )
}
