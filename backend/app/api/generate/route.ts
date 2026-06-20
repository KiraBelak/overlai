import { NextRequest, NextResponse } from 'next/server'
import { WidgetSchema } from '@/lib/schema'

// TODO Phase 1: replace stub with real Claude structured-output call
// TODO Phase 2: add API-Football lookup when Claude decides football data is needed
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { text } = body as { text?: string }

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  // HARDCODED stub — returns a valid Scoreboard schema for any input
  // This is Phase 0: no real Claude call, no real football API
  const stub = {
    type: 'scoreboard' as const,
    teams: [
      { name: 'Real Madrid', score: 2 },
      { name: 'FC Barcelona', score: 1 },
    ],
    minute: 67,
  }

  // Validate against Zod before returning (proves the pipeline works end-to-end)
  const result = WidgetSchema.safeParse(stub)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid widget schema', details: result.error }, { status: 500 })
  }

  return NextResponse.json(result.data)
}
