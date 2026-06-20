# Overlai — Project Plan

> Voice-driven generative overlay engine for live video, shipped as a Chrome extension.
> Hackathon track: **New Interface**.

---

## 1. Product (one-liner)

**Overlai** is an open-source Chrome extension. While you watch a live football match
(YouTube, a stream, any `<video>`), you speak your intent — *"who's winning?"*,
*"show me shots on target"*, *"put a 10-minute timer"* — and beautiful animated widgets
are **generated on the fly** and composited live over the video.

The interface is not buttons or menus. **Your intent generates the UI.**

### The pitch (memorize this)

> "Everyone lets you *ask* an assistant. We let your intent *build the interface*.
> You talk, and live data paints itself over what you're watching — no setup, no menus."

### Why it fits "New Interface"

The interface materializes from intent. There is no fixed UI to navigate — each
spoken request fabricates the exact widget needed, animated, over live content.

---

## 2. Rubric mapping (target: maximize technical + execution)

| Criterion        | Weight | How Overlai wins it |
|------------------|--------|---------------------|
| Technical aspect | 25     | LLM structured output → validated schema → component registry → animated render. Real generative-UI pipeline, not a chatbot. |
| Ambition         | 20     | "The UI builds itself" is a big claim, demoed live. |
| Execution        | 20     | Data from a reliable football API (never wrong on stage). 4-5 rock-solid widgets. |
| Impact           | 20     | Anyone watching sports gets a personal, hands-free, live data layer. |
| Originality      | 15     | Not "chat with video" — the interface itself is generated per intent. |

**Strategic rule:** technical (25) + execution (20) = 45 points. A demo that ALWAYS
works beats an ambitious demo that breaks. Reliability is the priority.

---

## 3. Core architecture

```
EXTENSION (over the <video>)
🎤 Web Speech API → text
        ↓  POST to our backend
BACKEND (Next.js API on Vercel — holds the keys)
🧠 Claude (structured output / tool use)
        ↓  decides: simple widget OR needs live data?
        ↓  (if football) ⚽ API-Football → real score/stats/events
        ↓
✅ Zod validates the schema
        ↓  returns schema to the extension
EXTENSION
🎨 ComponentRegistry: schema.type → React widget
        ↓
✨ Framer Motion animates it over the <video>
```

### The key concept (the 80% of the value)

The LLM **does NOT write raw HTML**. It picks a widget `type` from a fixed registry and
fills its data. Our hand-built, animated components render that data.

```
Claude picks type + fills data   →   Zod validates   →   registry → our widget   →   Framer Motion
(the unpredictable part: AI)         (safety net)        (controlled, beautiful: us)
```

This gives flexibility (ask anything) AND reliability + beauty (curated components).

### Key handling: own backend (not BYOK)

A thin backend (Next.js API on Vercel) holds the Anthropic and football API keys.
The extension never sees a secret; it calls our endpoint, which calls Claude +
API-Football and returns the validated schema. Judges install and it "just works" —
no key pasting. Cost is ours, so we rate-limit and cache the demo match.

### Football data: API, not vision

We do **NOT** try to make the AI "watch" the match. The user names the match
("Madrid vs Barça") or we infer from the page; Claude queries **API-Football** for the
exact live score, events, and stats. Accurate, instant, never wrong on stage.

- Primary: **API-Football** (api-football.com) — live scores, events, stats. Free tier ~100 req/day.
- Fallback: **football-data.org** — simpler, generous free tier.

---

## 4. Tech stack

| Layer        | Tech                          | Why |
|--------------|-------------------------------|-----|
| Platform     | Chrome Extension (Manifest V3)| The product itself |
| Build        | Vite + CRXJS                  | Modern React-in-extension bundling |
| UI           | React + TypeScript            | Component registry |
| Styles       | Tailwind CSS                  | Fast, clean |
| Animation    | Framer Motion (+ Lottie opt.) | The "sexy", in-browser, zero added latency |
| Voice        | Web Speech API                | Native, free, in-browser |
| Brain        | Claude (`claude-haiku-4-5` for latency, `claude-sonnet-4-6` for reasoning) via structured output | text → schema |
| Validation   | Zod                           | Guards LLM output before render |
| Data         | API-Football (REST)           | Reliable live match data |
| Backend      | **Next.js API on Vercel**     | Holds keys, proxies Claude + football, returns schema |
| Key handling | Keys live server-side; extension never sees a secret | Zero-friction install for judges |
| Distribution | Chrome Web Store + GitHub (MIT)| "Deployed" + open source |

**Own backend.** Keys stay server-side so judges install and it just works; we
rate-limit + cache to control cost.

---

## 5. Folder structure

