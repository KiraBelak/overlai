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

// --- Widget node (discriminated union of the 4 widget types) ---
export const WidgetNodeSchema = z.discriminatedUnion('type', [
  ScoreboardSchema,
  TimerSchema,
  StatPanelSchema,
  AlertSchema,
])

export type WidgetNode = z.infer<typeof WidgetNodeSchema>

// Keep the old name as an alias for backward compatibility.
export const WidgetSchema = WidgetNodeSchema
export type Widget = WidgetNode

// --- Slot positions ---
// 8 fixed regions relative to the video element.
export const SlotSchema = z.enum([
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
])

export type Slot = z.infer<typeof SlotSchema>

// --- Layout node: one widget placed in one slot ---
export const LayoutNodeSchema = z.object({
  widget: WidgetNodeSchema,
  slot: SlotSchema,
  zIndex: z.number().int().optional(),
})

export type LayoutNode = z.infer<typeof LayoutNodeSchema>

// --- Layout: flat, bounded (1–6 nodes), non-recursive ---
// Flat structure required: Anthropic strict structured outputs do not support
// recursive schemas or numerical constraints at the top level.
export const LayoutSchema = z.object({
  type: z.literal('layout'),
  nodes: z.array(LayoutNodeSchema).min(1).max(6),
})

export type Layout = z.infer<typeof LayoutSchema>

// --- Top-level response: single widget (back-compat) OR a layout ---
export const ResponseSchema = z.union([WidgetNodeSchema, LayoutSchema])

export type OverlaiResponse = z.infer<typeof ResponseSchema>
