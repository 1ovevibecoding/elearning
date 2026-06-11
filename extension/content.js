/* ============================================================
   English Tutor – Content Script
   Double-click word lookup with Shadow DOM tooltip
   ============================================================ */

(() => {
  'use strict';

  /* ---- State ---- */
  let tooltipHost = null;
  let shadowRoot = null;

  /* ---- Tooltip Styles (injected into Shadow DOM) ---- */
  const TOOLTIP_STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :host {
      all: initial;
      position: absolute;
      z-index: 2147483647;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1A1A1A;
      -webkit-font-smoothing: antialiased;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .tooltip {
      width: 320px;
      max-height: 420px;
      overflow-y: auto;
      background: #FFFFFF;
      border: 1px solid #E8E5E0;
      border-radius: 10px;
      box-shadow: 0 8px 30px rgba(0,0,0,.10), 0 1px 3px rgba(0,0,0,.04);
      padding: 0;
      animation: tooltipIn 0.18s ease-out;
    }

    .tooltip::-webkit-scrollbar {
      width: 5px;
    }
    .tooltip::-webkit-scrollbar-track {
      background: transparent;
    }
    .tooltip::-webkit-scrollbar-thumb {
      background: #D5D2CC;
      border-radius: 4px;
    }

    @keyframes tooltipIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Header */
    .tooltip-header {
      padding: 16px 18px 12px;
      border-bottom: 1px solid #E8E5E0;
    }

    .word-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #1A1A1A;
    }

    .phonetic {
      font-size: 13px;
      color: #6B6B6B;
      margin-top: 2px;
      font-style: italic;
    }

    /* Body */
    .tooltip-body {
      padding: 14px 18px;
    }

    .meaning-block + .meaning-block {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid #F0EEEA;
    }

    .pos-label {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #2563EB;
      background: #EFF6FF;
      padding: 2px 8px;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .definition-text {
      font-size: 13px;
      color: #1A1A1A;
      line-height: 1.55;
    }

    .definition-item + .definition-item {
      margin-top: 10px;
    }

    .example-text {
      font-size: 12px;
      color: #6B6B6B;
      font-style: italic;
      margin-top: 4px;
      padding-left: 10px;
      border-left: 2px solid #E8E5E0;
    }

    /* Footer */
    .tooltip-footer {
      padding: 12px 18px;
      border-top: 1px solid #E8E5E0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .save-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 7px 14px;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: #FFFFFF;
      background: #2563EB;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.1s ease;
      line-height: 1;
    }
    .save-btn:hover {
      background: #1D4ED8;
    }
    .save-btn:active {
      transform: scale(0.97);
    }
    .save-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .save-btn.saved {
      background: #16A34A;
    }

    .close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: transparent;
      border: 1px solid #E8E5E0;
      border-radius: 6px;
      cursor: pointer;
      color: #6B6B6B;
      font-size: 14px;
      transition: all 0.12s ease;
      line-height: 1;
      font-family: 'Inter', sans-serif;
    }
    .close-btn:hover {
      background: #F5F4F1;
      color: #1A1A1A;
    }

    /* Loading */
    .loading {
      padding: 32px 18px;
      text-align: center;
      color: #6B6B6B;
      font-size: 13px;
    }

    .spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid #E8E5E0;
      border-top-color: #2563EB;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-bottom: 10px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Error */
    .error-state {
      padding: 24px 18px;
      text-align: center;
    }

    .error-icon {
      font-size: 24px;
      margin-bottom: 8px;
    }

    .error-text {
      font-size: 13px;
      color: #6B6B6B;
    }

    /* Status message */
    .save-status {
      font-size: 11px;
      color: #6B6B6B;
      flex: 1;
      text-align: right;
    }
    .save-status.success { color: #16A34A; }
    .save-status.error   { color: #DC2626; }
  `;

  /* ---- Helpers ---- */

  function isValidWord(text) {
    if (!text || text.length < 2 || text.length > 40) return false;
    return /^[a-zA-Z'-]+$/.test(text.trim());
  }

  function removeTooltip() {
    if (tooltipHost) {
      tooltipHost.remove();
      tooltipHost = null;
      shadowRoot = null;
    }
  }

  function positionTooltip(host, mouseX, mouseY) {
    const pad = 12;
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const tooltipW = 320;
    const tooltipH = 300; // estimate

    let left = mouseX + scrollX + pad;
    let top = mouseY + scrollY + pad;

    // Prevent overflow right
    if (mouseX + tooltipW + pad > viewW) {
      left = mouseX + scrollX - tooltipW - pad;
    }
    // Prevent overflow bottom
    if (mouseY + tooltipH + pad > viewH) {
      top = mouseY + scrollY - tooltipH - pad;
    }

    // Clamp
    left = Math.max(scrollX + 8, left);
    top = Math.max(scrollY + 8, top);

    host.style.left = `${left}px`;
    host.style.top = `${top}px`;
  }

  /* ---- Build Tooltip Content ---- */

  function buildLoadingHTML() {
    return `
      <div class="loading">
        <div class="spinner"></div>
        <div>Looking up word…</div>
      </div>
    `;
  }

  function buildErrorHTML(word) {
    return `
      <div class="tooltip-header">
        <div class="word-title">${escapeHTML(word)}</div>
      </div>
      <div class="error-state">
        <div class="error-icon">📖</div>
        <div class="error-text">No definition found for this word.</div>
      </div>
      <div class="tooltip-footer">
        <span></span>
        <button class="close-btn" data-action="close" title="Close">✕</button>
      </div>
    `;
  }

  function buildDefinitionHTML(data) {
    const { word, phonetic, meanings } = data;

    let meaningsHTML = '';
    // Pick the first meaning for saving
    let primaryDef = '';
    let primaryPos = '';
    let primaryExample = '';

    meanings.forEach((m, i) => {
      const defsHTML = m.definitions
        .map((d) => {
          if (i === 0 && !primaryDef) {
            primaryDef = d.definition;
            primaryPos = m.partOfSpeech;
            primaryExample = d.example || '';
          }
          return `
            <div class="definition-item">
              <div class="definition-text">${escapeHTML(d.definition)}</div>
              ${d.example ? `<div class="example-text">"${escapeHTML(d.example)}"</div>` : ''}
            </div>
          `;
        })
        .join('');

      meaningsHTML += `
        <div class="meaning-block">
          <span class="pos-label">${escapeHTML(m.partOfSpeech)}</span>
          ${defsHTML}
        </div>
      `;
    });

    return {
      html: `
        <div class="tooltip-header">
          <div class="word-title">${escapeHTML(word)}</div>
          ${phonetic ? `<div class="phonetic">${escapeHTML(phonetic)}</div>` : ''}
        </div>
        <div class="tooltip-body">
          ${meaningsHTML}
        </div>
        <div class="tooltip-footer">
          <button class="save-btn" data-action="save"
                  data-word="${escapeAttr(word)}"
                  data-definition="${escapeAttr(primaryDef)}"
                  data-pos="${escapeAttr(primaryPos)}"
                  data-phonetic="${escapeAttr(phonetic)}"
                  data-example="${escapeAttr(primaryExample)}">
            <span>＋</span> Save to Vocabulary
          </button>
          <span class="save-status"></span>
          <button class="close-btn" data-action="close" title="Close">✕</button>
        </div>
      `,
      primaryDef,
      primaryPos,
      primaryExample,
    };
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ---- Core: Show Tooltip ---- */

  async function showTooltip(word, mouseX, mouseY) {
    removeTooltip();

    // Create Shadow DOM host
    tooltipHost = document.createElement('english-tutor-tooltip');
    tooltipHost.style.position = 'absolute';
    tooltipHost.style.zIndex = '2147483647';
    document.body.appendChild(tooltipHost);

    shadowRoot = tooltipHost.attachShadow({ mode: 'closed' });

    // Inject styles
    const style = document.createElement('style');
    style.textContent = TOOLTIP_STYLES;
    shadowRoot.appendChild(style);

    // Container
    const container = document.createElement('div');
    container.className = 'tooltip';
    container.innerHTML = buildLoadingHTML();
    shadowRoot.appendChild(container);

    // Position
    positionTooltip(tooltipHost, mouseX, mouseY);

    // Fetch definition
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'getDefinition',
        payload: { word },
      });

      if (!result || !result.success) {
        container.innerHTML = buildErrorHTML(word);
      } else {
        const { html } = buildDefinitionHTML(result.data);
        container.innerHTML = html;
      }
    } catch (err) {
      container.innerHTML = buildErrorHTML(word);
    }

    // Re-position after content loads (may have changed height)
    requestAnimationFrame(() => {
      positionTooltip(tooltipHost, mouseX, mouseY);
    });

    // Event delegation inside shadow root
    container.addEventListener('click', async (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.dataset.action;

      if (action === 'close') {
        removeTooltip();
        return;
      }

      if (action === 'save') {
        const btn = target;
        const statusEl = container.querySelector('.save-status');
        btn.disabled = true;
        btn.textContent = 'Saving…';

        try {
          const res = await chrome.runtime.sendMessage({
            action: 'saveWord',
            payload: {
              word: btn.dataset.word,
              definition: btn.dataset.definition,
              partOfSpeech: btn.dataset.pos,
              phonetic: btn.dataset.phonetic,
              example: btn.dataset.example,
            },
          });

          if (res && res.success) {
            btn.textContent = '✓ Saved';
            btn.classList.add('saved');
            if (statusEl) {
              statusEl.textContent = 'Added to vocabulary';
              statusEl.className = 'save-status success';
            }
          } else {
            btn.disabled = false;
            btn.innerHTML = '<span>＋</span> Save to Vocabulary';
            if (statusEl) {
              statusEl.textContent = res?.error || 'Failed to save';
              statusEl.className = 'save-status error';
            }
          }
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = '<span>＋</span> Save to Vocabulary';
          if (statusEl) {
            statusEl.textContent = 'Connection error';
            statusEl.className = 'save-status error';
          }
        }
      }
    });
  }

  /* ---- Event Listeners ---- */

  document.addEventListener('dblclick', (e) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (!isValidWord(text)) return;

    // Don't trigger inside our own tooltip
    if (e.target.closest && e.target.closest('english-tutor-tooltip')) return;

    showTooltip(text, e.clientX, e.clientY);
  });

  document.addEventListener('click', (e) => {
    if (!tooltipHost) return;

    // Check if click is inside our tooltip's shadow DOM host
    if (tooltipHost.contains(e.target) || e.target === tooltipHost) return;

    // Also check composed path for Shadow DOM
    const path = e.composedPath();
    if (path.includes(tooltipHost)) return;

    removeTooltip();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      removeTooltip();
    }
  });
})();
