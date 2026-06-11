import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatSession, ChatMessage } from '../types';
import * as api from '../services/api';

// ── Simple markdown parser ──────────────────────────
function renderMarkdown(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Unordered lists
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n/g, '<br />');
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const data = await api.getChatSessions();
      setSessions(Array.isArray(data) ? data : (data as { sessions: ChatSession[] }).sessions || []);
    } catch {
      /* ignore */
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadMessages = useCallback(async (sessionId: string) => {
    setIsLoadingMessages(true);
    try {
      const msgs = await api.getChatMessages(sessionId);
      setMessages(msgs);
    } catch {
      /* ignore */
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId, loadMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleNewChat = async () => {
    try {
      const session = await api.createChatSession();
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
    } catch {
      /* ignore */
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch {
      /* ignore */
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    let sessionId = activeSessionId;

    // Auto-create session if none active
    if (!sessionId) {
      try {
        const session = await api.createChatSession();
        setSessions((prev) => [session, ...prev]);
        sessionId = session.id;
        setActiveSessionId(sessionId);
      } catch {
        return;
      }
    }

    const userMessage = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Add user message to UI immediately
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    // Start streaming
    setIsStreaming(true);
    setStreamingContent('');

    const abort = api.streamChatMessage(
      sessionId,
      userMessage,
      (text) => {
        setStreamingContent((prev) => prev + text);
      },
      () => {
        setStreamingContent((prev) => {
          // Move streamed content to messages
          if (prev) {
            const assistantMsg: ChatMessage = {
              id: `ai-${Date.now()}`,
              session_id: sessionId!,
              role: 'assistant',
              content: prev,
              created_at: new Date().toISOString(),
            };
            setMessages((msgs) => [...msgs, assistantMsg]);
          }
          return '';
        });
        setIsStreaming(false);
        // Refresh sessions to update title
        loadSessions();
      },
      (err) => {
        console.error('Stream error:', err);
        setIsStreaming(false);
        setStreamingContent('');
      },
    );

    abortRef.current = abort;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="chat-layout" id="chat-page">
      {/* Sessions Sidebar */}
      <div className="chat-sidebar" id="chat-sidebar">
        <div className="chat-sidebar-header">
          <button className="btn btn-secondary" onClick={handleNewChat} style={{ width: '100%' }} id="btn-new-chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Chat
          </button>
        </div>

        <div className="chat-session-list" id="session-list">
          {isLoadingSessions ? (
            <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
              <div className="spinner" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
              <p className="text-xs text-tertiary">No conversations yet</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`chat-session-item${activeSessionId === session.id ? ' active' : ''}`}
                onClick={() => setActiveSessionId(session.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="chat-session-title">{session.title}</div>
                  <div className="chat-session-date">{formatTime(session.created_at)}</div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  title="Delete"
                  style={{ opacity: 0.5, flexShrink: 0 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Main Area */}
      <div className="chat-main" id="chat-main">
        {!activeSessionId && !isStreaming ? (
          <div className="chat-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h2>Start a conversation</h2>
            <p className="text-sm text-tertiary">Ask me anything about English — grammar, vocabulary, exercises.</p>
            <button className="btn btn-primary" onClick={handleNewChat} style={{ marginTop: 'var(--space-4)' }}>
              New Chat
            </button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="chat-messages" id="chat-messages">
              {isLoadingMessages ? (
                <div className="empty-state">
                  <div className="spinner" />
                </div>
              ) : messages.length === 0 && !streamingContent ? (
                <div className="chat-empty">
                  <h2 style={{ fontFamily: 'var(--font-reading)' }}>How can I help you today?</h2>
                  <p className="text-sm text-tertiary" style={{ maxWidth: 400 }}>
                    I'm your English tutor. Ask me about grammar, vocabulary, or send me an exercise to solve together.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`chat-message chat-message-${msg.role}`}
                    >
                      {msg.role === 'assistant' ? (
                        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                      ) : (
                        msg.content
                      )}
                    </div>
                  ))}
                  {streamingContent && (
                    <div className="chat-message chat-message-assistant">
                      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingContent) }} />
                    </div>
                  )}
                  {isStreaming && !streamingContent && (
                    <div className="typing-indicator">
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="chat-input-area" id="chat-input-area">
              <div className="chat-input-wrap">
                <textarea
                  ref={textareaRef}
                  className="textarea"
                  placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                  value={input}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  disabled={isStreaming}
                  rows={1}
                  id="chat-input"
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSend}
                  disabled={isStreaming || !input.trim()}
                  id="btn-send"
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
          </>
        )}
      </div>
    </div>
  );
}
