import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Klai — Privacy Policy',
  description:
    'Privacy policy for the Klai browser extension: what data it processes, how, and your choices.',
}

const SUPPORT_EMAIL = 'kirabelak+helpdesk@kirabel.com'
const LAST_UPDATED = 'June 20, 2026'

const sectionStyle: React.CSSProperties = { marginBottom: 36 }
const h2Style: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  margin: '0 0 12px',
  color: '#0a0a0e',
}
const pStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.7,
  color: '#3f3f46',
  margin: '0 0 12px',
}
const liStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.7,
  color: '#3f3f46',
  marginBottom: 8,
}

export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '64px 24px 96px',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: '0 0 8px', color: '#0a0a0e' }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 15, color: '#71717a', margin: 0 }}>
          Klai browser extension — last updated {LAST_UPDATED}
        </p>
      </header>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Overview</h2>
        <p style={pStyle}>
          Klai is a browser extension that generates informative overlay widgets
          on top of the video you are watching, based on requests you make by
          voice or text. This policy explains what data Klai processes, why, and
          the choices you have. We designed Klai to process only what is needed to
          answer your request.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>What data we process</h2>
        <ul style={{ paddingLeft: 22, margin: 0 }}>
          <li style={liStyle}>
            <strong>Your request:</strong> the text you type, or the transcribed
            text of what you say. Voice is transcribed by your browser; Klai
            receives only the resulting text.
          </li>
          <li style={liStyle}>
            <strong>A captured frame of the visible tab:</strong> when you submit a
            request or enable Watch mode, Klai captures an image of the currently
            visible tab so the AI can understand the on-screen context and answer
            your request.
          </li>
          <li style={liStyle}>
            <strong>Your Watch mode preference:</strong> stored locally in your
            browser so the setting is remembered. It is not transmitted to us.
          </li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>How we use it</h2>
        <p style={pStyle}>
          Your request text and the captured frame are sent to the Klai service
          solely to generate the requested widget and return it to your browser.
          Capture occurs only when you actively submit a request or enable Watch
          mode — Klai does not continuously record your screen.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Third-party processing</h2>
        <p style={pStyle}>
          To interpret your request and the captured frame, the Klai service sends
          this data to a third-party AI provider (Anthropic, the provider of the
          Claude models) for processing. This data is used only to produce your
          response. We do not use it for advertising and we do not sell it.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>What we do not do</h2>
        <ul style={{ paddingLeft: 22, margin: 0 }}>
          <li style={liStyle}>We do not sell your data to anyone.</li>
          <li style={liStyle}>
            We do not collect your browsing history or track the sites you visit.
          </li>
          <li style={liStyle}>
            We do not use your data for advertising or for any purpose unrelated to
            answering your request.
          </li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Data retention</h2>
        <p style={pStyle}>
          Captured frames and request text are processed to generate your response
          and are not retained to build a profile of you. Your Watch mode
          preference remains in your browser&apos;s local storage until you change
          it or remove the extension.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Your choices</h2>
        <ul style={{ paddingLeft: 22, margin: 0 }}>
          <li style={liStyle}>
            Klai only captures a frame when you submit a request or enable Watch
            mode. Leave Watch mode off to avoid automatic captures.
          </li>
          <li style={liStyle}>
            You can remove the extension at any time from your browser&apos;s
            extensions page, which stops all processing and clears its local
            storage.
          </li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Contact</h2>
        <p style={pStyle}>
          Questions about this policy? Contact us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: '#2563eb', fontWeight: 600 }}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Changes to this policy</h2>
        <p style={pStyle}>
          We may update this policy as the extension evolves. Material changes will
          be reflected on this page with an updated date.
        </p>
      </section>
    </main>
  )
}
