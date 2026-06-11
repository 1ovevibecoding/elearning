import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await login();
    } catch {
      setError('Unable to connect. Please make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" id="login-page">
      <div
        className="login-card"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        <h1 className="login-brand">Lingua</h1>
        <p
          className="login-tagline"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s',
          }}
        >
          Build your English vocabulary, review with spaced repetition, and
          practice conversation — all in one calm, focused space.
        </p>

        <button
          className="btn btn-primary btn-lg"
          onClick={handleLogin}
          disabled={loading}
          id="btn-login"
          style={{
            width: '100%',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.6s ease 0.35s, transform 0.6s ease 0.35s',
          }}
        >
          {loading ? (
            <>
              <span className="spinner" /> Connecting…
            </>
          ) : (
            'Get Started'
          )}
        </button>

        {error && (
          <p
            style={{
              color: 'var(--color-red)',
              fontSize: 'var(--text-sm)',
              marginTop: 'var(--space-4)',
              animation: 'fadeSlideUp 0.3s ease both',
            }}
          >
            {error}
          </p>
        )}

        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-tertiary)',
            marginTop: 'var(--space-6)',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.6s ease 0.5s',
          }}
        >
          Development mode — no password required
        </p>
      </div>
    </div>
  );
}
