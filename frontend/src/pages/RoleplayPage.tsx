import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage, RoleplayScenario } from '../types';
import * as api from '../services/api';

// ── Danh sách kịch bản tĩnh (frontend-defined) ─────
const SCENARIOS: RoleplayScenario[] = [
  {
    id: 'coffee-shop',
    icon: '☕',
    title: 'Ordering Coffee',
    description: 'Practice ordering drinks and food at a coffee shop. Learn polite phrases and common menu vocabulary.',
    difficulty: 'easy',
    objectives: [
      'Greet the barista',
      'Ask about the menu',
      'Place your order',
      'Ask for the bill',
    ],
    system_prompt: `You are a friendly barista at a cozy coffee shop called "The Morning Brew". 
You should act naturally as a barista would — greeting the customer, asking what they'd like to order, 
suggesting items, and handling payment. Use natural, casual English. 
If the user makes grammar mistakes, gently correct them by using the correct form in your response.
Start by welcoming the customer.`,
  },
  {
    id: 'airport',
    icon: '✈️',
    title: 'Airport Check-in',
    description: 'Navigate airport check-in, security, and boarding. Learn essential travel vocabulary.',
    difficulty: 'medium',
    objectives: [
      'Present your documents',
      'Choose your seat',
      'Ask about baggage',
      'Find your gate',
    ],
    system_prompt: `You are an airline check-in agent at an international airport. 
Help the passenger check in for their flight. Ask for their passport and booking reference.
Offer seat choices (window/aisle), ask about luggage, and provide gate information.
Use professional, clear English. If the user makes mistakes, model the correct usage naturally.
Start by greeting the passenger and asking for their documents.`,
  },
  {
    id: 'job-interview',
    icon: '💼',
    title: 'Job Interview',
    description: 'Practice answering common interview questions. Build confidence for your next opportunity.',
    difficulty: 'hard',
    objectives: [
      'Introduce yourself',
      'Describe your experience',
      'Answer a behavioral question',
      'Ask the interviewer a question',
    ],
    system_prompt: `You are a hiring manager conducting a job interview for a Software Developer position at a tech company. 
Conduct a realistic interview — start with introductions, ask about their background, 
then move to behavioral questions ("Tell me about a time when..."), and finally ask if they have questions.
Be professional and encouraging. Provide feedback on their English usage naturally.
Start by welcoming the candidate and introducing yourself.`,
  },
  {
    id: 'doctor-visit',
    icon: '🏥',
    title: 'Doctor Visit',
    description: 'Describe symptoms and understand medical advice. Learn health-related vocabulary.',
    difficulty: 'medium',
    objectives: [
      'Describe your symptoms',
      'Answer health questions',
      'Understand the diagnosis',
      'Ask about treatment',
    ],
    system_prompt: `You are a general practitioner (doctor) at a local clinic. 
The patient has come in with some health concerns. Ask about their symptoms, medical history, 
and provide a diagnosis with treatment recommendations.
Use clear, simple medical English and explain any medical terms.
If the user makes language mistakes, gently model the correct phrasing.
Start by welcoming the patient and asking how you can help.`,
  },
  {
    id: 'restaurant',
    icon: '🍽️',
    title: 'Restaurant Dining',
    description: 'Make reservations, order food, and handle dining situations. Practice polite dining English.',
    difficulty: 'easy',
    objectives: [
      'Make a reservation or ask for a table',
      'Ask about menu recommendations',
      'Order your meal',
      'Handle a special request',
    ],
    system_prompt: `You are a friendly waiter/waitress at an upscale restaurant called "The Golden Fork". 
Help the guest with their dining experience — seating, menu questions, taking orders, and special requests.
Be attentive and use polite, professional English. Suggest dishes and describe specials.
If the user makes grammar errors, model correct usage naturally in your response.
Start by greeting the guest and asking if they have a reservation.`,
  },
  {
    id: 'hotel-checkin',
    icon: '🏨',
    title: 'Hotel Check-in',
    description: 'Check into a hotel, ask about amenities, and handle room issues.',
    difficulty: 'easy',
    objectives: [
      'Check in with your reservation',
      'Ask about hotel amenities',
      'Request something for your room',
      'Ask for local recommendations',
    ],
    system_prompt: `You are a hotel receptionist at "The Grand Plaza Hotel", a 4-star hotel.
Help the guest check in, provide information about amenities (pool, gym, restaurant, wifi),
handle room requests, and give local area recommendations.
Be warm and professional. If the user makes language errors, gently model correct usage.
Start by welcoming the guest and asking for their reservation name.`,
  },
];

