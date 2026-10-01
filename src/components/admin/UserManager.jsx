import { useState, useEffect, useCallback } from 'react';
import {
  getAllUsers,
  promoteToAdmin,
  demoteFromAdmin,
  setUserDisabledStatus,
  createUserAccount,
  removeUserRecord,
} from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { timeAgo } from '../../utils/helpers';
import Spinner from '../ui/Spinner';

// ---- Role badge ------------------------------------------------
function RoleBadge({ isAdmin }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--fw-semibold)',
        background: isAdmin ? 'var(--color-accent-bg)' : 'var(--color-surface-2)',
        color: isAdmin ? 'var(--color-accent)' : 'var(--color-text-3)',
        border: `1px solid ${isAdmin ? 'var(--color-accent-border)' : 'var(--color-border-light)'}`,
      }}
    >
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

// ---- Online / Offline presence check ----------------------------
function isUserOnline(user, currentUser) {
  if (!user) return false;
  // If user is currently signed in in this browser session, they are online
  if (currentUser?.email && user.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) {
    return true;
  }
  if (!user.lastSeen) return false;
  try {
    const timeMs = user.lastSeen?.toDate
      ? user.lastSeen.toDate().getTime()
      : typeof user.lastSeen === 'number'
      ? user.lastSeen
      : new Date(user.lastSeen).getTime();
    if (isNaN(timeMs)) return false;
    // Considered online if active within last 4 minutes
    return Date.now() - timeMs < 4 * 60 * 1000;
  } catch {
    return false;
  }
}

// ---- Online / Offline Presence Badge ---------------------------
function PresenceBadge({ isOnline }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 9px',
        borderRadius: 'var(--radius-full)',
        fontSize: '11px',
        fontWeight: 'var(--fw-semibold)',
        background: isOnline ? 'rgba(34, 197, 94, 0.12)' : 'var(--color-surface-2)',
        color: isOnline ? '#22c55e' : 'var(--color-text-3)',
        border: `1px solid ${isOnline ? 'rgba(34, 197, 94, 0.3)' : 'var(--color-border-light)'}`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: isOnline ? '#22c55e' : 'var(--color-text-3)',
          boxShadow: isOnline ? '0 0 6px rgba(34, 197, 94, 0.7)' : 'none',
        }}
      />
      {isOnline ? 'Online' : 'Offline'}
    </span>
  );
}

