import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  ResponseSchema,
  LayoutSchema,
  WidgetNodeSchema,
  type Layout,
  type LayoutNode,
  type Slot,
} from '../lib/schema'
import { getWidget } from '../lib/registry'

// Single constant — easy to swap for production URL.
const BACKEND_BASE_URL = 'http://localhost:3000'

// Padding (px) between each slot container and the video edge / center.
const SLOT_PADDING = 16

// Maps a Slot enum value to absolute CSS positioning relative to the video rect.
// Each slot is an absolutely-positioned container; the widget renders inside it.
function slotStyle(slot: Slot, rect: DOMRect): React.CSSProperties {
  const p = SLOT_PADDING

  // Vertical bands: top = top quarter, middle = vertical center, bottom = bottom quarter
  // Horizontal: left edge, horizontal center, right edge
  const top = rect.top
  const left = rect.left
  const right = rect.right
  const bottom = rect.bottom
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  const positions: Record<Slot, React.CSSProperties> = {
    'top-left':      { top: top + p,       left: left + p },
    'top-center':    { top: top + p,       left: centerX, transform: 'translateX(-50%)' },
    'top-right':     { top: top + p,       right: window.innerWidth - right + p },
    'middle-left':   { top: centerY,       left: left + p, transform: 'translateY(-50%)' },
    'middle-right':  { top: centerY,       right: window.innerWidth - right + p, transform: 'translateY(-50%)' },
    'bottom-left':   { bottom: window.innerHeight - bottom + p, left: left + p },
    'bottom-center': { bottom: window.innerHeight - bottom + p, left: centerX, transform: 'translateX(-50%)' },
    'bottom-right':  { bottom: window.innerHeight - bottom + p, right: window.innerWidth - right + p },
  }

  return {
    position: 'fixed',
    pointerEvents: 'none',
    ...positions[slot],
  }
}

// When the backend returns a bare widget (back-compat), wrap it as a 1-node layout
// placed at top-left so the renderer always sees a Layout.
function normalizeToLayout(raw: unknown): Layout | null {
  // Try layout first (has type: 'layout')
  const layoutParsed = LayoutSchema.safeParse(raw)
  if (layoutParsed.success) return layoutParsed.data

  // Try single widget — wrap in a layout at top-left
  const widgetParsed = WidgetNodeSchema.safeParse(raw)
  if (widgetParsed.success) {
    return {
      type: 'layout',
      nodes: [{ widget: widgetParsed.data, slot: 'top-left' }],
    }
  }

  return null
}

type OverlayState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'layout'; data: Layout }
  | { status: 'error'; message: string }

export function Overlay() {
  const [videoRect, setVideoRect] = useState<DOMRect | null>(null)
  const [state, setState] = useState<OverlayState>({ status: 'idle' })

  // Keep videoRect in sync with the page <video> element.
  useEffect(() => {
    function findVideo() {
      const video = document.querySelector('video')
      if (video) setVideoRect(video.getBoundingClientRect())
    }

    findVideo()
    const interval = setInterval(findVideo, 2000)
    return () => clearInterval(interval)
  }, [])

  // Listen for intent queries dispatched by the content script.
  useEffect(() => {
    async function handleQuery(event: Event) {
      const { text, image } = (event as CustomEvent<{ text: string; image?: string }>).detail
      if (!text) return

      setState({ status: 'loading' })

      try {
        const body: { text: string; image?: string } = { text }
        if (image) body.image = image

        const response = await fetch(`${BACKEND_BASE_URL}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}))
          throw new Error(
            `Backend returned ${response.status}: ${errBody.error ?? 'Unknown error'}`
          )
        }

        const rawData = await response.json()

        // Validate with the top-level ResponseSchema — handles both Layout and bare widget.
        const parsed = ResponseSchema.safeParse(rawData)
        if (!parsed.success) {
          throw new Error(`Invalid response schema from backend: ${parsed.error.message}`)
        }

        // Normalize to a Layout regardless of whether we got a bare widget or a layout.
        const layout = normalizeToLayout(parsed.data)
        if (!layout) {
          throw new Error('Could not normalize response to a layout')
        }

        setState({ status: 'layout', data: layout })
      } catch (err) {
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        })
        // Auto-dismiss error after 5 seconds.
        setTimeout(() => setState({ status: 'idle' }), 5000)
      }
    }

    window.addEventListener('overlai:query', handleQuery)
    return () => window.removeEventListener('overlai:query', handleQuery)
  }, [])

  // Fallback video rect when no <video> is found: treat the full viewport as the rect.
  const effectiveRect = videoRect ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight)

  // Sort layout nodes by zIndex ascending so higher zIndex renders on top.
  const sortedNodes: LayoutNode[] =
    state.status === 'layout'
      ? [...state.data.nodes].sort((a, b) => (a.zIndex ?? 10) - (b.zIndex ?? 10))
      : []

  return (
    <div style={{ pointerEvents: 'none', width: '100%', height: '100%', position: 'relative' }}>
      {/* Loading indicator — anchored top-left of the video */}
      <AnimatePresence>
        {state.status === 'loading' && (
          <div
            style={{
              position: 'fixed',
              top: effectiveRect.top + SLOT_PADDING,
              left: effectiveRect.left + SLOT_PADDING,
              background: 'rgba(0,0,0,0.6)',
              color: '#facc15',
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: 8,
              fontFamily: 'monospace',
              pointerEvents: 'none',
            }}
          >
            Building layout...
          </div>
        )}
      </AnimatePresence>

      {/* Error message — anchored top-left of the video */}
      <AnimatePresence>
        {state.status === 'error' && (
          <div
            style={{
              position: 'fixed',
              top: effectiveRect.top + SLOT_PADDING,
              left: effectiveRect.left + SLOT_PADDING,
              background: 'rgba(200,0,0,0.7)',
              color: '#fff',
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: 8,
              fontFamily: 'monospace',
              maxWidth: 320,
              pointerEvents: 'none',
            }}
          >
            {state.message}
          </div>
        )}
      </AnimatePresence>

      {/* Slot-based layout renderer */}
      {state.status === 'layout' &&
        sortedNodes.map((node, index) => {
          const WidgetComponent = getWidget(node.widget.type)

          // Skip nodes whose widget type is not in the registry (graceful per-node fallback).
          if (!WidgetComponent) {
            console.warn('[overlai] Unknown widget type in layout node:', node.widget.type)
            return null
          }

          const style = slotStyle(node.slot as Slot, effectiveRect)

          return (
            <AnimatePresence key={`${node.slot}-${index}`} mode="wait">
              <div style={{ ...style, zIndex: node.zIndex ?? 10 }}>
                <WidgetComponent data={node.widget} />
              </div>
            </AnimatePresence>
          )
        })}
    </div>
  )
}
