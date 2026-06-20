import { z } from 'zod'

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

export const WidgetSchema = ScoreboardSchema
export type Widget = z.infer<typeof WidgetSchema>
