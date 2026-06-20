import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Timer } from '../lib/schema'

interface Props {
  data: Timer
  /** Optional entrance delay in seconds for staggered choreography. Default: 0. */
  delay?: number
}

function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60)
  const s = Math.abs(seconds) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Injected widgets use inline styles (not Tailwind): self-contained, immune to
// the host page's CSS, and they never leak styles back into the host page.
export function TimerWidget({ data, delay = 0 }: Props) {
  const [remaining, setRemaining] = useState(data.durationSeconds)

  useEffect(() => {
    // Reset when a new timer data arrives.
    setRemaining(data.durationSeconds)

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [data.durationSeconds])

  const isUrgent = remaining <= 10 && remaining > 0
  const isDone = remaining === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay }}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '14px 28px',
        borderRadius: 16,
        background: 'rgba(10, 10, 14, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
        color: '#ffffff',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {data.label && (
        <span
          style={{
            fontSize: 12,
            color: '#9ca3af',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {data.label}
        </span>
      )}
      <span
        style={{
          fontSize: 36,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: isDone ? '#9ca3af' : isUrgent ? '#f87171' : '#facc15',
          transition: 'color 0.3s ease',
        }}
      >
        {formatTime(remaining)}
      </span>
    </motion.div>
  )
}
