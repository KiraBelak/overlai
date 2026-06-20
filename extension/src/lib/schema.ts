import { z } from 'zod'

// --- Scoreboard ---
export const TeamSchema = z.object({
  name: z.string(),
  score: z.number().int().nonnegative(),
})

export const ScoreboardSchema = z.object({
  type: z.literal('scoreboard'),
  teams: z.array(TeamSchema).length(2),
  minute: z.number().int().nonnegative().optional(),
})

export type Scoreboard = z.infer<typeof ScoreboardSchema>

// --- Timer ---
export const TimerSchema = z.object({
  type: z.literal('timer'),
  label: z.string().optional(),
  durationSeconds: z.number().int().positive(),
})

export type Timer = z.infer<typeof TimerSchema>

// --- StatPanel ---
export const StatSchema = z.object({
  label: z.string(),
  value: z.string(),
})

export const StatPanelSchema = z.object({
  type: z.literal('statpanel'),
  title: z.string().optional(),
  stats: z.array(StatSchema).min(1).max(6),
})

export type StatPanel = z.infer<typeof StatPanelSchema>

// --- Alert ---
export const AlertSchema = z.object({
  type: z.literal('alert'),
  message: z.string(),
  tone: z.enum(['info', 'success', 'warning']).optional(),
})

export type Alert = z.infer<typeof AlertSchema>

// --- Discriminated union ---
export const WidgetSchema = z.discriminatedUnion('type', [
  ScoreboardSchema,
  TimerSchema,
  StatPanelSchema,
  AlertSchema,
])

export type Widget = z.infer<typeof WidgetSchema>
