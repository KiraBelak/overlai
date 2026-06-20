import { motion } from 'framer-motion'
import type { Alert } from '../lib/schema'

interface Props {
  data: Alert
  /** Optional entrance delay in seconds for staggered choreography. Default: 0. */
  delay?: number
}

const TONE_COLORS: Record<string, string> = {
  info: '#38bdf8',
  success: '#4ade80',
  warning: '#fb923c',
}

// Injected widgets use inline styles (not Tailwind): self-contained, immune to
// the host page's CSS, and they never leak styles back into the host page.
export function AlertWidget({ data, delay = 0 }: Props) {
  const accentColor = TONE_COLORS[data.tone ?? 'info']

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '14px 28px',
        borderRadius: 16,
        background: 'rgba(10, 10, 14, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `1px solid ${accentColor}44`,
        boxShadow: `0 10px 30px rgba(0, 0, 0, 0.45), 0 0 0 1px ${accentColor}22`,
        color: accentColor,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontWeight: 800,
        fontSize: 22,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
      }}
    >
      {data.message}
    </motion.div>
  )
}
