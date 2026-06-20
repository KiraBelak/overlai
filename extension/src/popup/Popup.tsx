import { useState } from 'react'

export function Popup() {
  const [text, setText] = useState('')

  return (
    <div className="w-72 p-4 bg-gray-900 text-white font-sans">
      <h1 className="text-lg font-bold mb-3 text-yellow-400">Overlai</h1>
      <p className="text-xs text-gray-400 mb-4">
        Voice-driven overlay engine — Phase 0 stub
      </p>

      {/* Mic button placeholder */}
      <button
        className="w-full py-3 rounded-xl bg-yellow-400 text-black font-bold text-sm mb-3 cursor-pointer hover:bg-yellow-300 transition-colors"
        onClick={() => alert('Voice capture coming in Phase 1')}
      >
        🎤 Hold to Speak
      </button>

      {/* Text input fallback */}
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='e.g. "who&apos;s winning?"'
        className="w-full px-3 py-2 rounded-lg bg-gray-800 text-white text-sm border border-gray-700 focus:outline-none focus:border-yellow-400"
      />

      <div className="mt-3 text-xs text-gray-500 text-center">
        Backend: /api/generate (stub)
      </div>
    </div>
  )
}
