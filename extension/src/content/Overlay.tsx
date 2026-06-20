import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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

// Gap (px) added between stacked widgets when vertical-offset fallback is used.
const STACK_GAP = 8

// Entrance stagger delay per widget (seconds). The nth widget in the sorted
// node list gets index * STAGGER_DELAY added to its spring transition.
const STAGGER_DELAY = 0.08

// ---------------------------------------------------------------------------
// Widget priority: determines which widget "wins" a slot conflict and which
// gets relocated. Higher number = higher priority = stays in its slot.
// Priority order: alert > scoreboard > timer > statpanel
// ---------------------------------------------------------------------------
const WIDGET_PRIORITY: Record<string, number> = {
  alert:      40,
  scoreboard: 30,
  timer:      20,
  statpanel:  10,
}

function widgetPriority(type: string): number {
  return WIDGET_PRIORITY[type] ?? 0
}

// All 8 valid slot names in a stable order used for relocation searches.
const ALL_SLOTS: Slot[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'top-center',
  'bottom-center',
  'middle-left',
  'middle-right',
]

// ---------------------------------------------------------------------------
// Center no-go zone
// ---------------------------------------------------------------------------
// The central ~40% of the video rect (both horizontally and vertically) is
// reserved as broadcast action area. No widget slot anchor should place a widget
// whose bounding rect extends into this zone.
//
// Implementation: we check whether a slot anchor's resulting widget rect
// intersects the center zone. If so, the slot is excluded from the candidate
// list during relocation.
// ---------------------------------------------------------------------------
function centerNoGoZone(rect: DOMRect): DOMRect {
  // 40% of each dimension, centered.
  const w = rect.width * 0.4
  const h = rect.height * 0.4
  return new DOMRect(
    rect.left + (rect.width - w) / 2,
    rect.top + (rect.height - h) / 2,
    w,
    h,
  )
}

// Returns true if two rects intersect (including touching edges).
function rectsIntersect(a: DOMRect, b: DOMRect): boolean {
  return (
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top
  )
}

// ---------------------------------------------------------------------------
// Slot anchor computation
// ---------------------------------------------------------------------------
// Maps a Slot enum value to absolute CSS positioning relative to the video rect.
// Each slot is an absolutely-positioned container; the widget renders inside it.
function slotStyle(
  slot: Slot,
  rect: DOMRect,
  offsetY = 0,
): React.CSSProperties {
  const p = SLOT_PADDING

  const top = rect.top
  const left = rect.left
  const right = rect.right
  const bottom = rect.bottom
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  const positions: Record<Slot, React.CSSProperties> = {
    'top-left':      { top: top + p + offsetY,       left: left + p },
    'top-center':    { top: top + p + offsetY,       left: centerX, transform: `translateX(-50%)` },
    'top-right':     { top: top + p + offsetY,       right: window.innerWidth - right + p },
    'middle-left':   { top: centerY + offsetY,       left: left + p, transform: 'translateY(-50%)' },
    'middle-right':  { top: centerY + offsetY,       right: window.innerWidth - right + p, transform: 'translateY(-50%)' },
    'bottom-left':   { bottom: window.innerHeight - bottom + p - offsetY, left: left + p },
    'bottom-center': { bottom: window.innerHeight - bottom + p - offsetY, left: centerX, transform: 'translateX(-50%)' },
    'bottom-right':  { bottom: window.innerHeight - bottom + p - offsetY, right: window.innerWidth - right + p },
  }

  return {
    position: 'fixed',
    pointerEvents: 'none',
    ...positions[slot],
  }
}

