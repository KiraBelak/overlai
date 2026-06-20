import Anthropic from '@anthropic-ai/sdk'
import { WidgetNodeSchema, LayoutSchema, ResponseSchema } from '@/lib/schema'

// Hardcoded fallback returned when ANTHROPIC_API_KEY is missing (dev without a key).
// Returns a valid Layout so the no-key path exercises the new schema.
const FALLBACK_LAYOUT = {
  type: 'layout' as const,
  nodes: [
    {
      slot: 'top-center' as const,
      widget: {
        type: 'scoreboard' as const,
        teams: [
          { name: 'Real Madrid', score: 2 },
          { name: 'FC Barcelona', score: 1 },
        ],
        minute: 67,
      },
    },
  ],
}

// CORS headers applied to every response so the Chrome extension can call this.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Handle OPTIONS preflight (browser sends this before the real POST).
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: Request) {
  const body = await request.json()
  const { text, image, mode, history } = body as {
    text?: string
    image?: string
    mode?: string
    history?: Array<{ query: string; summary: string }>
  }

  // Detect mode: vision-only proactive scan — no user text required.
  const isDetectMode = mode === 'detect'

  if (!isDetectMode && (!text || typeof text !== 'string')) {
    return Response.json(
      { error: 'text is required' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY

  // --- No API key ---
  if (!apiKey) {
    if (isDetectMode) {
      // In detect mode without a key, return null suggestion to avoid demo spam.
      return Response.json({ suggestion: null }, { headers: CORS_HEADERS })
    }
    console.warn(
      '[overlai] ANTHROPIC_API_KEY is not set — returning hardcoded fallback layout.'
    )
    return Response.json(FALLBACK_LAYOUT, { headers: CORS_HEADERS })
  }

  // --- Detect mode: proactive event detection ---
  if (isDetectMode) {
    return handleDetectMode(image, apiKey)
  }

  // --- Generate mode (default): forced tool_choice, unchanged behavior ---
  const client = new Anthropic({ apiKey })

  // When a screenshot is provided, use sonnet (better at reading on-screen text).
  // When text-only, keep haiku for low latency.
  const hasImage = typeof image === 'string' && image.startsWith('data:')
  const model = hasImage ? 'claude-sonnet-4-6' : 'claude-haiku-4-5'

  // Build optional history context block to inject into the instruction text.
  // When the client provides recent interaction history, Claude uses it to resolve
  // pronoun references and follow-up questions (e.g. "and his stats?", "the other team?").
  const historyBlock =
    Array.isArray(history) && history.length > 0
      ? `\nRecent interactions in this session (most recent last):\n${history
          .map((h, i) => `  ${i + 1}. User asked: "${h.query}" → showed: ${h.summary}`)
          .join('\n')}\n\nUse the above history to resolve references in the user's new request. ` +
        `For example, if the user says "and his stats?" or "what about the other team?", ` +
        `identify the relevant team or subject from the most recent relevant interaction and answer about that.\n`
      : ''

  // Build the instruction text.
  const instructionText = hasImage
    ? `You are a sports overlay assistant. The screenshot shows the current state of a live broadcast.
${historyBlock}
STEP 1 — Identify the PRIMARY live match:
  The PRIMARY match is the one being actively played in the MAIN video frame — the large central video area.
  It is NOT a picture-in-picture feed, NOT a commentator webcam, and NOT a promo/teaser for an upcoming game.

  a) Find the main scorebug (score bug): a dedicated broadcast graphic tied to the live action in the main frame.
     It is usually pinned to the top-left or bottom area of the main video. This is the authoritative source for
     team names, score, and match clock.
  b) Identify the MAIN ACTION AREA: where is the ball / play happening? What region of the screen is the center of attention?
  c) Identify existing ON-SCREEN broadcast graphics: score bug, lower-thirds, team logos, sponsor banners, clock overlays.
  d) Identify any EMPTY regions that have no text or graphics burned in.

STEP 2 — IGNORE these elements entirely — do NOT read or use data from them:
  - The scrolling TICKER or results bar at the very bottom of the screen (shows OTHER match scores).
  - Scores, team names, or results from any match OTHER than the primary live match in the main frame.
  - "Up next", "Coming up", "Próximo partido", or any promotion for a future match.
  - League standings tables or tournament brackets.
  - Channel logos, sponsor banners, social media handles, watermarks.
  - Any picture-in-picture box or commentator webcam feed.
  If multiple scores appear, only the PRIMARY match's scorebug (attached to the live main-frame action) is valid.
  If you cannot confidently identify which score belongs to the primary live match, omit uncertain fields or use placeholders.

STEP 3 — Choose slots that:
  - AVOID the main action area (center of the screen where the play is happening).
  - AVOID covering existing broadcast graphics already burned into the feed.
  - PREFER the identified empty regions.
  - SPREAD OUT widgets: never cluster two wide widgets in adjacent top slots (e.g. do NOT use top-center AND top-right
    for two wide scoreboard/alert widgets — they will collide). Instead spread across top and bottom, or left and right.

Available slots: top-left, top-center, top-right, middle-left, middle-right, bottom-left, bottom-center, bottom-right.
- top-* = upper 25% of video; bottom-* = lower 25%; middle-* = side edges at vertical center.
- Wide widgets (scoreboard, statpanel) need at least ~300px. top-center and top-right are adjacent — using both for wide widgets causes overlap.
- Prefer non-adjacent slots for multi-widget layouts: e.g. top-left + bottom-right, or top-center + bottom-left.

STEP 4 — Use ONLY data visible in the screenshot for the PRIMARY match. Do not use prior knowledge of teams or scores.

Widget types:
- scoreboard: for live match scores and team information
- statpanel: for match statistics (possession, shots, corners, etc.)
- timer: when the user wants a countdown or timer
- alert: for short announcements like "GOAL!", "Penalty!", or key events
- momentum: when the user asks about win probability, who's going to win, momentum, or "quién va ganando".
  Use momentum_teams (exactly 2) with integer probabilities summing to ~100. Base the estimate on
  the visible score, match clock, and game state — NOT on prior knowledge. Always add a momentum_note
  such as "Estimate based on score & time" to make clear it is an approximation, not official data.

The user said: "${text}".
Compose the best layout for this intent. For broad requests like "show me the match" or "full overview",
use multiple widgets — e.g. scoreboard top-left + statpanel bottom-right (non-adjacent, non-colliding).
For single-widget requests, one node is fine.
Call render_layout with the data you can read from the PRIMARY live match in the broadcast.`
    : `You are a sports overlay assistant. The user said: "${text}".
${historyBlock}
You must call render_layout to compose a layout of 1–6 widgets placed in screen slots.
Available slots: top-left, top-center, top-right, middle-left, middle-right, bottom-left, bottom-center, bottom-right.

Widget types:
- scoreboard: questions about the score, match result, or teams playing (e.g. "what's the score?", "show me the scoreboard")
- timer: when the user wants a countdown or timer (e.g. "start a 5 minute timer", "30 second countdown")
- statpanel: when the user asks for match statistics like possession, shots on target, corners, or pass accuracy
- alert: for short dramatic announcements or events (e.g. "goal!", "show penalty alert", "red card")
- momentum: when the user asks "who's going to win", "win probability", "momentum", or "quién va ganando".
  Use momentum_teams (exactly 2 entries) with integer probabilities 0–100 summing to ~100.
  Base probabilities on the visible score and time — this is an ESTIMATE, not official data.
  Always set momentum_note to a disclaimer like "Estimate based on score & time".

Slot placement rules:
- SPREAD widgets across the screen — avoid adjacent top slots for two wide widgets (e.g. top-center + top-right collide).
- Prefer non-adjacent combinations: top-left + bottom-right, top-center + bottom-left, etc.
- Avoid the center of the screen (middle-left and middle-right are safer than top-center for secondary widgets).

For broad requests like "show me the full match" or "give me the full match overview", compose multiple widgets
(e.g. scoreboard top-left + statpanel bottom-right — non-adjacent, non-colliding).
For focused single-intent requests, one node is fine.
If no real data is known, invent plausible example data for a demo.
Call render_layout with the best matching layout.`

  // Build the user content: image block (if present) followed by the instruction text.
  type UserContent = Anthropic.MessageParam['content']
  let userContent: UserContent

  if (hasImage) {
    const commaIndex = image!.indexOf(',')
    const base64Data = commaIndex !== -1 ? image!.slice(commaIndex + 1) : image!

    userContent = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: base64Data,
        },
      },
      {
        type: 'text',
        text: instructionText,
      },
    ]
  } else {
    userContent = instructionText
  }

  // The tool schema supports a flat layout of 1–6 widget nodes.
  // Each node has: slot (enum), widget (flat object with all widget fields), optional zIndex.
  // The `widget.type` field discriminates which widget it is; per-type required fields
  // are enforced by Zod after Claude returns the tool input (backstop validation).
  //
  // FLAT structure: no recursion, no nested arrays of arrays — required by Anthropic
  // strict structured outputs which do not support recursive schemas.
  //
  // strict: true enables native Anthropic arg validation as a first layer.
  // Zod per-node validation is kept as the backstop (see graceful fallback below).
  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    tools: [
      {
        name: 'render_layout',
        description:
          'Compose a layout of 1–6 overlay widgets placed in fixed screen slots. ' +
          'Each node specifies a slot position and a widget. ' +
          'Use multiple nodes when the user\'s intent benefits from seeing several widgets at once ' +
          '(e.g. "show me the full match" → scoreboard top-center + statpanel bottom-left). ' +
          'Single-widget requests can use one node. ' +
          'Choose slots to avoid covering the main broadcast action.',
        input_schema: {
          type: 'object' as const,
          properties: {
            nodes: {
              type: 'array',
              description: '1–6 widget nodes composing the layout.',
              minItems: 1,
              maxItems: 6,
              items: {
                type: 'object',
                properties: {
                  slot: {
                    type: 'string',
                    enum: [
                      'top-left',
                      'top-center',
                      'top-right',
                      'middle-left',
                      'middle-right',
                      'bottom-left',
                      'bottom-center',
                      'bottom-right',
                    ],
                    description:
                      'Screen region where this widget appears. ' +
                      'top-* = upper quarter, middle-* = center sides, bottom-* = lower quarter.',
                  },
                  zIndex: {
                    type: 'integer',
                    description: 'Optional stacking order. Higher = on top. Default 10.',
                  },
                  // widget fields — flat (not nested object) to comply with strict mode limits.
                  // The `widget_type` field discriminates; all widget field names are unique
                  // across widget types so they can coexist in one flat object.
                  widget_type: {
                    type: 'string',
                    enum: ['scoreboard', 'timer', 'statpanel', 'alert', 'momentum'],
                    description:
                      'Type of widget to render. ' +
                      'scoreboard=live score, timer=countdown, statpanel=match stats, alert=announcement, ' +
                      'momentum=win probability bar showing each team\'s estimated win chance.',
                  },
                  // scoreboard fields
                  teams: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Team name' },
                        score: { type: 'integer', minimum: 0, description: 'Goals scored' },
                      },
                      required: ['name', 'score'],
                    },
                    minItems: 2,
                    maxItems: 2,
                    description: '[scoreboard] Exactly two teams: [home, away].',
                  },
                  minute: {
                    type: 'integer',
                    minimum: 0,
                    description: '[scoreboard] Current match minute (optional).',
                  },
                  // timer fields
                  durationSeconds: {
                    type: 'integer',
                    minimum: 1,
                    description: '[timer] Countdown duration in seconds.',
                  },
                  label: {
                    type: 'string',
                    description: '[timer] Optional label shown above the countdown.',
                  },
                  // statpanel fields
                  title: {
                    type: 'string',
                    description: '[statpanel] Optional title shown above the stats list.',
                  },
                  stats: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        label: { type: 'string', description: 'Stat name (e.g. "Possession")' },
                        value: { type: 'string', description: 'Stat value (e.g. "58%")' },
                      },
                      required: ['label', 'value'],
                    },
                    minItems: 1,
                    maxItems: 6,
                    description: '[statpanel] 1–6 key/value stat rows.',
                  },
                  // alert fields
                  message: {
                    type: 'string',
                    description: '[alert] Short announcement text (e.g. "GOAL!", "Penalty!").',
                  },
                  tone: {
                    type: 'string',
                    enum: ['info', 'success', 'warning'],
                    description:
                      '[alert] Visual accent: info=blue, success=green, warning=orange.',
                  },
                  // momentum fields
                  momentum_teams: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Team name' },
                        probability: {
                          type: 'integer',
                          minimum: 0,
                          maximum: 100,
                          description: 'Estimated win probability (0–100). The two values should sum to ~100.',
                        },
                      },
                      required: ['name', 'probability'],
                    },
                    minItems: 2,
                    maxItems: 2,
                    description:
                      '[momentum] Exactly two teams with their estimated win probabilities. ' +
                      'Values should sum to ~100. This is an ESTIMATE based on score and time — not official data.',
                  },
                  momentum_note: {
                    type: 'string',
                    description:
                      '[momentum] Optional short note shown below the bar, e.g. "Estimate based on score & time".',
                  },
                },
                required: ['slot', 'widget_type'],
              },
            },
          },
          required: ['nodes'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'render_layout' },
    messages: [{ role: 'user', content: userContent }],
  })

  // Extract the tool_use block — tool_choice forces exactly one.
  const toolUse = response.content.find((block) => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    return Response.json(
      { error: 'Claude did not return a tool_use block' },
      { status: 502, headers: CORS_HEADERS }
    )
  }

  // Claude returns flat nodes: each node has widget_type + all widget fields at the
  // same level. We reshape each node into the nested { slot, widget: {...} } structure
  // that the Zod LayoutSchema expects.
  const rawInput = toolUse.input as {
    nodes: Array<{
      slot: string
      zIndex?: number
      widget_type: string
      // scoreboard
      teams?: Array<{ name: string; score: number }>
      minute?: number
      // timer
      durationSeconds?: number
      label?: string
      // statpanel
      title?: string
      stats?: Array<{ label: string; value: string }>
      // alert
      message?: string
      tone?: string
      // momentum (prefixed to avoid collision with scoreboard's `teams`)
      momentum_teams?: Array<{ name: string; probability: number }>
      momentum_note?: string
    }>
  }

  // Reshape flat node → nested LayoutNode. Validate each node independently.
  // Graceful fallback: if a node fails Zod validation, DROP that node and render the
  // rest rather than failing the whole response. Log dropped nodes.
  const validNodes: Array<{ slot: string; zIndex?: number; widget: unknown }> = []

  for (const rawNode of rawInput.nodes ?? []) {
    const { slot, zIndex, widget_type, momentum_teams, momentum_note, ...widgetFields } = rawNode

    // Build the widget object from the flat fields.
    // For momentum, remap prefixed fields to their schema names.
    const momentumExtras =
      widget_type === 'momentum'
        ? { teams: momentum_teams, note: momentum_note }
        : {}
    const widgetCandidate = { type: widget_type, ...widgetFields, ...momentumExtras }

    // Validate the widget with Zod.
    const widgetParsed = WidgetNodeSchema.safeParse(widgetCandidate)
    if (!widgetParsed.success) {
      console.warn(
        '[overlai] Dropping invalid node (widget_type=%s, slot=%s): %s',
        widget_type,
        slot,
        widgetParsed.error.message
      )
      continue
    }

    validNodes.push({ slot, zIndex, widget: widgetParsed.data })
  }

  // If all nodes were dropped, return an error rather than an empty layout.
  if (validNodes.length === 0) {
    return Response.json(
      { error: 'All layout nodes failed schema validation' },
      { status: 502, headers: CORS_HEADERS }
    )
  }

  // Build the Layout response object and run a final top-level validation.
  const layoutCandidate = { type: 'layout' as const, nodes: validNodes }
  const layoutParsed = LayoutSchema.safeParse(layoutCandidate)

  if (!layoutParsed.success) {
    console.error('[overlai] Layout Zod validation failed:', layoutParsed.error)
    return Response.json(
      { error: 'Layout schema validation failed', details: layoutParsed.error },
      { status: 502, headers: CORS_HEADERS }
    )
  }

  return Response.json(layoutParsed.data, { headers: CORS_HEADERS })
}

