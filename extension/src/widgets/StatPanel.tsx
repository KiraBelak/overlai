import { motion } from 'framer-motion'
import type { StatPanel } from '../lib/schema'

interface Props {
  data: StatPanel
  /** Optional entrance delay in seconds for staggered choreography. Default: 0. */
  delay?: number
}

// Injected widgets use inline styles (not Tailwind): self-contained, immune to
// the host page's CSS, and they never leak styles back into the host page.
export function StatPanelWidget({ data, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay }}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 10,
        padding: '14px 22px',
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
        minWidth: 160,
      }}
    >
      {data.title && (
        <span
          style={{
            fontSize: 11,
            color: '#9ca3af',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: 8,
          }}
        >
          {data.title}
        </span>
      )}
      {data.stats.map((stat, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <span style={{ fontSize: 13, color: '#d1d5db', fontWeight: 500 }}>
            {stat.label}
          </span>
          <span style={{ fontSize: 14, color: '#facc15', fontWeight: 700 }}>
            {stat.value}
          </span>
        </div>
      ))}
    </motion.div>
  )
}