// Estimates the anchor point (top-left corner in viewport space) of a slot,
// given a known widget width and height. Used during pre-render relocation
// planning to approximate where a widget will land before we can measure it.
function estimateSlotRect(slot: Slot, videoRect: DOMRect, w: number, h: number): DOMRect {
  const p = SLOT_PADDING
  const cx = videoRect.left + videoRect.width / 2
  const cy = videoRect.top + videoRect.height / 2

  let x: number, y: number

  switch (slot) {
    case 'top-left':
      x = videoRect.left + p; y = videoRect.top + p; break
    case 'top-center':
      x = cx - w / 2; y = videoRect.top + p; break
    case 'top-right':
      x = videoRect.right - p - w; y = videoRect.top + p; break
    case 'middle-left':
      x = videoRect.left + p; y = cy - h / 2; break
    case 'middle-right':
      x = videoRect.right - p - w; y = cy - h / 2; break
    case 'bottom-left':
      x = videoRect.left + p; y = videoRect.bottom - p - h; break
    case 'bottom-center':
      x = cx - w / 2; y = videoRect.bottom - p - h; break
    case 'bottom-right':
      x = videoRect.right - p - w; y = videoRect.bottom - p - h; break
  }

  return new DOMRect(x, y, w, h)
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

// ---------------------------------------------------------------------------
// Stable node key
// ---------------------------------------------------------------------------
// Derived from the widget's TYPE and its ORIGINAL (model-assigned) slot — NOT
// the resolved slot after collision resolution. This keeps the AnimatePresence
// key stable across relocations: a relocated widget does NOT remount; only its
// CSS position changes. If the model assigns a different widget type to the
// same slot on a new query, the old widget exits and the new one enters.
// ---------------------------------------------------------------------------
function nodeKey(node: LayoutNode): string {
  return `${node.slot}::${node.widget.type}`
}

// ---------------------------------------------------------------------------
// Phase 1: Slot deduplication (pre-render, pure JS, no DOM)
// ---------------------------------------------------------------------------
// If two nodes are assigned the same slot by the model, the higher-priority
// widget stays; the lower-priority one is relocated to the nearest free slot
// (in ALL_SLOTS order, skipping occupied slots and center-intersecting slots).
//
// "Nearest" = first available slot in the ALL_SLOTS priority order that is not
// already occupied by any node in the deduplicated set.
// ---------------------------------------------------------------------------
function deduplicateSlots(nodes: LayoutNode[], videoRect: DOMRect): LayoutNode[] {
  const noGo = centerNoGoZone(videoRect)
  const slotMap = new Map<string, LayoutNode>()

  // Sort by priority descending so higher-priority nodes claim their slot first.
  const sorted = [...nodes].sort(
    (a, b) => widgetPriority(b.widget.type) - widgetPriority(a.widget.type),
  )

  const relocated: LayoutNode[] = []

  for (const node of sorted) {
    if (!slotMap.has(node.slot)) {
      slotMap.set(node.slot, node)
    } else {
      // Slot occupied — find the nearest free, non-center-colliding slot.
      const freeSlot = ALL_SLOTS.find((s) => {
        if (slotMap.has(s)) return false
        // Rough estimate: treat widget as ~300x60 for relocation candidate check.
        const estRect = estimateSlotRect(s, videoRect, 300, 60)
        return !rectsIntersect(estRect, noGo)
      })

      if (freeSlot) {
        const movedNode: LayoutNode = { ...node, slot: freeSlot }
        slotMap.set(freeSlot, movedNode)
        relocated.push(movedNode)
      } else {
        // No free slot at all — keep the node in its original slot (will be
        // handled by the overlap-resolution pass with a vertical offset instead).
        slotMap.set(node.slot, node)
      }
    }
  }

  return [...slotMap.values()]
}

// ---------------------------------------------------------------------------
// Resolved placement state
// ---------------------------------------------------------------------------
// After the measure pass, each node's final slot and vertical offset are stored
// here. Keys match nodeKey(node) with the ORIGINAL slot.
// ---------------------------------------------------------------------------
interface ResolvedPlacement {
  slot: Slot
  offsetY: number
}

type PlacementMap = Map<string, ResolvedPlacement>

// ---------------------------------------------------------------------------
// Overlap resolution (post-measure pass)
// ---------------------------------------------------------------------------
// Given measured rects (keyed by nodeKey) and the deduplicated node list,
// detect pairwise intersections and relocate the lower-priority widget.
//
// Relocation strategy:
//   1. Try all remaining free slots (not occupied by any node in the placed set).
//   2. Among those, pick the first that doesn't intersect the center no-go zone
//      and doesn't intersect any already-placed widget rect.
//   3. If no clean slot exists, apply a vertical stack offset: push the lower-
//      priority widget down (for top-* slots) or up (for bottom-* slots) by the
//      overlapping widget's height + STACK_GAP.
//
// Returns a PlacementMap: originalKey → { resolvedSlot, offsetY }.
// ---------------------------------------------------------------------------
function resolveOverlaps(
  nodes: LayoutNode[],
  measuredRects: Map<string, DOMRect>,
  videoRect: DOMRect,
): PlacementMap {
  const noGo = centerNoGoZone(videoRect)

  // Work with a mutable array of placements sorted by priority descending.
  // Higher priority widgets are placed first; they own their position.
  const prioritized = [...nodes].sort(
    (a, b) => widgetPriority(b.widget.type) - widgetPriority(a.widget.type),
  )

  const placed: Array<{ key: string; slot: Slot; rect: DOMRect; offsetY: number }> = []
  const result: PlacementMap = new Map()

  for (const node of prioritized) {
    const key = nodeKey(node)
    const measuredRect = measuredRects.get(key)

    if (!measuredRect) {
      // Widget not yet measured — keep original slot, no offset.
      result.set(key, { slot: node.slot as Slot, offsetY: 0 })
      continue
    }

    const w = measuredRect.width
    const h = measuredRect.height

    // Try the node's current slot first.
    let chosenSlot: Slot = node.slot as Slot
    let chosenOffsetY = 0
    let chosenRect = measuredRect

    // Check if the current slot intersects the center no-go zone.
    const slotInCenter = rectsIntersect(measuredRect, noGo)

    // Check if this rect collides with any already-placed widget.
    const collidingWith = placed.find((p) => rectsIntersect(measuredRect, p.rect))

    if (slotInCenter || collidingWith) {
      // Attempt to find a clean alternative slot.
      const occupiedSlots = new Set(placed.map((p) => p.slot))
      const candidateSlot = ALL_SLOTS.find((s) => {
        if (occupiedSlots.has(s)) return false
        const estRect = estimateSlotRect(s, videoRect, w, h)
        if (rectsIntersect(estRect, noGo)) return false
        // Make sure it doesn't collide with any already-placed widget.
        return !placed.some((p) => rectsIntersect(estRect, p.rect))
      })

      if (candidateSlot) {
        chosenSlot = candidateSlot
        chosenOffsetY = 0
        chosenRect = estimateSlotRect(candidateSlot, videoRect, w, h)
      } else if (collidingWith) {
        // Last resort: stack vertically within the same horizontal region.
        // For top-* slots, push down; for bottom-* slots, push up.
        const isBottom = node.slot.startsWith('bottom')
        const stackOffset = isBottom
          ? collidingWith.rect.height + STACK_GAP
          : collidingWith.rect.height + STACK_GAP

        chosenSlot = node.slot as Slot
        chosenOffsetY = stackOffset
        // Approximate new rect after offset.
        const dy = isBottom ? -stackOffset : stackOffset
        chosenRect = new DOMRect(measuredRect.x, measuredRect.y + dy, w, h)
      }
      // If slotInCenter but no collision and no free slot: keep original
      // (can't fix center overlap without a free slot — let backend hint handle it).
    }

    placed.push({ key, slot: chosenSlot, rect: chosenRect, offsetY: chosenOffsetY })
    result.set(key, { slot: chosenSlot, offsetY: chosenOffsetY })
  }

  return result
}

type OverlayState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'layout'; data: Layout }
  | { status: 'error'; message: string }