// ---------------------------------------------------------------------------
// Detect mode handler — proactive event detection (no user text)
//
// HYBRID TWO-STAGE PIPELINE:
//
//   STAGE 1 — Haiku filter (cheap, fast):
//     Model : claude-haiku-4-5
//     Task  : Answer a structured yes/no: "is something notable happening
//             in the PRIMARY live match right now?"
//     Output: { notable: boolean; reason: string }
//     Cost  : Minimal — tiny tool, small max_tokens.
//     Gate  : If notable === false → return { suggestion: null } immediately.
//             Do NOT call Stage 2. This keeps per-tick cost and latency low
//             for the common case (nothing happening).
//
//   STAGE 2 — Sonnet confirm + render (accurate, only when needed):
//     Model : claude-sonnet-4-6
//     Task  : Confirm the event is genuinely notable and produce the widget
//             layout using the full hardened grounding rules (ignore tickers,
//             other matches, picture-in-picture, etc.).
//     Output: optional render_layout tool call.
//     Cost  : Paid only when Haiku said YES — typically rare during a match.
//             Sonnet's superior OCR accuracy avoids misreading ticker scores.
//
// ---------------------------------------------------------------------------

// Shared render_layout tool input schema — used by Stage 2 / generate mode.
const RENDER_LAYOUT_INPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    nodes: {
      type: 'array',
      description: '1–3 widget nodes for the detected event.',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          slot: {
            type: 'string',
            enum: [
              'top-left', 'top-center', 'top-right',
              'middle-left', 'middle-right',
              'bottom-left', 'bottom-center', 'bottom-right',
            ],
          },
          zIndex: { type: 'integer' },
          widget_type: {
            type: 'string',
            enum: ['scoreboard', 'timer', 'statpanel', 'alert', 'momentum'],
          },
          teams: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                score: { type: 'integer', minimum: 0 },
              },
              required: ['name', 'score'],
            },
            minItems: 2,
            maxItems: 2,
          },
          minute: { type: 'integer', minimum: 0 },
          durationSeconds: { type: 'integer', minimum: 1 },
          label: { type: 'string' },
          title: { type: 'string' },
          stats: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                value: { type: 'string' },
              },
              required: ['label', 'value'],
            },
            minItems: 1,
            maxItems: 6,
          },
          message: { type: 'string' },
          tone: {
            type: 'string',
            enum: ['info', 'success', 'warning'],
          },
          momentum_teams: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                probability: { type: 'integer', minimum: 0, maximum: 100 },
              },
              required: ['name', 'probability'],
            },
            minItems: 2,
            maxItems: 2,
          },
          momentum_note: { type: 'string' },
        },
        required: ['slot', 'widget_type'],
      },
    },
  },
  required: ['nodes'],
}

