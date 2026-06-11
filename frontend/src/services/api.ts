import type {
  AuthResponse,
  User,
  Vocabulary,
  VocabularyCreate,
  PaginatedResponse,
  Flashcard,
  FlashcardStats,
  ReviewPayload,
  ChatSession,
  ChatMessage,
} from '../types';

// ── Helpers ──────────────────────────────────────────

const TOKEN_KEY = 'auth_token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw { detail: body.detail ?? res.statusText, status: res.status };
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

// ── Auth ─────────────────────────────────────────────

export async function devLogin(): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/dev/login', { method: 'POST' });
}

export async function getMe(): Promise<User> {
  return request<User>('/auth/me');
}

// ── Vocabulary ───────────────────────────────────────

export async function getVocabulary(
  page = 1,
  pageSize = 20,
  search = '',
): Promise<PaginatedResponse<Vocabulary>> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (search) params.set('search', search);
  return request<PaginatedResponse<Vocabulary>>(`/api/vocabulary?${params}`);
}

export async function createVocabulary(
  data: VocabularyCreate,
): Promise<Vocabulary> {
  return request<Vocabulary>('/api/vocabulary', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateVocabulary(
  id: string,
  data: Partial<VocabularyCreate>,
): Promise<Vocabulary> {
  return request<Vocabulary>(`/api/vocabulary/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteVocabulary(id: string): Promise<void> {
  return request<void>(`/api/vocabulary/${id}`, { method: 'DELETE' });
}

// ── Flashcards ───────────────────────────────────────

export async function getDueFlashcards(): Promise<Flashcard[]> {
  return request<Flashcard[]>('/api/flashcards/due');
}

export async function createFlashcard(vocabularyId: string): Promise<Flashcard> {
  return request<Flashcard>(`/api/flashcards/create/${vocabularyId}`, {
    method: 'POST',
  });
}

export async function reviewFlashcard(
  id: string,
  payload: ReviewPayload,
): Promise<Flashcard> {
  return request<Flashcard>(`/api/flashcards/${id}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getFlashcardStats(): Promise<FlashcardStats> {
  return request<FlashcardStats>('/api/flashcards/stats');
}

// ── Chat ─────────────────────────────────────────────

export async function createChatSession(): Promise<ChatSession> {
  return request<ChatSession>('/api/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getChatSessions(): Promise<ChatSession[]> {
  return request<ChatSession[]>('/api/chat/sessions');
}

export async function getChatMessages(
  sessionId: string,
): Promise<ChatMessage[]> {
  return request<ChatMessage[]>(`/api/chat/sessions/${sessionId}/messages`);
}

export async function sendChatMessage(
  sessionId: string,
  message: string,
): Promise<ChatMessage> {
  return request<ChatMessage>(`/api/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  return request<void>(`/api/chat/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

/**
 * Stream chat response via SSE.
 * Returns a cleanup function to abort.
 */
export function streamChatMessage(
  sessionId: string,
  message: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: unknown) => void,
): () => void {
  const controller = new AbortController();
  const token = getToken();

  fetch(`/api/chat/sessions/${sessionId}/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(res.statusText);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) {
                onDone();
                return;
              }
              if (data.content) {
                onChunk(data.content);
              }
              if (data.error) {
                onError(new Error(data.error));
                return;
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
      onDone();
    })
    .catch((err) => {
      if ((err as Error).name !== 'AbortError') onError(err);
    });

  return () => controller.abort();
}

// ── Grammar ──────────────────────────────────────────

export async function checkGrammar(
  text: string,
): Promise<import('../types').GrammarCheckResponse> {
  return request<import('../types').GrammarCheckResponse>('/api/grammar/check', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

// ── Calendar ─────────────────────────────────────────

export async function getSharedEvents(
  start: string,
  end: string,
): Promise<import('../types').CalendarEventResponse[]> {
  const params = new URLSearchParams({ start, end });
  return request<import('../types').CalendarEventResponse[]>(`/api/calendar/shared?${params}`);
}

export async function createCalendarEvent(
  data: import('../types').CalendarEventCreate,
): Promise<import('../types').CalendarEventResponse> {
  return request<import('../types').CalendarEventResponse>('/api/calendar/events', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  return request<void>(`/api/calendar/events/${id}`, { method: 'DELETE' });
}

// ── Stats ────────────────────────────────────────────

export async function getActivity(): Promise<{ date: string; count: number }[]> {
  return request<{ date: string; count: number }[]>('/api/stats/activity');
}

export async function getStreak(): Promise<{ current_streak: number; total_active_days: number }> {
  return request<{ current_streak: number; total_active_days: number }>('/api/stats/streak');
}

export async function getComparison(): Promise<import('../types').UserComparison[]> {
  return request<import('../types').UserComparison[]>('/api/stats/comparison');
}