// ---- Avatar initials -------------------------------------------
function Avatar({ email, disabled }) {
  const initials = (email || '?')[0].toUpperCase();
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 'var(--radius-full)',
        background: disabled ? 'var(--color-surface-2)' : 'var(--color-accent-muted)',
        border: `1px solid ${disabled ? 'var(--color-border)' : 'var(--color-accent-border)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--fw-semibold)',
        color: disabled ? 'var(--color-text-3)' : 'var(--color-accent)',
      }}
    >
      {initials}
    </div>
  );
}

// ---- Add User Modal --------------------------------------------
function AddUserModal({ onClose, onSuccess }) {
  const { addToast } = useToast();
  const [form, setForm] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'user', // 'user' | 'admin'
  });
  const [showPass, setShowPass] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm((f) => ({ ...f, password: res }));
    setShowPass(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = form.email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Email address is required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setAdding(true);
    try {
      const isMakeAdmin = form.role === 'admin';
      const result = await createUserAccount(
        cleanEmail,
        form.password,
        form.displayName.trim(),
        isMakeAdmin
      );

      if (result.alreadyExists) {
        addToast(
          `${cleanEmail} already existed in Auth — profile & permissions updated.`,
          'info'
        );
      } else {
        addToast(
          `Account for ${cleanEmail} created successfully (${isMakeAdmin ? 'Admin' : 'Regular User'}).`,
          'success'
        );
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create user.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'var(--color-overlay-bg)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
          padding: 'var(--space-6)',
          width: '100%',
          maxWidth: 440,
          boxShadow: 'var(--shadow-xl)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-lg)',
              background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)' }}>Add New User</h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>Create user account or register an admin</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} id="add-user-modal-close" aria-label="Close modal">
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
              Display Name <span style={{ color: 'var(--color-text-3)', fontWeight: 400 }}>(optional)</span>
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
            <label className="form-label" htmlFor="add-user-email">Email Address</label>
            <input
              id="add-user-email"
              type="email"
              className="input-field"
              placeholder="user@example.com"
              value={form.email}
              onChange={set('email')}
              required
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
              <label className="form-label" htmlFor="add-user-password" style={{ margin: 0 }}>Password</label>
              <button
                type="button"
                onClick={generatePassword}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-accent)',
                  fontSize: 'var(--text-xs)',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Generate strong
              </button>
            </div>
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

          <div className="form-group">
            <label className="form-label">Account Role</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${form.role === 'user' ? 'var(--color-accent-border)' : 'var(--color-border-light)'}`,
                  background: form.role === 'user' ? 'var(--color-accent-bg)' : 'var(--color-bg-alt)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <input
                  type="radio"
                  name="role"
                  value="user"
                  checked={form.role === 'user'}
                  onChange={set('role')}
                />
                <span>Regular User</span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${form.role === 'admin' ? 'var(--color-accent-border)' : 'var(--color-border-light)'}`,
                  background: form.role === 'admin' ? 'var(--color-accent-bg)' : 'var(--color-bg-alt)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={form.role === 'admin'}
                  onChange={set('role')}
                />
                <span style={{ fontWeight: varFormWeight(form.role === 'admin') }}>Admin</span>
              </label>
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
              {adding ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Saving…
                </>
              ) : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function varFormWeight(isActive) {
  return isActive ? 'var(--fw-semibold)' : 'var(--fw-normal)';
}

// ---- Main UserManager Component --------------------------------
export default function UserManager() {
  const { user: currentUser, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // 'all' | 'admins' | 'users' | 'disabled'
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
      const list = await getAllUsers();
      list.sort((a, b) => {
        if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
        return (a.email || '').localeCompare(b.email || '');
      });
      setUsers(list);
    } catch (err) {
      addToast('Failed to load users: ' + (err.message || 'unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchUsers(false);
  }, [fetchUsers]);

  // Role toggle (User <-> Admin)
  const handleToggleRole = async (targetUser) => {
    if (!isAdmin) {
      addToast('Permission denied: admin privileges required.', 'error');
      return;
    }
    const isCurrentUser =
      currentUser?.email &&
      targetUser.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim();

    if (isCurrentUser && targetUser.isAdmin) {
      addToast('You cannot remove your own admin access.', 'error');
      return;
    }

    const actionText = targetUser.isAdmin ? 'demote to regular user' : 'promote to administrator';
    const confirmed = window.confirm(`Are you sure you want to ${actionText} for ${targetUser.email}?`);
    if (!confirmed) return;

    setBusyUid(targetUser.uid);
    try {
      if (targetUser.isAdmin) {
        await demoteFromAdmin(targetUser.email, targetUser.uid);
        addToast(`${targetUser.email} is now a regular user.`, 'success');
      } else {
        await promoteToAdmin(targetUser.email, targetUser.uid);
        addToast(`${targetUser.email} is now an administrator.`, 'success');
      }
      await fetchUsers(false);
    } catch (err) {
      addToast(`Action failed: ${err.message}`, 'error');
    } finally {
      setBusyUid(null);
    }
  };

  // Toggle Disabled / Enabled status
  const handleToggleDisabled = async (targetUser) => {
    if (!isAdmin) {
      addToast('Permission denied: admin privileges required.', 'error');
      return;
    }
    const isCurrentUser =
      currentUser?.email &&
      targetUser.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim();

    if (isCurrentUser) {
      addToast('You cannot deactivate your own account.', 'error');
      return;
    }

    const nextDisabled = !targetUser.disabled;
    const confirmed = window.confirm(
      nextDisabled
        ? `Deactivate ${targetUser.email}?\nThey will be signed out and prevented from accessing the site.`
        : `Re-activate access for ${targetUser.email}?`
    );
    if (!confirmed) return;

    setBusyUid(targetUser.uid);
    try {
      await setUserDisabledStatus(targetUser.uid, targetUser.email, nextDisabled);
      addToast(
        nextDisabled ? `${targetUser.email} has been deactivated.` : `${targetUser.email} has been re-activated.`,
        'info'
      );
      await fetchUsers(false);
    } catch (err) {
      addToast(`Failed: ${err.message}`, 'error');
    } finally {
      setBusyUid(null);
    }
  };

  // Remove user completely
  const handleRemove = async (targetUser) => {
    if (!isAdmin) {
      addToast('Permission denied: admin privileges required.', 'error');
      return;
    }
    const isCurrentUser =
      currentUser?.email &&
      targetUser.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim();

    if (isCurrentUser) {
      addToast('You cannot remove your own account.', 'error');
      return;
    }

    const confirmed = window.confirm(
      `Permanently remove ${targetUser.email} from CybrStudy?\nThis revokes all permissions and removes their records.`
    );
    if (!confirmed) return;

    setBusyUid(targetUser.uid);
    try {
      await removeUserRecord(targetUser);
      addToast(`${targetUser.email} was removed successfully.`, 'success');
      await fetchUsers(false);
    } catch (err) {
      addToast('Failed to remove: ' + err.message, 'error');
    } finally {
      setBusyUid(null);
    }
  };

  // Online counts & filters
  const totalCount = users.length;
  const onlineCount = users.filter((u) => isUserOnline(u, currentUser)).length;
  const offlineCount = totalCount - onlineCount;
  const adminCount = users.filter((u) => u.isAdmin).length;
  const disabledCount = users.filter((u) => u.disabled).length;

  // Filtered users
  const filtered = users.filter((u) => {
    const matchesSearch =
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.displayName || '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterRole === 'online') return isUserOnline(u, currentUser);
    if (filterRole === 'offline') return !isUserOnline(u, currentUser);
    if (filterRole === 'admins') return u.isAdmin;
    if (filterRole === 'disabled') return u.disabled;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1>Manage Users</h1>
          <p style={{ color: 'var(--color-text-2)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            Monitor online status, assign administrative roles, deactivate accounts, or invite new users.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} id="user-manager-open-add-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add User
        </button>
      </div>

      {/* Stats row */}
      <div className="user-manager-stats">
        <div className="user-stat-card">
          <span className="user-stat-card-label">Total Registered</span>
          <span className="user-stat-card-val">{totalCount}</span>
        </div>
        <div className="user-stat-card" style={{ borderColor: 'rgba(34, 197, 94, 0.3)', background: 'rgba(34, 197, 94, 0.08)' }}>
          <span className="user-stat-card-label" style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
            Online Now
          </span>
          <span className="user-stat-card-val" style={{ color: '#22c55e' }}>{onlineCount}</span>
        </div>
        <div className="user-stat-card">
          <span className="user-stat-card-label">Offline</span>
          <span className="user-stat-card-val">{offlineCount}</span>
        </div>
        <div className="user-stat-card user-stat-card--accent">
          <span className="user-stat-card-label">Administrators</span>
          <span className="user-stat-card-val">{adminCount}</span>
        </div>
      </div>

      {/* Search & Filter pills */}
      <div className="user-manager-controls">
        <div className="user-manager-search-bar">
          <div style={{ position: 'relative', flex: 1 }}>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="search"
              className="input-field"
              placeholder="Filter by email or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
              id="user-manager-search"
            />
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchUsers(true)}
            disabled={loading}
            id="user-manager-refresh-btn"
            title="Refresh users list"
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
            >
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Filter pills */}
        <div className="user-manager-filter-pills">
          <button
            type="button"
            className={`user-filter-pill ${filterRole === 'all' ? 'user-filter-pill--active' : ''}`}
            onClick={() => setFilterRole('all')}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            className={`user-filter-pill ${filterRole === 'online' ? 'user-filter-pill--active' : ''}`}
            onClick={() => setFilterRole('online')}
            style={{ color: filterRole === 'online' ? '#22c55e' : undefined }}
          >
            Online ({onlineCount})
          </button>
          <button
            type="button"
            className={`user-filter-pill ${filterRole === 'offline' ? 'user-filter-pill--active' : ''}`}
            onClick={() => setFilterRole('offline')}
          >
            Offline ({offlineCount})
          </button>
          <button
            type="button"
            className={`user-filter-pill ${filterRole === 'admins' ? 'user-filter-pill--active' : ''}`}
            onClick={() => setFilterRole('admins')}
          >
            Admins ({adminCount})
          </button>
          {disabledCount > 0 && (
            <button
              type="button"
              className={`user-filter-pill ${filterRole === 'disabled' ? 'user-filter-pill--active' : ''}`}
              onClick={() => setFilterRole('disabled')}
              style={{ color: filterRole === 'disabled' ? 'var(--color-error)' : undefined }}
            >
              Deactivated ({disabledCount})
            </button>
          )}
        </div>
      </div>

      {/* User list */}
      {loading ? (
        <Spinner center />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-3)', fontSize: 'var(--text-sm)', background: 'var(--color-surface)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
          {search ? (
            <p>No users matching &quot;{search}&quot;</p>
          ) : (
            <div>
              <p style={{ fontWeight: 'var(--fw-medium)', color: 'var(--color-text)' }}>No users found</p>
              <p style={{ marginTop: 'var(--space-1)' }}>Get started by inviting your first student or administrator.</p>
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: 'var(--space-4)' }}
                onClick={() => setShowAddModal(true)}
              >
                Add User
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="user-manager-list">
          {filtered.map((u) => {
            const isSelf =
              currentUser?.email &&
              u.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim();
            const isBusy = busyUid === u.uid;
            const isOnline = isUserOnline(u, currentUser);
            const activityText = isOnline
              ? 'Active now'
              : u.lastSeen
              ? `Last active ${timeAgo(u.lastSeen)}`
              : 'Never signed in';

            return (
              <div
                key={u.uid}
                className={`user-row-card ${isSelf ? 'user-row-card--self' : ''} ${u.disabled ? 'user-row-card--disabled' : ''}`}
              >
                {/* Left profile info */}
                <div className="user-row-main">
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar email={u.email} disabled={u.disabled} />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -1,
                        right: -1,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: isOnline ? '#22c55e' : 'var(--color-text-3)',
                        border: '2px solid var(--color-surface)',
                      }}
                      title={isOnline ? 'Online' : 'Offline'}
                    />
                  </div>
                  <div className="user-row-info">
                    <div className="user-row-title-wrap">
                      <span className="user-row-name">
                        {u.displayName || u.email.split('@')[0]}
                      </span>
                      {isSelf && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-accent)',
                            background: 'var(--color-accent-bg)',
                            padding: '1px 8px',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid var(--color-accent-border)',
                            fontWeight: 'var(--fw-semibold)',
                          }}
                        >
                          You
                        </span>
                      )}
                    </div>
                    <span className="user-row-email">{u.email}</span>
                    <span className="user-row-meta">
                      <span>•</span>
                      <span>{activityText}</span>
                    </span>
                  </div>
                </div>

                {/* Badges */}
                <div className="user-row-badges">
                  <PresenceBadge isOnline={isOnline} />
                  <RoleBadge isAdmin={u.isAdmin} />
                  {u.disabled && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '11px',
                        fontWeight: 'var(--fw-medium)',
                        background: 'var(--color-error-bg)',
                        color: 'var(--color-error)',
                        border: '1px solid var(--color-error-border)',
                      }}
                    >
                      Deactivated
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="user-row-actions">
                  {/* Role toggle */}
                  <button
                    className={`btn btn-sm ${u.isAdmin ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => handleToggleRole(u)}
                    disabled={isBusy || (isSelf && u.isAdmin)}
                    title={isSelf && u.isAdmin ? 'You cannot remove your own admin access' : ''}
                    id={`user-role-toggle-${u.uid}`}
                    style={{ minWidth: 105, justifyContent: 'center' }}
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

                  {/* Disable / Enable access toggle */}
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleToggleDisabled(u)}
                    disabled={isBusy || isSelf}
                    title={isSelf ? 'Cannot deactivate yourself' : u.disabled ? 'Re-activate user' : 'Deactivate user access'}
                    id={`user-disable-toggle-${u.uid}`}
                    style={{
                      color: u.disabled ? 'var(--color-success)' : 'var(--color-warning)',
                      minWidth: 80,
                      justifyContent: 'center',
                    }}
                  >
                    {u.disabled ? 'Activate' : 'Disable'}
                  </button>

                  {/* Delete record */}
                  <button
                    className="btn btn-sm btn-ghost btn-icon"
                    onClick={() => handleRemove(u)}
                    disabled={isBusy || isSelf}
                    title={isSelf ? 'Cannot remove yourself' : `Remove ${u.email}`}
                    id={`user-remove-${u.uid}`}
                    style={{ color: isSelf ? 'var(--color-text-3)' : 'var(--color-error)' }}
                    aria-label="Remove user"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => fetchUsers(false)}
        />
      )}
    </div>
  );
}
