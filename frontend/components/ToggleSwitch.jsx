'use client'

import { useEffect, useRef, useState } from 'react'

export default function ToggleSwitch({
  options = ['Content', 'Context'],
  selected,
  onChange
}) {
  // we'll store the computed styles here
  const [indicatorStyle, setIndicatorStyle] = useState({
    width: 0,
    height: 0,
    left: 0,
    top: 0
  })

  // refs to each button
  const buttonsRef = useRef({})

  useEffect(() => {
    const btn = buttonsRef.current[selected]
    if (btn) {
      const { offsetWidth, offsetHeight, offsetLeft, offsetTop } = btn
      setIndicatorStyle({
        width:  offsetWidth,
        height: offsetHeight,
        left:   offsetLeft,
        top:    offsetTop
      })
    }
  }, [selected, options])

  return (
    <div className="relative inline-flex bg-gray-700 rounded-full overflow-hidden">
      {/* sliding indicator */}
      <div
        className="absolute bg-green-400 rounded-full transition-all duration-300 ease-in-out"
        style={{
          width:  `${indicatorStyle.width}px`,
          height: `${indicatorStyle.height}px`,
          transform: `translateX(${indicatorStyle.left}px) translateY(${indicatorStyle.top}px)`,
        }}
      />

      {options.map(opt => {
        const key = opt.toLowerCase()
        const isActive = key === selected
        return (
          <button
            key={key}
            ref={el => (buttonsRef.current[key] = el)}
            onClick={() => onChange(key)}
            className={`relative px-4 py-2 z-10 font-medium text-sm rounded-full transition-colors ${
              isActive
                ? 'text-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