```
overlai/
├── extension/                   # the Chrome extension (what the user installs)
│   ├── manifest.json            # Manifest V3
│   ├── vite.config.ts           # Vite + CRXJS
│   ├── package.json
│   └── src/
│       ├── content/
│       │   ├── content.ts       # inject overlay layer over the <video>
│       │   └── Overlay.tsx      # React root of the overlay
│       ├── popup/
│       │   └── Popup.tsx        # voice button + command log
│       ├── background/
│       │   └── service-worker.ts# calls the backend, relays schema
│       ├── widgets/             # ❤️ the hand-built animated components
│       │   ├── Scoreboard.tsx
│       │   ├── Timer.tsx
│       │   ├── StatPanel.tsx
│       │   └── Alert.tsx
│       └── lib/
│           ├── registry.ts      # schema.type → widget component
│           ├── schema.ts        # Zod schemas (shared shape with backend)
│           └── voice.ts         # Web Speech API wrapper
│
├── backend/                     # Next.js API on Vercel (holds the keys)
│   ├── app/api/generate/route.ts# text → Claude → (football) → schema
│   ├── lib/
│   │   ├── claude.ts            # Claude client (server-side key)
│   │   ├── football.ts          # API-Football client
│   │   └── schema.ts            # Zod schemas (shared shape with extension)
│   └── package.json
│
├── README.md                    # demo GIF + setup (key for OSS judging)
└── PLAN.md                      # this file
```

---

## 6. MVP scope (what we actually build & demo)

### IN (must work 100%)
- [ ] Backend `/api/generate` on Vercel with Anthropic + football keys server-side
- [ ] Voice capture (Web Speech API) + text fallback
- [ ] Claude structured-output call → validated widget schema (Zod)
- [ ] Component registry + 4 widgets: **Scoreboard, Timer, StatPanel, Alert**
- [ ] Overlay injected over any page `<video>`, draggable, dismissible
- [ ] Framer Motion entrance/exit animations on every widget
- [ ] API-Football integration for live score + basic stats
- [ ] One end-to-end happy path: *"who's winning Madrid vs Barça?"* → animated Scoreboard

### OUT (stretch / post-MVP)
- Computer vision on the video ("AI reads the screen") — risky, only if time remains
- Auto-detect the match from page context
- More widgets (timeline, lineup, heatmap)
- Multi-language voice
- Settings for widget themes/positions

---

## 7. Build phases (ordered for a hackathon)

**Phase 0 — Scaffold (foundation)**
1. `extension/`: Vite + CRXJS + React + TS + Tailwind
2. `manifest.json` (V3): content script, popup, service worker
3. `backend/`: Next.js app with `/api/generate` stub, deploy to Vercel
4. Load unpacked in Chrome, verify popup + overlay div inject over a YouTube video

**Phase 1 — The one vertical slice (prove the loop)**
5. `voice.ts` → capture speech → text
6. Backend `/api/generate`: Claude structured output → ONE schema (Scoreboard)
7. `schema.ts` + Zod validation (shared shape extension ↔ backend)
8. `registry.ts` + `Scoreboard.tsx` with Framer Motion
9. **Milestone: speak → animated scoreboard appears over the video** ✅

**Phase 2 — Real data**
10. `football.ts` → API-Football live score
11. Claude decides when to call football data vs static widget
12. Wire real score into Scoreboard

**Phase 3 — Breadth (copy the pattern)**
13. Add Timer, StatPanel, Alert widgets (same registry pattern)
14. Polish animations, glassmorphism, drag/dismiss

**Phase 4 — Ship & demo**
15. README with demo GIF, MIT license
16. Record the 30s demo clip
17. (Optional) submit to Chrome Web Store

---

## 8. The demo script (the 30-second clip)

1. Open a live football match on YouTube. Plain video, nothing on it.
2. Click the Overlai mic. Say: *"who's winning?"*
3. An animated **Scoreboard** springs in with the real live score.
4. Say: *"show me shots on target."* A **StatPanel** morphs in.
5. Say: *"start a 10-minute timer."* A neon **Timer** counts down.
6. Tagline on screen: *"You didn't configure any of this. You asked, and the interface built itself."*

---

## 9. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Latency feels slow (voice→LLM→render) | Use `claude-haiku-4-5`; show "listening… / building…" states; pre-warm |
| LLM returns invalid schema | Zod validation + a safe fallback widget |
| Football API rate limits on stage | Cache last response; pre-fetch the demo match before judging |
| Web Speech API flakiness on stage | Text input fallback always available |
| Scope creep (we know the pattern) | Lock MVP to 4 widgets; vision is OUT unless everything else is done |

---

## 10. Open decisions / next step

- Final product name (Overlai is a placeholder)
- Confirm API-Football vs football-data.org based on free-tier limits at build time
- Backend decision: **own backend** (Next.js on Vercel, keys server-side) — confirmed
- Next action: **scaffold Phase 0** — backend (`/api/generate`) + extension (Vite + CRXJS + Manifest V3 + Tailwind), then build the Phase 1 vertical slice.
