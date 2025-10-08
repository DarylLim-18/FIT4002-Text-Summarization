'use client'
import { useState } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'
import ToggleSwitch from './ToggleSwitch'

export default function SearchBar({
  value = '',
  onSearch,
  onClear,
  searchBy = 'content',
  onToggleSearchBy
}) {
  const [input, setInput] = useState(value)

  const handleSearch = () => onSearch(input.trim())
  const handleClear  = () => { setInput(''); onClear() }

  return (
    <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg">
      {/* title + toggle */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-white">Search Documents</h2>
        <ToggleSwitch
          options={['Content','Context']}
          selected={searchBy}
          onChange={onToggleSearchBy}
        />
      </div>

      {/* subtitle */}
      <p className="text-slate-400 mb-4">
        {searchBy === 'content'
          ? 'Search name, summary, or full text'
          : 'AI-powered semantic search using ML service - find documents by meaning, not just keywords'}
      </p>

      {/* input + buttons */}
      <div className="flex items-center space-x-2">
        <input
          type="text"
          placeholder="Type your query…"
          className="flex-grow p-3 rounded-l-md bg-slate-900 border border-slate-700 focus:outline-none focus:border-blue-500 text-slate-200"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-r-md flex items-center space-x-1"
        >
          <FiSearch /><span>Search</span>
        </button>
        {input && (
          <button
            onClick={handleClear}
            className="p-2 text-slate-400 hover:text-white"
            aria-label="Clear search"
          >
            <FiX size={20} />
          </button>
        )}
      </div>
    </div>
  )
}
