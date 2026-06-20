import { motion } from 'framer-motion'
import type { Momentum } from '../lib/schema'

interface Props {
  data: Momentum
  /** Optional entrance delay in seconds for staggered choreography. Default: 0. */
  delay?: number
}

// Colors for home (left) and away (right) sides of the probability bar.
const HOME_COLOR = '#38bdf8' // sky blue
const AWAY_COLOR = '#fb923c' // orange

// Injected widgets use inline styles (not Tailwind): self-contained, immune to
// the host page's CSS, and they never leak styles back into the host page.
export function MomentumWidget({ data, delay = 0 }: Props) {
  const [home, away] = data.teams

  // Normalize so the two halves always fill 100% of the bar, even if the
  // probabilities don't sum to exactly 100. Clamp each to [0,100] first.
  const rawHome = Math.max(0, Math.min(100, home.probability))
  const rawAway = Math.max(0, Math.min(100, away.probability))
  const total = rawHome + rawAway || 100 // guard against both being 0
  const homePct = Math.round((rawHome / total) * 100)
  const awayPct = 100 - homePct

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
        padding: '14px 18px',
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
        minWidth: 260,
      }}
    >
      {/* Header row: team name + percentage on each side */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        {/* Home side */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
          <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{home.name}</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: HOME_COLOR }}>{homePct}%</span>
        </div>

        {/* Center label */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Win prob
        </span>

        {/* Away side */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{away.name}</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: AWAY_COLOR }}>{awayPct}%</span>
        </div>
      </div>

      {/* Probability bar — grows on mount via framer-motion width animation */}
      <div
        style={{
          position: 'relative',
          height: 8,
          borderRadius: 999,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.08)',
          display: 'flex',
        }}
      >
        {/* Home segment: animates width from 0 → homePct% */}
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${homePct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: delay + 0.15 }}
          style={{
            height: '100%',
            background: HOME_COLOR,
            borderRadius: '999px 0 0 999px',
          }}
        />
        {/* Away segment: animates width from 0 → awayPct% */}
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${awayPct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: delay + 0.15 }}
          style={{
            height: '100%',
            background: AWAY_COLOR,
            borderRadius: '0 999px 999px 0',
          }}
        />
      </div>

      {/* Optional note line (e.g. "Estimate based on score & time") */}
      {data.note && (
        <span
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.35)',
            fontStyle: 'italic',
            textAlign: 'center',
          }}
        >
          {data.note}
        </span>
      )}
    </motion.div>
  )
}