export function Overlay() {
  const [videoRect, setVideoRect] = useState<DOMRect | null>(null)
  const [state, setState] = useState<OverlayState>({ status: 'idle' })

  // PlacementMap computed by the measure pass.
  const [placements, setPlacements] = useState<PlacementMap>(new Map())

  // Refs for measuring each widget container after render.
  // keyed by nodeKey (original slot::type).
  const widgetRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Fingerprint of the current node set — used to detect when nodes change so
  // we only re-run the resolve pass when necessary (not on every render).
  const lastNodeFingerprintRef = useRef<string>('')

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
      // Clear placements when a new query starts so old resolved positions
      // don't flash on the new layout.
      setPlacements(new Map())
      lastNodeFingerprintRef.current = ''
      widgetRefs.current.clear()

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

  // ---------------------------------------------------------------------------
  // Phase 1: Slot deduplication (pre-render)
  // ---------------------------------------------------------------------------
  // Runs synchronously during render, before the DOM is updated. Resolves
  // same-slot conflicts using priority and slot availability.
  const deduplicatedNodes: LayoutNode[] =
    state.status === 'layout'
      ? deduplicateSlots(
          [...state.data.nodes].sort((a, b) => (a.zIndex ?? 10) - (b.zIndex ?? 10)),
          effectiveRect,
        )
      : []

  // Build node fingerprint: sorted list of "originalSlot::type" keys.
  // Changes when nodes are added, removed, or their types change.
  const nodeFingerprint = deduplicatedNodes.map(nodeKey).sort().join('|')

  // ---------------------------------------------------------------------------
  // Phase 2: Measure → resolve overlaps (post-layout)
  // ---------------------------------------------------------------------------
  // useLayoutEffect fires after DOM mutations but before paint. We measure all
  // widget containers, detect pairwise intersections, and update the PlacementMap.
  // Guard: only re-run when the node fingerprint changes (not on every render).
  // ---------------------------------------------------------------------------
  useLayoutEffect(() => {
    if (deduplicatedNodes.length === 0) return
    if (nodeFingerprint === lastNodeFingerprintRef.current) return

    lastNodeFingerprintRef.current = nodeFingerprint

    // Collect measured rects from widget container refs.
    const measuredRects = new Map<string, DOMRect>()
    for (const node of deduplicatedNodes) {
      const key = nodeKey(node)
      const el = widgetRefs.current.get(key)
      if (el) {
        measuredRects.set(key, el.getBoundingClientRect())
      }
    }

    // Run overlap resolution with measured dimensions.
    const resolved = resolveOverlaps(deduplicatedNodes, measuredRects, effectiveRect)
    setPlacements(resolved)
  })
  // Intentionally no deps array: useLayoutEffect runs after every render, but
  // the fingerprint guard inside ensures the resolution logic runs only when
  // nodes actually change. This is safe because the guard is pure + synchronous.

  return (
    <div style={{ pointerEvents: 'none', width: '100%', height: '100%', position: 'relative' }}>
      {/* Loading indicator — anchored top-left of the video */}
      <AnimatePresence>
        {state.status === 'loading' && (
          <motion.div
            key="overlai-loading"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message — anchored top-left of the video */}
      <AnimatePresence>
        {state.status === 'error' && (
          <motion.div
            key="overlai-error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
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
          </motion.div>
        )}
      </AnimatePresence>

      {/*
        Slot-based layout renderer — single AnimatePresence wrapping ALL nodes.

        Mode: popLayout
          When a widget exits (query replacement or dismissal), popLayout pops it
          out of normal flow immediately so the remaining widgets can reflow into
          their positions without waiting for the exit animation to complete. This
          avoids the "ghost gap" problem you get with mode="sync" on multi-widget
          layouts. mode="wait" would block ALL entrances until ALL exits finish,
          creating a noticeable flash of empty screen between layouts.

        Keys: derived from ORIGINAL slot + widget.type via nodeKey().
          Stable across re-renders AND across collision relocation — a scoreboard
          originally assigned top-center keeps key "top-center::scoreboard" even
          if it gets relocated to top-left by the resolver. This ensures relocation
          is a CSS-only update: the component stays mounted, position changes
          smoothly without re-mounting the Framer Motion tree.

        Stagger: each widget receives an entrance delay of index * STAGGER_DELAY
          (seconds) so the composition assembles one piece at a time instead of
          popping all at once. Sorting by zIndex first means the bottom-layer
          widget (background context) enters before the accent widgets layered on
          top, which feels intentional.

        Collision resolver:
          Phase 1 (deduplicateSlots): same-slot conflicts resolved by priority
          (alert > scoreboard > timer > statpanel). Lower-priority widget is
          relocated to the nearest free slot before first render.

          Phase 2 (useLayoutEffect measure pass): after widgets paint, rects are
          measured, pairwise intersections detected, and lower-priority widgets
          are either relocated to a clean free slot or vertically stacked within
          their horizontal band. The PlacementMap drives final CSS.

        Center no-go zone:
          The central 40% of the video rect (both width and height) is excluded
          from all slot candidates during relocation. Widgets that land in the
          center zone due to the model's original assignment are relocated first.
      */}
      <AnimatePresence mode="popLayout">
        {deduplicatedNodes.map((node, index) => {
          const WidgetComponent = getWidget(node.widget.type)

          // Skip nodes whose widget type is not in the registry (graceful per-node fallback).
          if (!WidgetComponent) {
            console.warn('[overlai] Unknown widget type in layout node:', node.widget.type)
            return null
          }

          const key = nodeKey(node)

          // Look up resolved placement from the measure pass.
          // Falls back to the node's (deduplicated) slot with no offset on first render.
          const placement = placements.get(key)
          const resolvedSlot = (placement?.slot ?? node.slot) as Slot
          const offsetY = placement?.offsetY ?? 0

          const style = slotStyle(resolvedSlot, effectiveRect, offsetY)

          return (
            <div
              key={key}
              ref={(el) => {
                if (el) widgetRefs.current.set(key, el)
                else widgetRefs.current.delete(key)
              }}
              style={{ ...style, zIndex: node.zIndex ?? 10 }}
            >
              <WidgetComponent data={node.widget} delay={index * STAGGER_DELAY} />
            </div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
