/* ============================================================
   English Tutor – Popup Script
   Auth management, quick save, recent words display
   ============================================================ */

(() => {
  'use strict';

  /* ---- DOM References ---- */
  const $ = (sel) => document.querySelector(sel);

  const authSection    = $('#authSection');
  const loggedInSection = $('#loggedInSection');
  const popupFooter    = $('#popupFooter');
  const statusBadge    = $('#statusBadge');

  // Auth
  const tokenInput     = $('#tokenInput');
  const saveTokenBtn   = $('#saveTokenBtn');
  const authError      = $('#authError');

  // User
  const userAvatar     = $('#userAvatar');
  const userName       = $('#userName');

  // Save form
  const saveForm       = $('#saveForm');
  const wordInput      = $('#wordInput');
  const definitionInput = $('#definitionInput');
  const saveWordBtn    = $('#saveWordBtn');
  const saveSuccess    = $('#saveSuccess');
  const saveFormError  = $('#saveFormError');

  // Recent
  const recentList     = $('#recentList');

  // Footer
  const openWebApp     = $('#openWebApp');
  const logoutBtn      = $('#logoutBtn');

  /* ---- Helpers ---- */

  function showEl(el)  { el.classList.remove('hidden'); }
  function hideEl(el)  { el.classList.add('hidden'); }

  function sendMsg(action, payload = {}) {
    return chrome.runtime.sendMessage({ action, payload });
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function flashMessage(el, text, duration = 3000) {
    el.textContent = text;
    showEl(el);
    setTimeout(() => hideEl(el), duration);
  }

  /* ---- State Management ---- */

  async function checkAuth() {
    const res = await sendMsg('getAuthToken');
    const token = res?.token;

    if (token) {
      showLoggedInUI(token);
    } else {
      showLoggedOutUI();
    }
  }

  function showLoggedOutUI() {
    showEl(authSection);
    hideEl(loggedInSection);
    hideEl(popupFooter);
    hideEl(statusBadge);
  }

  function showLoggedInUI(token) {
    hideEl(authSection);
    showEl(loggedInSection);
    showEl(popupFooter);
    showEl(statusBadge);

    // Try to extract user info from JWT (basic decode of payload)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const name = payload.name || payload.username || payload.email || 'User';
      userName.textContent = name;
      userAvatar.textContent = name.charAt(0).toUpperCase();
    } catch {
      userName.textContent = 'User';
      userAvatar.textContent = 'U';
    }

    loadRecentWords();
  }

  /* ---- Auth Handlers ---- */

  saveTokenBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();

    if (!token) {
      flashMessage(authError, 'Please paste a valid token.');
      return;
    }

    if (token.length < 10) {
      flashMessage(authError, 'Token seems too short. Please check and try again.');
      return;
    }

    saveTokenBtn.disabled = true;
    saveTokenBtn.textContent = '…';

    try {
      await sendMsg('setAuthToken', { token });
      showLoggedInUI(token);
    } catch (err) {
      flashMessage(authError, 'Failed to save token.');
    } finally {
      saveTokenBtn.disabled = false;
      saveTokenBtn.textContent = 'Save';
    }
  });

  // Allow Enter key in token input
  tokenInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTokenBtn.click();
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await sendMsg('removeAuthToken');
    tokenInput.value = '';
    showLoggedOutUI();
  });

  /* ---- Quick Save ---- */

  saveForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const word = wordInput.value.trim();
    const definition = definitionInput.value.trim();

    if (!word || !definition) return;

    saveWordBtn.disabled = true;
    saveWordBtn.textContent = 'Saving…';
    hideEl(saveSuccess);
    hideEl(saveFormError);

    try {
      const res = await sendMsg('saveWord', { word, definition });

      if (res?.success) {
        flashMessage(saveSuccess, '✓ Word saved to vocabulary!', 3000);
        wordInput.value = '';
        definitionInput.value = '';
        loadRecentWords();
      } else {
        flashMessage(saveFormError, res?.error || 'Failed to save word.', 4000);
      }
    } catch (err) {
      flashMessage(saveFormError, 'Connection error. Is the server running?', 4000);
    } finally {
      saveWordBtn.disabled = false;
      saveWordBtn.textContent = 'Save Word';
    }
  });

  /* ---- Recent Words ---- */

  async function loadRecentWords() {
    const res = await sendMsg('getRecentWords');
    const words = res?.data || [];
    const display = words.slice(0, 5);

    if (display.length === 0) {
      recentList.innerHTML = '<li class="empty-state">No words saved yet. Double-click any word on a webpage to look it up!</li>';
      return;
    }

    recentList.innerHTML = display
      .map(
        (w) => `
          <li class="recent-item">
            <span class="recent-word">${escapeHTML(w.word)}</span>
            <span class="recent-def">${escapeHTML(w.definition)}</span>
          </li>
        `
      )
      .join('');
  }

  /* ---- Open Web App ---- */

  openWebApp.addEventListener('click', (e) => {
    e.preventDefault();
    // Use the configured backend URL or default
    chrome.storage.local.get('backendUrl', ({ backendUrl }) => {
      const url = backendUrl || 'http://localhost:8000';
      chrome.tabs.create({ url });
    });
  });

  /* ---- Init ---- */
  checkAuth();
})();
