import { useState, useEffect, useCallback } from 'react';
import type { Flashcard, FlashcardStats } from '../types';
import * as api from '../services/api';
import Confetti from '../components/Confetti';

type ReviewPhase = 'loading' | 'empty' | 'review' | 'complete';

export default function FlashcardPage() {
  const [phase, setPhase] = useState<ReviewPhase>('loading');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const loadDueCards = useCallback(async () => {
    try {
      const [dueCards, flashStats] = await Promise.all([
        api.getDueFlashcards(),
        api.getFlashcardStats(),
      ]);
      setCards(dueCards);
      setStats(flashStats);
      setPhase(dueCards.length > 0 ? 'review' : 'empty');
    } catch {
      setPhase('empty');
    }
  }, []);

  useEffect(() => {
    loadDueCards();
  }, [loadDueCards]);

  const currentCard = cards[currentIndex];

  const handleReview = async (quality: number) => {
    if (!currentCard || isSubmitting) return;
    setIsSubmitting(true);

    // Optimistic: chuyển card ngay
    setReviewed((r) => r + 1);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    } else {
      setPhase('complete');
      setShowConfetti(true);
    }

    try {
      await api.reviewFlashcard(currentCard.id, { quality });
    } catch {
      /* silent — optimistic already moved forward */
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== 'review') return;

    const handleKey = (e: KeyboardEvent) => {
      // Space to flip
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((f) => !f);
        return;
      }

      // Number keys for rating (only when flipped)
      if (!isFlipped) return;

      switch (e.key) {
        case '1':
          handleReview(0); // Again
          break;
        case '2':
          handleReview(2); // Hard
          break;
        case '3':
          handleReview(4); // Good
          break;
        case '4':
          handleReview(5); // Easy
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, isFlipped, currentCard, isSubmitting]);

  if (phase === 'loading') {
    return (
      <div className="page" id="flashcard-page">
        <div className="empty-state">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (phase === 'empty') {
    return (
      <div className="page" id="flashcard-page">
        <div className="page-header animate-in">
          <h1>Flashcards</h1>
        </div>

        {stats && (
          <div className="stat-grid animate-in animate-in-delay-1" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="stat card-hover">
              <div className="stat-value">{stats.total_cards}</div>
              <div className="stat-label">Total cards</div>
            </div>
            <div className="stat card-hover">
              <div className="stat-value">{stats.new_cards}</div>
              <div className="stat-label">New</div>
            </div>
            <div className="stat card-hover">
              <div className="stat-value">{stats.learning_cards}</div>
              <div className="stat-label">Learning</div>
            </div>
            <div className="stat card-hover">
              <div className="stat-value">{stats.review_cards}</div>
              <div className="stat-label">Review</div>
            </div>
          </div>
        )}

        <div className="empty-state animate-in animate-in-delay-2">
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--font-reading)', fontWeight: 'var(--weight-normal)', color: 'var(--color-text-secondary)' }}>
            You're all caught up!
          </h2>
          <p>No cards due for review right now. Come back later.</p>
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="page" id="flashcard-page">
        {showConfetti && <Confetti />}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
          <div className="animate-scale-in" style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>✨</div>
          <h1 className="animate-in animate-in-delay-1" style={{ fontFamily: 'var(--font-reading)', fontWeight: 'var(--weight-semi)', marginBottom: 'var(--space-2)' }}>
            Session Complete
          </h1>
          <p className="text-secondary animate-in animate-in-delay-2" style={{ marginBottom: 'var(--space-6)' }}>
            You reviewed {reviewed} card{reviewed !== 1 ? 's' : ''} this session.
          </p>

          <div className="stat-grid animate-in animate-in-delay-3" style={{ maxWidth: 400, width: '100%', marginBottom: 'var(--space-6)' }}>
            <div className="stat" style={{ textAlign: 'center' }}>
              <div className="stat-value">{reviewed}</div>
              <div className="stat-label">Reviewed</div>
            </div>
            <div className="stat" style={{ textAlign: 'center' }}>
              <div className="stat-value">{cards.length}</div>
              <div className="stat-label">Total Due</div>
            </div>
          </div>

          <button className="btn btn-primary animate-in animate-in-delay-4" onClick={() => { setCurrentIndex(0); setReviewed(0); setIsFlipped(false); setShowConfetti(false); loadDueCards(); }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  // Review phase
  return (
    <div className="page" id="flashcard-page">
      <div className="flex items-center justify-between animate-in" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1>Review</h1>
          <p className="text-sm text-secondary">
            {currentIndex + 1} of {cards.length}
          </p>
        </div>
        {/* Progress bar */}
        <div style={{ width: 200, height: 4, background: 'var(--color-border)', borderRadius: 2 }}>
          <div style={{
            width: `${((currentIndex) / cards.length) * 100}%`,
            height: '100%',
            background: 'var(--color-accent)',
            borderRadius: 2,
            transition: 'width var(--transition-normal)',
          }} />
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="text-xs text-tertiary animate-in animate-in-delay-1" style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
        <kbd style={{ padding: '1px 6px', border: '1px solid var(--color-border)', borderRadius: 3, background: 'var(--color-surface)' }}>Space</kbd> flip
        {isFlipped && (
          <>
            {' · '}
            <kbd style={{ padding: '1px 6px', border: '1px solid var(--color-border)', borderRadius: 3, background: 'var(--color-surface)' }}>1</kbd> Again
            {' '}
            <kbd style={{ padding: '1px 6px', border: '1px solid var(--color-border)', borderRadius: 3, background: 'var(--color-surface)' }}>2</kbd> Hard
            {' '}
            <kbd style={{ padding: '1px 6px', border: '1px solid var(--color-border)', borderRadius: 3, background: 'var(--color-surface)' }}>3</kbd> Good
            {' '}
            <kbd style={{ padding: '1px 6px', border: '1px solid var(--color-border)', borderRadius: 3, background: 'var(--color-surface)' }}>4</kbd> Easy
          </>
        )}
      </div>

      {/* Flashcard */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
        <div
          className="flashcard-container"
          style={{ width: '100%', maxWidth: 520, cursor: 'pointer' }}
          onClick={() => setIsFlipped(!isFlipped)}
          id="flashcard-display"
        >
          <div
            className={`flashcard-inner${isFlipped ? ' flipped' : ''}`}
            style={{ height: 320 }}
          >
            {/* Front — Word */}
            <div className="flashcard-face">
              <div style={{ fontFamily: 'var(--font-reading)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semi)', marginBottom: 'var(--space-2)' }}>
                {currentCard.word}
              </div>
              {currentCard.pronunciation && (
                <div className="text-sm text-tertiary">{currentCard.pronunciation}</div>
              )}
              <p className="text-xs text-tertiary" style={{ marginTop: 'var(--space-5)' }}>
                Click or press Space to reveal
              </p>
            </div>

            {/* Back — Definition */}
            <div className="flashcard-face flashcard-back">
              <div style={{ fontFamily: 'var(--font-reading)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semi)', marginBottom: 'var(--space-1)' }}>
                {currentCard.word}
              </div>
              {currentCard.pronunciation && (
                <div className="text-xs text-tertiary" style={{ marginBottom: 'var(--space-4)' }}>{currentCard.pronunciation}</div>
              )}
              <p style={{ fontFamily: 'var(--font-reading)', fontSize: 'var(--text-base)', color: 'var(--color-text)', textAlign: 'center', lineHeight: 1.6 }}>
                {currentCard.definition}
              </p>
              {currentCard.example_sentence && (
                <p className="text-sm" style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)', marginTop: 'var(--space-4)', textAlign: 'center' }}>
                  "{currentCard.example_sentence}"
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rating Buttons — only show when flipped */}
      {isFlipped && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)', animation: 'slideUp var(--transition-normal) both' }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleReview(0)}
            disabled={isSubmitting}
            id="btn-again"
            style={{ minWidth: 80, borderColor: 'var(--color-red)', color: 'var(--color-red)' }}
          >
            Again <span className="text-xs" style={{ opacity: 0.6 }}>1</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleReview(2)}
            disabled={isSubmitting}
            id="btn-hard"
            style={{ minWidth: 80, borderColor: 'var(--color-amber)', color: 'var(--color-amber)' }}
          >
            Hard <span className="text-xs" style={{ opacity: 0.6 }}>2</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleReview(4)}
            disabled={isSubmitting}
            id="btn-good"
            style={{ minWidth: 80, borderColor: 'var(--color-green)', color: 'var(--color-green)' }}
          >
            Good <span className="text-xs" style={{ opacity: 0.6 }}>3</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleReview(5)}
            disabled={isSubmitting}
            id="btn-easy"
            style={{ minWidth: 80 }}
          >
            Easy <span className="text-xs" style={{ opacity: 0.8 }}>4</span>
          </button>
        </div>
      )}
    </div>
  );
}
