import { useState, useEffect, useCallback } from 'react';
import type { Vocabulary, VocabularyCreate } from '../types';
import { useToast } from '../components/Toast';
import * as api from '../services/api';

export default function VocabularyPage() {
  const { addToast } = useToast();
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const pageSize = 15;

  const [form, setForm] = useState<VocabularyCreate>({
    word: '',
    definition: '',
    example_sentence: '',
    part_of_speech: '',
    pronunciation: '',
    notes: '',
  });

  const loadWords = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getVocabulary(page, pageSize, search);
      setWords(res.items);
      setTotal(res.total);
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.word.trim() || !form.definition.trim()) return;
    setSaving(true);

    // Optimistic update: thêm từ vào UI ngay lập tức
    const tempWord: Vocabulary = {
      id: `temp-${Date.now()}`,
      word: form.word,
      definition: form.definition,
      example_sentence: form.example_sentence,
      part_of_speech: form.part_of_speech,
      pronunciation: form.pronunciation,
      notes: form.notes,
      created_at: new Date().toISOString(),
      user_id: '',
    };
    setWords((prev) => [tempWord, ...prev]);
    setTotal((t) => t + 1);
    setShowModal(false);
    setForm({ word: '', definition: '', example_sentence: '', part_of_speech: '', pronunciation: '', notes: '' });

    try {
      await api.createVocabulary({
        word: tempWord.word,
        definition: tempWord.definition,
        example_sentence: tempWord.example_sentence,
        part_of_speech: tempWord.part_of_speech,
        pronunciation: tempWord.pronunciation,
        notes: tempWord.notes,
      });
      addToast(`"${tempWord.word}" saved successfully`, 'success');
      loadWords(); // Refresh to get real ID
    } catch {
      // Rollback optimistic update
      setWords((prev) => prev.filter((w) => w.id !== tempWord.id));
      setTotal((t) => t - 1);
      addToast('Failed to save word', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, word: string) => {
    // Optimistic: xóa khỏi UI ngay
    const backup = words;
    setWords((prev) => prev.filter((w) => w.id !== id));
    setTotal((t) => t - 1);

    try {
      await api.deleteVocabulary(id);
      addToast(`"${word}" deleted`, 'info');
    } catch {
      // Rollback
      setWords(backup);
      setTotal((t) => t + 1);
      addToast('Failed to delete word', 'error');
    }
  };

  const handleCreateFlashcard = async (vocabId: string, word: string) => {
    try {
      await api.createFlashcard(vocabId);
      addToast(`Flashcard created for "${word}"`, 'success');
    } catch {
      addToast('Failed to create flashcard', 'error');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });
  };

  return (
    <div className="page" id="vocabulary-page">
      <div className="page-header flex items-center justify-between animate-in">
        <div>
          <h1>Vocabulary</h1>
          <p className="text-sm text-secondary">{total} words saved</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
          id="btn-add-word"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Word
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 'var(--space-5)' }} className="animate-in animate-in-delay-1">
        <input
          className="input"
          type="text"
          placeholder="Search words..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          id="search-vocabulary"
          style={{ maxWidth: 360 }}
        />
      </div>

      {/* Word Table */}
      <div className="animate-in animate-in-delay-2">
        {isLoading ? (
          <div className="empty-state">
            <div className="spinner" />
          </div>
        ) : words.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <p>{search ? 'No words match your search' : 'No words saved yet'}</p>
            {!search && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(true)}>
                Add your first word
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table" id="vocabulary-table">
              <thead>
                <tr>
                  <th>Word</th>
                  <th>Definition</th>
                  <th>Type</th>
                  <th>Added</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {words.map((word) => (
                  <tr key={word.id}>
                    <td>
                      <div style={{ fontWeight: 'var(--weight-medium)' }}>{word.word}</div>
                      {word.pronunciation && (
                        <div className="text-xs text-tertiary">{word.pronunciation}</div>
                      )}
                    </td>
                    <td>
                      <div className="text-sm" style={{ maxWidth: 320, lineHeight: 1.5 }}>
                        {word.definition}
                      </div>
                      {word.example_sentence && (
                        <div className="text-xs text-tertiary font-reading" style={{ marginTop: 4, fontStyle: 'italic' }}>
                          "{word.example_sentence}"
                        </div>
                      )}
                    </td>
                    <td>
                      {word.part_of_speech && (
                        <span className="badge">{word.part_of_speech}</span>
                      )}
                    </td>
                    <td className="text-xs text-tertiary">{formatDate(word.created_at)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleCreateFlashcard(word.id, word.word)}
                          title="Create flashcard"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <path d="M12 8v8" />
                            <path d="M8 12h8" />
                          </svg>
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(word.id, word.word)}
                          title="Delete word"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination" id="vocabulary-pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
            .map((p, idx, arr) => (
              <span key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: 'var(--color-text-tertiary)' }}>…</span>}
                <button
                  className={p === page ? 'active' : ''}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              </span>
            ))}
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            ›
          </button>
        </div>
      )}

      {/* Add Word Modal */}
      {showModal && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal animate-scale-in" id="add-word-modal">
            <div className="modal-header">
              <h2>Add Word</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-4">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="input-word">Word *</label>
                    <input
                      className="input"
                      id="input-word"
                      type="text"
                      value={form.word}
                      onChange={(e) => setForm({ ...form, word: e.target.value })}
                      placeholder="e.g. serendipity"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="input-pos">Part of Speech</label>
                    <input
                      className="input"
                      id="input-pos"
                      type="text"
                      value={form.part_of_speech}
                      onChange={(e) => setForm({ ...form, part_of_speech: e.target.value })}
                      placeholder="e.g. noun"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="input-definition">Definition *</label>
                  <textarea
                    className="textarea"
                    id="input-definition"
                    value={form.definition}
                    onChange={(e) => setForm({ ...form, definition: e.target.value })}
                    placeholder="The meaning of the word..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="input-example">Example Sentence</label>
                  <input
                    className="input"
                    id="input-example"
                    type="text"
                    value={form.example_sentence}
                    onChange={(e) => setForm({ ...form, example_sentence: e.target.value })}
                    placeholder="Use the word in a sentence..."
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="input-pronunciation">Pronunciation</label>
                    <input
                      className="input"
                      id="input-pronunciation"
                      type="text"
                      value={form.pronunciation}
                      onChange={(e) => setForm({ ...form, pronunciation: e.target.value })}
                      placeholder="/ˌserənˈdɪpɪti/"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="input-notes">Notes</label>
                    <input
                      className="input"
                      id="input-notes"
                      type="text"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Personal notes..."
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} id="btn-save-word">
                  {saving ? <span className="spinner" /> : 'Save Word'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
