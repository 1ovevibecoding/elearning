/* ============================================================
   English Tutor – Background Service Worker (Manifest V3)
   Handles: dictionary lookups, backend API calls, auth tokens
   ============================================================ */

const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const DEFAULT_BACKEND = 'http://localhost:8000';

/**
 * Retrieve the backend base URL (configurable via storage).
 */
async function getBackendUrl() {
  const { backendUrl } = await chrome.storage.local.get('backendUrl');
  return backendUrl || DEFAULT_BACKEND;
}

/**
 * Retrieve the stored auth token.
 */
async function getAuthToken() {
  const { authToken } = await chrome.storage.local.get('authToken');
  return authToken || null;
}

/**
 * Build standard headers for backend requests.
 */
async function buildHeaders() {
  const token = await getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/* ---- Message Handlers ---- */

async function handleGetDefinition(word) {
  const url = `${DICTIONARY_API}/${encodeURIComponent(word.toLowerCase().trim())}`;
  const response = await fetch(url);

  if (!response.ok) {
    return { success: false, error: 'Word not found' };
  }

  const data = await response.json();
  const entry = data[0];

  // Extract the most useful information
  const phonetic =
    entry.phonetic ||
    (entry.phonetics && entry.phonetics.find((p) => p.text)?.text) ||
    '';

  const meanings = (entry.meanings || []).map((m) => ({
    partOfSpeech: m.partOfSpeech,
    definitions: (m.definitions || []).slice(0, 2).map((d) => ({
      definition: d.definition,
      example: d.example || null,
    })),
  }));

  return {
    success: true,
    data: {
      word: entry.word,
      phonetic,
      meanings,
    },
  };
}

async function handleSaveWord(payload) {
  const backendUrl = await getBackendUrl();
  const headers = await buildHeaders();
  const token = await getAuthToken();

  if (!token) {
    return { success: false, error: 'Not authenticated. Please log in first.' };
  }

  try {
    const response = await fetch(`${backendUrl}/api/vocabulary`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        word: payload.word,
        definition: payload.definition,
        phonetic: payload.phonetic || '',
        partOfSpeech: payload.partOfSpeech || '',
        example: payload.example || '',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        error: errorData?.detail || errorData?.message || `Server error (${response.status})`,
      };
    }

    const result = await response.json();

    // Also cache in recent words
    await addToRecentWords({
      word: payload.word,
      definition: payload.definition,
      savedAt: new Date().toISOString(),
    });

    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: 'Could not connect to server.' };
  }
}

async function handleGetRecentWords() {
  const { recentWords } = await chrome.storage.local.get('recentWords');
  return { success: true, data: recentWords || [] };
}

async function addToRecentWords(entry) {
  const { recentWords } = await chrome.storage.local.get('recentWords');
  const list = recentWords || [];

  // Remove duplicate if exists
  const filtered = list.filter(
    (w) => w.word.toLowerCase() !== entry.word.toLowerCase()
  );

  // Prepend and keep last 20
  filtered.unshift(entry);
  const trimmed = filtered.slice(0, 20);

  await chrome.storage.local.set({ recentWords: trimmed });
}

/* ---- Message Router ---- */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { action, payload } = message;

  const handleAsync = async () => {
    switch (action) {
      case 'getDefinition':
        return await handleGetDefinition(payload.word);

      case 'saveWord':
        return await handleSaveWord(payload);

      case 'getAuthToken':
        const token = await getAuthToken();
        return { success: true, token };

      case 'setAuthToken':
        await chrome.storage.local.set({ authToken: payload.token });
        return { success: true };

      case 'removeAuthToken':
        await chrome.storage.local.remove('authToken');
        await chrome.storage.local.remove('recentWords');
        return { success: true };

      case 'getRecentWords':
        return await handleGetRecentWords();

      case 'setBackendUrl':
        await chrome.storage.local.set({ backendUrl: payload.url });
        return { success: true };

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  };

  handleAsync()
    .then(sendResponse)
    .catch((err) => sendResponse({ success: false, error: err.message }));

  // Return true to keep the message channel open for async response
  return true;
});

/* ---- Extension Install ---- */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('English Tutor extension installed.');
  }
});