type Phase = 'select' | 'chat' | 'score';

export default function RoleplayPage() {
  const [phase, setPhase] = useState<Phase>('select');
  const [activeScenario, setActiveScenario] = useState<RoleplayScenario | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [completedObjectives, setCompletedObjectives] = useState<Set<number>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const messageCountRef = useRef(0);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Simulate objective completion based on message count
  useEffect(() => {
    if (!activeScenario) return;
    const count = messages.filter((m) => m.role === 'user').length;
    const newCompleted = new Set(completedObjectives);
    if (count >= 1) newCompleted.add(0);
    if (count >= 2) newCompleted.add(1);
    if (count >= 3) newCompleted.add(2);
    if (count >= 4) newCompleted.add(3);
    setCompletedObjectives(newCompleted);
  }, [messages, activeScenario]);

  const startScenario = async (scenario: RoleplayScenario) => {
    setActiveScenario(scenario);
    setPhase('chat');
    setMessages([]);
    setCompletedObjectives(new Set());
    messageCountRef.current = 0;

    try {
      const session = await api.createChatSession();
      setSessionId(session.id);

      // Send system context as first message to set the scene
      setIsStreaming(true);
      setStreamingContent('');

      const abort = api.streamChatMessage(
        session.id,
        `[ROLEPLAY MODE: ${scenario.title}]\n\nSystem context: ${scenario.system_prompt}\n\nPlease start the roleplay conversation. Begin in character.`,
        (text) => setStreamingContent((prev) => prev + text),
        () => {
          setStreamingContent((prev) => {
            if (prev) {
              const msg: ChatMessage = {
                id: `ai-${Date.now()}`,
                session_id: session.id,
                role: 'assistant',
                content: prev,
                created_at: new Date().toISOString(),
              };
              setMessages((msgs) => [...msgs, msg]);
            }
            return '';
          });
          setIsStreaming(false);
        },
        () => setIsStreaming(false),
      );
      abortRef.current = abort;
    } catch {
      /* ignore */
    }
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming || !sessionId) return;

    const userMessage = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    messageCountRef.current++;

    setIsStreaming(true);
    setStreamingContent('');

    const abort = api.streamChatMessage(
      sessionId,
      userMessage,
      (text) => setStreamingContent((prev) => prev + text),
      () => {
        setStreamingContent((prev) => {
          if (prev) {
            const msg: ChatMessage = {
              id: `ai-${Date.now()}`,
              session_id: sessionId,
              role: 'assistant',
              content: prev,
              created_at: new Date().toISOString(),
            };
            setMessages((msgs) => [...msgs, msg]);
          }
          return '';
        });
        setIsStreaming(false);
      },
      () => setIsStreaming(false),
    );
    abortRef.current = abort;
  }, [input, isStreaming, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const endSession = () => {
    if (abortRef.current) abortRef.current();
    setPhase('score');
  };

  const backToSelect = () => {
    setPhase('select');
    setActiveScenario(null);
    setMessages([]);
    setSessionId(null);
    setCompletedObjectives(new Set());
  };

  const objectivesTotal = activeScenario?.objectives.length ?? 0;
  const objectivesCompleted = completedObjectives.size;
  const progressPercent = objectivesTotal > 0 ? (objectivesCompleted / objectivesTotal) * 100 : 0;

  // ── Select Phase ──────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="page" id="roleplay-page">
        <div className="page-header animate-in">
          <h1>Roleplay Scenarios</h1>
          <p className="text-sm text-secondary">
            Practice real-world English conversations with AI in different situations
          </p>
        </div>

        <div className="scenario-grid animate-in animate-in-delay-1">
          {SCENARIOS.map((scenario, i) => (
            <div
              key={scenario.id}
              className="scenario-card"
              onClick={() => startScenario(scenario)}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <span className="scenario-icon">{scenario.icon}</span>
              <span className={`scenario-difficulty difficulty-${scenario.difficulty}`}>
                {scenario.difficulty}
              </span>
              <div className="scenario-title">{scenario.title}</div>
              <div className="scenario-desc">{scenario.description}</div>
              <ul className="scenario-objectives">
                {scenario.objectives.map((obj, j) => (
                  <li key={j} className="scenario-objective">{obj}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Score Phase ───────────────────────────────────
  if (phase === 'score') {
    const userMsgCount = messages.filter((m) => m.role === 'user').length;
    const grade = objectivesCompleted >= objectivesTotal ? 'A+' :
      objectivesCompleted >= objectivesTotal * 0.75 ? 'A' :
      objectivesCompleted >= objectivesTotal * 0.5 ? 'B' : 'C';

    return (
      <div className="page" id="roleplay-page">
        <div className="scorecard">
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>
            {activeScenario?.icon}
          </div>
          <h2 style={{ fontFamily: 'var(--font-reading)', fontWeight: 'var(--weight-semi)', marginBottom: 'var(--space-2)' }}>
            Session Complete!
          </h2>
          <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-4)' }}>
            {activeScenario?.title}
          </p>

          <div className="scorecard-grade" style={{ color: 'var(--color-accent)' }}>
            {grade}
          </div>

          <div className="scorecard-metrics">
            <div>
              <div className="stat-value">{objectivesCompleted}/{objectivesTotal}</div>
              <div className="stat-label">Objectives</div>
            </div>
            <div>
              <div className="stat-value">{userMsgCount}</div>
              <div className="stat-label">Messages</div>
            </div>
            <div>
              <div className="stat-value">{messages.length}</div>
              <div className="stat-label">Total Turns</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center" style={{ marginTop: 'var(--space-6)' }}>
            <button className="btn btn-secondary" onClick={backToSelect}>
              Back to Scenarios
            </button>
            <button className="btn btn-primary" onClick={() => activeScenario && startScenario(activeScenario)}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Chat Phase ────────────────────────────────────
  return (
    <div className="chat-layout" id="roleplay-page">
      {/* Objectives Sidebar */}
      <div className="chat-sidebar" style={{ padding: 'var(--space-4)' }}>
        <button className="btn btn-ghost btn-sm" onClick={backToSelect} style={{ marginBottom: 'var(--space-4)', width: '100%' }}>
          ← Back
        </button>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <span style={{ fontSize: '1.5rem' }}>{activeScenario?.icon}</span>
          <h3 style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
            {activeScenario?.title}
          </h3>
          <span className={`scenario-difficulty difficulty-${activeScenario?.difficulty}`}>
            {activeScenario?.difficulty}
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-1)' }}>
            <span className="text-xs text-secondary">Progress</span>
            <span className="text-xs text-secondary">{Math.round(progressPercent)}%</span>
          </div>
          <div style={{ width: '100%', height: 6, background: 'var(--color-border-light)', borderRadius: 3 }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'var(--color-accent)',
                borderRadius: 3,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>

        {/* Objectives List */}
        <div className="text-xs text-tertiary" style={{ marginBottom: 'var(--space-2)' }}>
          OBJECTIVES
        </div>
        <ul className="scenario-objectives">
          {activeScenario?.objectives.map((obj, i) => (
            <li
              key={i}
              className={`scenario-objective${completedObjectives.has(i) ? ' completed' : ''}`}
              style={{
                color: completedObjectives.has(i) ? 'var(--color-green)' : undefined,
                textDecoration: completedObjectives.has(i) ? 'line-through' : undefined,
              }}
            >
              {obj}
            </li>
          ))}
        </ul>

        <button
          className="btn btn-secondary"
          onClick={endSession}
          style={{ width: '100%', marginTop: 'var(--space-6)' }}
        >
          End Session
        </button>
      </div>

      {/* Chat Area */}
      <div className="chat-main">
        <div className="chat-messages" id="roleplay-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message chat-message-${msg.role}`}
            >
              {msg.content}
            </div>
          ))}
          {streamingContent && (
            <div className="chat-message chat-message-assistant">
              {streamingContent}
            </div>
          )}
          {isStreaming && !streamingContent && (
            <div className="typing-indicator">
              <span /><span /><span />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="chat-input-wrap">
            <textarea
              ref={textareaRef}
              className="textarea"
              placeholder="Type your response... (Enter to send)"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              rows={1}
            />
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
              style={{ flexShrink: 0, height: 44 }}
            >
              {isStreaming ? (
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: '1.5px' }} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