// Hardened grounding rules shared between Stage 2 detect and generate-with-image.
// The PRIMARY match is the one being actively played in the MAIN video frame.
const DETECT_GROUNDING_RULES = `
PRIMARY MATCH IDENTIFICATION:
- The PRIMARY match is the one being actively played in the MAIN video frame (the large central video area).
- Read ONLY the scorebug/score bug that belongs to the PRIMARY match: typically pinned top-left or bottom
  of the main frame, tied to the live action you can see on the pitch.
- DO NOT read scores or team names from picture-in-picture boxes, commentator webcam feeds, or any smaller inset.

IGNORE these elements entirely — never use data from them:
- The scrolling TICKER or results bar at the very bottom of the screen (shows OTHER match scores).
- Scores, team names, or match results from any match OTHER than the primary live match.
- "Up next", "Coming up", "Próximo partido", or any promo for a future match.
- League standings, tournament brackets, or historical result graphics.
- Channel logos, sponsor banners, social media handles, watermarks.
- Picture-in-picture boxes and commentator webcam feeds.

If multiple scores are visible on screen, only the PRIMARY match's scorebug is authoritative.
If you cannot confidently identify which score belongs to the primary live match, do NOT fabricate:
return nothing (do not call render_layout).

Use ONLY data visible in the screenshot. Do not apply prior knowledge of team names or scores.`

