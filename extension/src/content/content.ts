// Content script: injects the Overlai overlay React root over the page <video>.
// This runs in the context of every page matched by manifest content_scripts.

import React from 'react'
import ReactDOM from 'react-dom/client'
import { Overlay } from './Overlay'

function mount() {
  // Avoid double-mounting
  if (document.getElementById('overlai-root')) return

  const container = document.createElement('div')
  container.id = 'overlai-root'
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483647;
  `
  document.body.appendChild(container)

  const root = ReactDOM.createRoot(container)
  root.render(React.createElement(Overlay))
}

// Mount immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount)
} else {
  mount()
}
