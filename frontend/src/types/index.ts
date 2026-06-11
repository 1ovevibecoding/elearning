// ── User ─────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ── Vocabulary ───────────────────────────────────────
export interface Vocabulary {
  id: string;
  word: string;
  definition: string;
  example_sentence?: string;
  part_of_speech?: string;
  pronunciation?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
}

export interface VocabularyCreate {
  word: string;
  definition: string;
  example_sentence?: string;
  part_of_speech?: string;
  pronunciation?: string;
  notes?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ── Flashcard ────────────────────────────────────────
export interface Flashcard {
  id: string;
  user_id: string;
  vocabulary_id: string;
  easiness_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
  last_reviewed_at?: string;
  status: string;
  created_at: string;
  word: string;
  definition: string;
  example_sentence?: string;
  pronunciation?: string;
}

export interface FlashcardStats {
  total_cards: number;
  due_today: number;
  new_cards: number;
  learning_cards: number;
  review_cards: number;
}

export interface ReviewPayload {
  quality: number; // 0–5
}

// ── Chat ─────────────────────────────────────────────
export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  message_count: number;
  last_message?: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface SendMessagePayload {
  message: string;
}

// ── API Error ────────────────────────────────────────
export interface ApiError {
  detail: string;
  status: number;
}

// ── Grammar ─────────────────────────────────────────
export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
  rule: string;
}

export interface GrammarCheckResponse {
  corrections: GrammarCorrection[];
  corrected_text: string;
}

// ── Roleplay ────────────────────────────────────────
export interface RoleplayScenario {
  id: string;
  icon: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  objectives: string[];
  system_prompt: string;
}

// ── Calendar ────────────────────────────────────────
export interface CalendarEventCreate {
  title: string;
  start_time: string;
  end_time: string;
  event_type: 'study' | 'busy' | 'review';
  color: string;
  notes?: string;
}

export interface CalendarEventResponse {
  id: string;
  user_id: string;
  user_name: string;
  title: string;
  start_time: string;
  end_time: string;
  event_type: string;
  color: string;
  notes?: string;
  is_own: boolean;
}

// ── Stats / Comparison ──────────────────────────────
export interface UserComparison {
  user_id: string;
  name: string;
  avatar_initial: string;
  total_vocabulary: number;
  total_flashcards: number;
  total_reviews: number;
  is_current_user: boolean;
}
