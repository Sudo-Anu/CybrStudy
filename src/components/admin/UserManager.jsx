import { useState, useEffect, useCallback } from 'react';
import {
  getAllUsers, promoteToAdmin, demoteFromAdmin,
  createUserAccount, removeUserRecord,
} from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Spinner from '../ui/Spinner';

// ---- Role badge ------------------------------------------------
function RoleBadge({ isAdmin }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px',
      borderRadius: 'var(--radius-full)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--fw-semibold)',
      background: isAdmin ? 'var(--color-accent-bg)' : 'var(--color-surface-2)',
      color:      isAdmin ? 'var(--color-accent)'    : 'var(--color-text-3)',
      border: `1px solid ${isAdmin ? 'var(--color-accent-border)' : 'var(--color-border-light)'}`,
    }}>
      {isAdmin ? (
        <>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L3 6.5v5C3 16.09 7.01 20.68 12 22c4.99-1.32 9-5.91 9-10.5v-5L12 2z"/>
          </svg>
          Admin
        </>
      ) : (
        <>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          User
        </>
      )}
    </span>
  );
}

// ---- Avatar initials -------------------------------------------
function Avatar({ email }) {
  const initials = (email || '?')[0].toUpperCase();
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 'var(--radius-full)',
      background: 'var(--color-accent-muted)',
      border: '1px solid var(--color-accent-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-semibold)',
      color: 'var(--color-accent)',
    }}>
      {initials}
    </div>
  );
}

