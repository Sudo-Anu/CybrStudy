import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginAdmin, checkIsAdmin, logoutAdmin } from '../services/authService';
import { ADMIN_BASE } from '../utils/constants';

export default function AdminLoginPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState(() => {
    try {
      const reason = sessionStorage.getItem('cybrstudy_kicked_reason');
      if (reason === 'another_device') {
        sessionStorage.removeItem('cybrstudy_kicked_reason');
        return 'You were signed out because your account was logged in from another device.';
      }
    } catch {}
    return '';
  });
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  // Already signed in as admin → go straight to dashboard (wait for auth to resolve first)
  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      navigate(`${ADMIN_BASE}/dashboard`, { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const credential = await loginAdmin(email, password);
      const adminOk = await checkIsAdmin(credential.user.email);
      if (!adminOk) {
        // Not an admin — sign them back out and show an error
        await logoutAdmin();
        setError('This account does not have admin access.');
        return;
      }
      navigate(`${ADMIN_BASE}/dashboard`);
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card animate-scale-in">
        {/* Logo */}
        <div className="login-logo">
          <div
            style={{
              width: 56, height: 56, borderRadius: 'var(--radius-xl)',
              background: 'var(--color-accent-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto var(--space-4)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 'var(--text-xl)' }}>Admin Portal</h1>
          <p>Sign in to manage study materials</p>
        </div>

        {/* Error */}
        {error && <div className="login-error" role="alert">{error}</div>}

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-email">Email address</label>
            <input
              id="admin-email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: 'var(--space-3)' }}
            disabled={loading}
            id="admin-login-submit-btn"
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Signing in…
              </>
            ) : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
          This page is intentionally unlisted.
        </p>
      </div>
    </div>
  );
}
