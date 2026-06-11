import { useState } from 'react';
import type { GrammarCorrection } from '../types';
import * as api from '../services/api';

export default function GrammarPage() {
  const [text, setText] = useState('');
  const [corrections, setCorrections] = useState<GrammarCorrection[]>([]);
  const [correctedText, setCorrectedText] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const handleCheck = async () => {
    if (!text.trim() || isChecking) return;
    setIsChecking(true);
    setHasChecked(false);

    try {
      const result = await api.checkGrammar(text.trim());
      setCorrections(result.corrections);
      setCorrectedText(result.corrected_text);
      setHasChecked(true);
    } catch {
      /* ignore */
    } finally {
      setIsChecking(false);
    }
  };

  const exampleSentences = [
    'I is going to the store yesterday and buyed some foods.',
    'She have went to school and she can to speak English more better.',
    'They is very happy because he are coming to the party.',
  ];

  return (
    <div className="page" id="grammar-page">
      <div className="page-header animate-in">
        <h1>Grammar Checker</h1>
        <p className="text-sm text-secondary">
          Write or paste English text to check for grammar errors
        </p>
      </div>

      {/* Input Area */}
      <div className="animate-in animate-in-delay-1" style={{ marginBottom: 'var(--space-5)' }}>
        <textarea
          className="textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste your English text here..."
          rows={5}
          id="grammar-input"
          style={{ width: '100%', resize: 'vertical', minHeight: 120 }}
        />

        <div className="flex items-center justify-between" style={{ marginTop: 'var(--space-3)' }}>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <span className="text-xs text-tertiary" style={{ alignSelf: 'center' }}>Try:</span>
            {exampleSentences.map((ex, i) => (
              <button
                key={i}
                className="btn btn-ghost btn-sm"
                onClick={() => setText(ex)}
                style={{ fontSize: 'var(--text-xs)' }}
              >
                Example {i + 1}
              </button>
            ))}
          </div>

          <button
            className="btn btn-primary"
            onClick={handleCheck}
            disabled={isChecking || !text.trim()}
            id="btn-check-grammar"
          >
            {isChecking ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: '1.5px' }} />
                Checking...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                Check Grammar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {hasChecked && (
        <div className="animate-in">
          {corrections.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-4)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>✨</div>
              <h2 style={{ fontFamily: 'var(--font-reading)', fontWeight: 'var(--weight-normal)', color: 'var(--color-text-secondary)' }}>
                No errors found!
              </h2>
              <p className="text-sm text-tertiary">Your text looks grammatically correct.</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
                <span
                  className="badge"
                  style={{ background: 'var(--color-red-light)', color: 'var(--color-red)' }}
                >
                  {corrections.length} error{corrections.length !== 1 ? 's' : ''} found
                </span>
              </div>

              {/* Corrected Text */}
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <label className="form-label">Corrected text</label>
                <div
                  style={{
                    padding: 'var(--space-4)',
                    background: 'var(--color-green-light)',
                    borderRadius: 'var(--radius-lg)',
                    fontFamily: 'var(--font-reading)',
                    lineHeight: 1.7,
                    color: 'var(--color-text)',
                    border: '1px solid #d4edda',
                  }}
                >
                  {correctedText}
                </div>
              </div>

              {/* Individual Corrections */}
              <div className="grammar-result">
                {corrections.map((c, index) => (
                  <div
                    key={index}
                    className="grammar-item"
                    style={{ animationDelay: `${index * 0.08}s` }}
                  >
                    <div className="grammar-rule">{c.rule}</div>
                    <div className="grammar-diff">
                      <span className="grammar-wrong">{c.original}</span>
                      <span className="grammar-arrow">→</span>
                      <span className="grammar-correct">{c.corrected}</span>
                    </div>
                    <div className="grammar-explanation">{c.explanation}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