// ---- Add User Modal --------------------------------------------
function AddUserModal({ onClose, onSuccess }) {
  const { addToast } = useToast();
  const [form, setForm]       = useState({ email: '', password: '', displayName: '' });
  const [showPass, setShowPass] = useState(false);
  const [adding, setAdding]   = useState(false);
  const [error, setError]     = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setAdding(true);
    try {
      await createUserAccount(
        form.email.trim().toLowerCase(),
        form.password,
        form.displayName.trim()
      );
      addToast(`${form.email} account created successfully.`, 'success');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'var(--color-overlay-bg)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-scale-in"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-2xl)',
          padding: 'var(--space-8)',
          width: '100%', maxWidth: 420,
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-lg)',
              background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)' }}>Add New User</h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>Create a Firebase Auth account</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} id="add-user-modal-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="login-error" role="alert" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="add-user-name">
              Display name <span style={{ color: 'var(--color-text-3)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              id="add-user-name"
              type="text"
              className="input-field"
              placeholder="e.g. John Doe"
              value={form.displayName}
              onChange={set('displayName')}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="add-user-email">Email address</label>
            <input
              id="add-user-email"
              type="email"
              className="input-field"
              placeholder="user@example.com"
              value={form.email}
              onChange={set('email')}
              required
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="add-user-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="add-user-password"
                type={showPass ? 'text' : 'password'}
                className="input-field"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={set('password')}
                required
                minLength={6}
                autoComplete="new-password"
                style={{ paddingRight: 'var(--space-10)' }}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', right: 'var(--space-3)', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-3)', display: 'flex', alignItems: 'center',
                }}
              >
                {showPass ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
              disabled={adding}
              id="add-user-submit-btn"
            >
              {adding
                ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Creating…</>
                : 'Create Account'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Main component --------------------------------------------
export default function UserManager() {
  const { user: currentUser, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [busy,         setBusy]         = useState(null);
  const [search,       setSearch]       = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAllUsers();
      list.sort((a, b) => {
        if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
        return (a.email || '').localeCompare(b.email || '');
      });
      setUsers(list);
    } catch (err) {
      addToast('Failed to load users: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleRole = async (targetUser) => {
    // Security: verify admin status at logic level
    if (!isAdmin) {
      addToast('Permission denied: admin access required.', 'error');
      return;
    }
    const isCurrentUser = currentUser?.email && targetUser.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim();
    if (isCurrentUser && targetUser.isAdmin) {
      addToast('You cannot remove your own admin access.', 'error');
      return;
    }
    const confirmed = window.confirm(
      targetUser.isAdmin
        ? `Remove admin access from ${targetUser.email}?`
        : `Grant admin access to ${targetUser.email}?`
    );
    if (!confirmed) return;
    setBusy(targetUser.uid);
    try {
      if (targetUser.isAdmin) {
        await demoteFromAdmin(targetUser.email);
        addToast(`${targetUser.email} is now a regular user.`, 'success');
      } else {
        await promoteToAdmin(targetUser.email);
        addToast(`${targetUser.email} is now an admin.`, 'success');
      }
      await fetchUsers();
    } catch (err) {
      addToast(`Failed: ${err.message}`, 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async (targetUser) => {
    // Security: verify admin status at logic level
    if (!isAdmin) {
      addToast('Permission denied: admin access required.', 'error');
      return;
    }
    const isCurrentUser = currentUser?.email && targetUser.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim();
    if (isCurrentUser) {
      addToast('You cannot remove your own account.', 'error');
      return;
    }
    const confirmed = window.confirm(
      `Remove ${targetUser.email} from the system?\nThis revokes their access immediately.`
    );
    if (!confirmed) return;
    setBusy(targetUser.uid);
    try {
      await removeUserRecord(targetUser);
      addToast(`${targetUser.email} removed.`, 'success');
      await fetchUsers();
    } catch (err) {
      addToast('Failed to remove: ' + err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const filtered = users.filter((u) =>
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.displayName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header row */}
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1>Manage Users</h1>
          <p style={{ color: 'var(--color-text-2)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            Create accounts, toggle roles, or remove access.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} id="user-manager-open-add-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/>
            <line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
          Add User
        </button>
      </div>

      {/* Search + refresh */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            className="input-field"
            placeholder="Search by email or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
            id="user-manager-search"
          />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchUsers} disabled={loading} id="user-manager-refresh-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}>
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Users',   value: users.length,                           accent: false },
          { label: 'Admins',        value: users.filter((u) => u.isAdmin).length,  accent: true  },
          { label: 'Regular Users', value: users.filter((u) => !u.isAdmin).length, accent: false },
        ].map((s) => (
          <div key={s.label} style={{
            background: s.accent ? 'var(--color-accent-bg)' : 'var(--color-bg-alt)',
            border: `1px solid ${s.accent ? 'var(--color-accent-border)' : 'var(--color-border-light)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3) var(--space-4)',
            minWidth: 120,
          }}>
            <p style={{ fontSize: 'var(--text-xs)', color: s.accent ? 'var(--color-accent)' : 'var(--color-text-3)', marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-bold)', color: s.accent ? 'var(--color-accent)' : 'var(--color-text)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* User list */}
      {loading ? (
        <Spinner center />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--color-text-3)', fontSize: 'var(--text-sm)' }}>
          {search ? `No users matching "${search}"` : (
            <div>
              <p>No users yet.</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 'var(--space-4)' }} onClick={() => setShowAddModal(true)}>
                Add your first user
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {filtered.map((u) => {
            const isSelf = currentUser?.email && u.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim();
            const isBusy = busy === u.uid;
            return (
              <div
                key={u.uid}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                  background: 'var(--color-surface)',
                  border: `1px solid ${isSelf ? 'var(--color-accent-border)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-3) var(--space-4)',
                  flexWrap: 'wrap',
                }}
              >
                <Avatar email={u.email} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-medium)', color: 'var(--color-text)' }}>
                      {u.displayName || u.email}
                    </span>
                    {isSelf && (
                      <span style={{
                        fontSize: 'var(--text-xs)', color: 'var(--color-text-3)',
                        background: 'var(--color-surface-2)', padding: '1px 8px',
                        borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border-light)',
                      }}>you</span>
                    )}
                  </div>
                  {u.displayName && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: 1 }}>{u.email}</p>
                  )}
                </div>

                <RoleBadge isAdmin={u.isAdmin} />

                {/* Role toggle */}
                <button
                  className={`btn btn-sm ${u.isAdmin ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => handleToggleRole(u)}
                  disabled={isBusy || (isSelf && u.isAdmin)}
                  title={isSelf && u.isAdmin ? 'Cannot remove your own admin access' : ''}
                  id={`user-role-toggle-${u.uid}`}
                  style={{ minWidth: 110, justifyContent: 'center' }}
                >
                  {isBusy ? (
                    <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                  ) : u.isAdmin ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Make User
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 2L3 6.5v5C3 16.09 7.01 20.68 12 22c4.99-1.32 9-5.91 9-10.5v-5L12 2z"/>
                      </svg>
                      Make Admin
                    </>
                  )}
                </button>

                {/* Remove */}
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => handleRemove(u)}
                  disabled={isBusy || isSelf}
                  title={isSelf ? 'Cannot remove yourself' : `Remove ${u.email}`}
                  id={`user-remove-${u.uid}`}
                  style={{ color: isSelf ? 'var(--color-text-3)' : 'var(--color-error)', padding: 'var(--space-2)' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchUsers}
        />
      )}
    </div>
  );
}
