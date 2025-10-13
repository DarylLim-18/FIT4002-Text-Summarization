'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FaRegFileAlt } from 'react-icons/fa'
import { useState, useEffect } from 'react'
import "./Header.css"

export default function Enhanced_Header() {
    const path = usePathname()
    const [isScrolled, setIsScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const navItems = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Documents', href: '/documents' }
    ]

    return (
        <header className={`header-container ${isScrolled ? 'scrolled' : ''}`}>
            <div className="header-inner">
                {/* Logo + Title */}
                <Link href="/dashboard" className="logo-container">
                    <div className="logo-icon">
                        <FaRegFileAlt size={20} />
                    </div>
                    <span className="logo-text">Document Manager</span>
                </Link>

                {/* Navigation */}
                <nav className="nav-container">
                    {navItems.map(({ label, href }) => {
                        const isActive = path === href
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                            >
                                {label}
                                {isActive && <span className="active-indicator"></span>}
                            </Link>
                        )
                    })}
                </nav>

                {/* Mobile Menu Button (for future mobile implementation) */}
                <button className="mobile-menu-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                </button>
            </div>
        </header>
    )
}