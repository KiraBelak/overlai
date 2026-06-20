import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ScoreboardWidget } from '../widgets/Scoreboard'

// Placeholder widget data for Phase 0 visual verification
const PLACEHOLDER_DATA = {
  type: 'scoreboard' as const,
  teams: [
    { name: 'Madrid', score: 2 },
    { name: 'Barça', score: 1 },
  ],
  minute: 67,
}

export function Overlay() {
  const [videoRect, setVideoRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    function findVideo() {
      const video = document.querySelector('video')
      if (video) {
        setVideoRect(video.getBoundingClientRect())
      }
    }

    findVideo()
    // Re-check periodically (video may load after mount)
    const interval = setInterval(findVideo, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    // pointer-events: none on parent — individual widgets enable clicks as needed
    <div style={{ pointerEvents: 'none', width: '100%', height: '100%', position: 'relative' }}>
      <AnimatePresence>
        <div
          style={{
            position: 'absolute',
            top: videoRect ? videoRect.top + 16 : 16,
            left: videoRect ? videoRect.left + 16 : 16,
            pointerEvents: 'none',
          }}
        >
          {/* Phase 0 placeholder: always show scoreboard for visual verification */}
          <ScoreboardWidget data={PLACEHOLDER_DATA} />
          <div
            style={{
              marginTop: 8,
              background: 'rgba(0,0,0,0.5)',
              color: '#aaa',
              fontSize: 11,
              padding: '4px 8px',
              borderRadius: 6,
              fontFamily: 'monospace',
            }}
          >
            overlai overlay — phase 0
          </div>
        </div>
      </AnimatePresence>
    </div>
  )
}
