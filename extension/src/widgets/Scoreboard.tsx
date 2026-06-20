import { motion } from 'framer-motion'
import type { Scoreboard } from '../lib/schema'

interface Props {
  data: Scoreboard
}

export function ScoreboardWidget({ data }: Props) {
  const [home, away] = data.teams

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="bg-black/70 backdrop-blur-sm text-white rounded-xl px-6 py-3 flex items-center gap-4 font-bold text-lg shadow-xl"
    >
      <span>{home.name}</span>
      <span className="text-yellow-400 text-2xl">{home.score}</span>
      <span className="text-gray-400 text-sm">—</span>
      <span className="text-yellow-400 text-2xl">{away.score}</span>
      <span>{away.name}</span>
      {data.minute !== undefined && (
        <span className="text-green-400 text-sm ml-2">{data.minute}'</span>
      )}
    </motion.div>
  )
}