async function handleDetectMode(
  image: string | undefined,
  apiKey: string,
): Promise<Response> {
  const hasImage = typeof image === 'string' && image.startsWith('data:')

  if (!hasImage) {
    // Detect mode requires an image to analyze.
    return Response.json({ suggestion: null }, { headers: CORS_HEADERS })
  }

  const client = new Anthropic({ apiKey })

  const commaIndex = image!.indexOf(',')
  const base64Data = commaIndex !== -1 ? image!.slice(commaIndex + 1) : image!

  // Build the shared image block used by both stages.
  const imageBlock: Anthropic.ImageBlockParam = {
    type: 'image',
    source: {
      type: 'base64',
      media_type: 'image/jpeg',
      data: base64Data,
    },
  }

  // -------------------------------------------------------------------------
  // STAGE 1 — Haiku filter: cheap yes/no "is something notable happening?"
  //
  // Model : claude-haiku-4-5 (fast, inexpensive — suited for high-frequency polling)
  // Tool  : check_notable — structured yes/no with short reason
  // Tokens: max_tokens 256 — we only need a tiny JSON object back
  // -------------------------------------------------------------------------
  const stage1Instruction = `You are a sports broadcast monitor scanning for notable live events.

Look ONLY at the PRIMARY live match — the one being actively played in the MAIN video frame.
Ignore the scrolling ticker at the bottom, any other match scores, picture-in-picture, webcams, and promos.

Is a NOTABLE event happening in the PRIMARY live match RIGHT NOW?
Notable events: goal just scored, red or yellow card shown, penalty awarded, VAR decision announced,
significant score change, or other dramatic moment visible in the main frame.

Call check_notable with your assessment. Be conservative: if you are unsure, answer notable: false.`

  const stage1Response = await client.messages.create({
    model: 'claude-haiku-4-5', // Stage 1: fast cheap filter
    max_tokens: 256,           // Tiny — only needs { notable, reason }
    tools: [
      {
        name: 'check_notable',
        description: 'Report whether a notable live event is happening in the PRIMARY match right now.',
        input_schema: {
          type: 'object' as const,
          properties: {
            notable: {
              type: 'boolean',
              description: 'true if a notable event (goal, card, penalty, VAR, etc.) is happening in the primary match.',
            },
            reason: {
              type: 'string',
              description: 'One short sentence explaining why notable is true or false.',
            },
          },
          required: ['notable', 'reason'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'check_notable' }, // Force structured output
    messages: [{ role: 'user', content: [imageBlock, { type: 'text', text: stage1Instruction }] }],
  })

  // Parse Stage 1 result.
  const stage1Tool = stage1Response.content.find((b) => b.type === 'tool_use')
  if (!stage1Tool || stage1Tool.type !== 'tool_use') {
    // Unexpected — treat as non-notable to fail safe.
    console.warn('[overlai detect] Stage 1 did not return check_notable — skipping')
    return Response.json({ suggestion: null }, { headers: CORS_HEADERS })
  }

  const stage1Input = stage1Tool.input as { notable: boolean; reason: string }
  console.log('[overlai detect] Stage 1 (haiku):', stage1Input.notable, '—', stage1Input.reason)

  // Gate: if Haiku says nothing notable, stop here — no Sonnet call.
  if (!stage1Input.notable) {
    return Response.json({ suggestion: null }, { headers: CORS_HEADERS })
  }

  // -------------------------------------------------------------------------
  // STAGE 2 — Sonnet confirm + render: accurate read, only when Haiku said YES
  //
  // Model : claude-sonnet-4-6 (better OCR / on-screen text accuracy)
  // Tool  : render_layout — optional tool use (no forced choice)
  //         Sonnet may still decide the event isn't genuinely notable or
  //         can't be read confidently → no tool call → { suggestion: null }
  // Tokens: max_tokens 1024 — needs to produce a full widget layout
  // -------------------------------------------------------------------------
  const stage2Instruction = `You are a sports broadcast monitor. Haiku flagged a potentially notable event.
Confirm whether it is genuinely notable and — if so — compose an appropriate overlay layout.
${DETECT_GROUNDING_RULES}

ONLY call render_layout if there is a CONFIRMED NOTABLE event in the PRIMARY live match:
- A goal just scored
- A card shown (red or yellow)
- A penalty awarded
- A significant score change or milestone
- A dramatic moment (VAR decision, injury, substitution shown on screen)

If after your own careful read you conclude there is nothing genuinely notable, or you cannot confidently
read the primary match data, do NOT call render_layout. Return nothing.

If you DO call render_layout, use only data from the PRIMARY match's scorebug / main-frame graphics.`

  const stage2Response = await client.messages.create({
    model: 'claude-sonnet-4-6', // Stage 2: accurate — only called when Haiku said YES
    max_tokens: 1024,           // Enough for a full render_layout payload
    tools: [
      {
        name: 'render_layout',
        description:
          'Compose a layout of 1–3 overlay widgets for a confirmed notable live broadcast event. ' +
          'Only call this when something genuinely notable is happening in the PRIMARY match.',
        input_schema: RENDER_LAYOUT_INPUT_SCHEMA,
      },
    ],
    // No tool_choice — Sonnet may decline to call the tool if not actually notable.
    messages: [{ role: 'user', content: [imageBlock, { type: 'text', text: stage2Instruction }] }],
  })

  // Check whether Sonnet confirmed by calling render_layout.
  const stage2Tool = stage2Response.content.find((b) => b.type === 'tool_use')

  // No tool call = Sonnet decided it wasn't actually notable (or couldn't read it confidently).
  if (!stage2Tool || stage2Tool.type !== 'tool_use') {
    console.log('[overlai detect] Stage 2 (sonnet) declined — not notable or unreadable')
    return Response.json({ suggestion: null }, { headers: CORS_HEADERS })
  }

  // Reshape flat nodes → nested LayoutNodes (same pattern as generate mode).
  const rawInput = stage2Tool.input as {
    nodes: Array<{
      slot: string
      zIndex?: number
      widget_type: string
      teams?: Array<{ name: string; score: number }>
      minute?: number
      durationSeconds?: number
      label?: string
      title?: string
      stats?: Array<{ label: string; value: string }>
      message?: string
      tone?: string
      momentum_teams?: Array<{ name: string; probability: number }>
      momentum_note?: string
    }>
  }

  const validNodes: Array<{ slot: string; zIndex?: number; widget: unknown }> = []

  for (const rawNode of rawInput.nodes ?? []) {
    const { slot, zIndex, widget_type, momentum_teams, momentum_note, ...widgetFields } = rawNode
    const momentumExtras =
      widget_type === 'momentum'
        ? { teams: momentum_teams, note: momentum_note }
        : {}
    const widgetCandidate = { type: widget_type, ...widgetFields, ...momentumExtras }
    const widgetParsed = WidgetNodeSchema.safeParse(widgetCandidate)
    if (!widgetParsed.success) {
      console.warn('[overlai detect] Dropping invalid node:', widgetParsed.error.message)
      continue
    }
    validNodes.push({ slot, zIndex, widget: widgetParsed.data })
  }

  if (validNodes.length === 0) {
    return Response.json({ suggestion: null }, { headers: CORS_HEADERS })
  }

  const layoutCandidate = { type: 'layout' as const, nodes: validNodes }
  const layoutParsed = LayoutSchema.safeParse(layoutCandidate)

  if (!layoutParsed.success) {
    console.warn('[overlai detect] Layout validation failed:', layoutParsed.error)
    return Response.json({ suggestion: null }, { headers: CORS_HEADERS })
  }

  console.log('[overlai detect] Stage 2 (sonnet) confirmed notable — returning suggestion')
  return Response.json({ suggestion: layoutParsed.data }, { headers: CORS_HEADERS })
}
