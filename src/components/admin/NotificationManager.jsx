import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  subscribeToNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  toggleNotificationActive,
} from '../../services/notificationService';

// ---- Type options ----
const TYPES = [
  { value: 'info',    label: 'Notice',   color: 'var(--color-info)' },
  { value: 'success', label: 'Update',   color: 'var(--color-success)' },
  { value: 'warning', label: 'Reminder', color: 'var(--color-warning)' },
  { value: 'urgent',  label: 'Urgent',   color: 'var(--color-error)' },
];

const TYPE_ICONS = {
  info: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  warning: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  success: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  urgent: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
};

// ---- Default blank form ----
const BLANK = { title: '', body: '', type: 'info', linkUrl: '', linkLabel: '', active: true, order: 0 };

// ---- Add / Edit Modal ----
function NotifModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setCheck = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    try {
      await onSave({ ...form, title: form.title.trim(), order: Number(form.order) || 0 });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
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
          width: '100%', maxWidth: 500,
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-lg)',
              background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', margin: 0 }}>{initial ? 'Edit Notification' : 'New Notification'}</h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', margin: 0 }}>Shown above Academic Sections</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} id="notif-modal-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && (
          <div className="login-error" role="alert" style={{ marginBottom: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="notif-title">Title <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input id="notif-title" className="input-field" placeholder="e.g. Exam schedule updated" value={form.title} onChange={set('title')} required maxLength={120} />
          </div>

          {/* Body */}
          <div className="form-group">
            <label className="form-label" htmlFor="notif-body">
              Description <span style={{ color: 'var(--color-text-3)', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              id="notif-body"
              className="input-field"
              placeholder="Additional details shown below the title…"
              value={form.body}
              onChange={set('body')}
              rows={2}
              maxLength={300}
              style={{ resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)' }}
            />
          </div>

          {/* Type + Order row */}
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label" htmlFor="notif-type">Type / Style</label>
              <select id="notif-type" className="input-field" value={form.type} onChange={set('type')}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="notif-order">Order</label>
              <input id="notif-order" type="number" className="input-field" value={form.order} onChange={set('order')} min={0} max={999} />
            </div>
          </div>

          {/* Link URL */}
          <div className="form-group">
            <label className="form-label" htmlFor="notif-url">
              Link URL <span style={{ color: 'var(--color-text-3)', fontWeight: 400 }}>(optional — leave blank for no link)</span>
            </label>
            <input id="notif-url" type="url" className="input-field" placeholder="https://…" value={form.linkUrl} onChange={set('linkUrl')} />
          </div>

          {/* Link label */}
          {form.linkUrl?.trim() && (
            <div className="form-group">
              <label className="form-label" htmlFor="notif-link-label">Button label</label>
              <input id="notif-link-label" className="input-field" placeholder="Learn more" value={form.linkLabel} onChange={set('linkLabel')} maxLength={40} />
            </div>
          )}

          {/* Active toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', userSelect: 'none', padding: 'var(--space-3) var(--space-4)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-light)' }}>
            <input type="checkbox" checked={form.active} onChange={setCheck('active')} id="notif-active" style={{ accentColor: 'var(--color-accent)', width: 16, height: 16 }} />
            <div>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-medium)', color: 'var(--color-text)' }}>Publish immediately</span>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', margin: 0 }}>When checked, this will appear on the homepage right away.</p>
            </div>
          </label>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={saving} id="notif-save-btn">
              {saving ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving…</> : (initial ? 'Save Changes' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Main Manager -------------------------------------------------------
export default function NotificationManager() {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [loading,  setLoading]   = useState(true);
  const [busy,     setBusy]      = useState(null);
  const [modal,    setModal]     = useState(null); // null | { mode: 'add' } | { mode: 'edit', notif }

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToNotifications((list) => {
      setNotifications(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleCreate = useCallback(async (data) => {
    if (!isAdmin) return;
    await createNotification({ ...data, order: notifications.length });
    addToast('Notification created.', 'success');
  }, [isAdmin, notifications.length, addToast]);

  const handleUpdate = useCallback(async (id, data) => {
    if (!isAdmin) return;
    await updateNotification(id, data);
    addToast('Notification updated.', 'success');
  }, [isAdmin, addToast]);

  const handleToggle = async (notif) => {
    if (!isAdmin) return;
    setBusy(notif.id);
    try {
      await toggleNotificationActive(notif.id, notif.active !== false);
      addToast(notif.active !== false ? 'Notification hidden.' : 'Notification published.', 'success');
    } catch (err) {
      addToast('Failed: ' + err.message, 'error');
    } finally { setBusy(null); }
  };

  const handleDelete = async (notif) => {
    if (!isAdmin) return;
    if (!window.confirm(`Delete notification "${notif.title}"?`)) return;
    setBusy(notif.id);
    try {
      await deleteNotification(notif.id);
      addToast('Notification deleted.', 'success');
    } catch (err) {
      addToast('Failed: ' + err.message, 'error');
    } finally { setBusy(null); }
  };

  const TYPE_COLOR = { info: 'var(--color-info)', warning: 'var(--color-warning)', success: 'var(--color-success)', urgent: 'var(--color-error)' };

  return (
    <div>
      {/* Header */}
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1>Notifications</h1>
          <p style={{ color: 'var(--color-text-2)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            Announcements shown above Academic Sections on the homepage.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ mode: 'add' })} id="notif-add-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Notification
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: notifications.length, accent: false },
          { label: 'Live',  value: notifications.filter((n) => n.active !== false).length, accent: true },
          { label: 'Hidden', value: notifications.filter((n) => n.active === false).length, accent: false },
        ].map((s) => (
          <div key={s.label} style={{
            background: s.accent ? 'var(--color-accent-bg)' : 'var(--color-bg-alt)',
            border: `1px solid ${s.accent ? 'var(--color-accent-border)' : 'var(--color-border-light)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3) var(--space-4)',
            minWidth: 100,
          }}>
            <p style={{ fontSize: 'var(--text-xs)', color: s.accent ? 'var(--color-accent)' : 'var(--color-text-3)', marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-bold)', color: s.accent ? 'var(--color-accent)' : 'var(--color-text)', margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <h3>No notifications yet</h3>
          <p style={{ fontSize: 'var(--text-sm)' }}>Create your first announcement to show it on the homepage.</p>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 'var(--space-4)' }} onClick={() => setModal({ mode: 'add' })}>
            Create first notification
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {notifications.map((n) => {
            const isActive = n.active !== false;
            const isBusy   = busy === n.id;
            const typeColor = TYPE_COLOR[n.type] || TYPE_COLOR.info;
            const typeLabel = TYPES.find((t) => t.value === n.type)?.label || n.type;
            return (
              <div
                key={n.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                  background: 'var(--color-surface)',
                  border: `1px solid ${isActive ? 'var(--color-border)' : 'var(--color-border-light)'}`,
                  borderLeft: `4px solid ${isActive ? typeColor : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-3) var(--space-4)',
                  opacity: isActive ? 1 : 0.6,
                  flexWrap: 'wrap',
                  transition: 'all var(--transition-fast)',
                }}
                id={`notif-row-${n.id}`}
              >
                {/* Type icon */}
                <div style={{ color: isActive ? typeColor : 'var(--color-text-3)', flexShrink: 0 }}>
                  {TYPE_ICONS[n.type] || TYPE_ICONS.info}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: typeColor, fontWeight: 'var(--fw-semibold)', background: 'var(--color-bg-alt)', border: `1px solid var(--color-border-light)`, borderRadius: 'var(--radius-full)', padding: '0 7px' }}>
                      {typeLabel}
                    </span>
                    <span style={{ fontWeight: 'var(--fw-medium)', fontSize: 'var(--text-sm)', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.title}
                    </span>
                    {!isActive && (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-full)', padding: '0 7px', border: '1px solid var(--color-border-light)' }}>
                        Hidden
                      </span>
                    )}
                  </div>
                  {n.body && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</p>}
                  {n.linkUrl && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-info)', marginTop: 2 }}>↗ {n.linkUrl}</p>}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexShrink: 0 }}>
                  {/* Toggle active */}
                  <button
                    className={`btn btn-sm ${isActive ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => handleToggle(n)}
                    disabled={isBusy}
                    title={isActive ? 'Hide from homepage' : 'Publish to homepage'}
                    id={`notif-toggle-${n.id}`}
                    style={{ minWidth: 80, justifyContent: 'center' }}
                  >
                    {isBusy ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                      : isActive ? 'Hide' : 'Publish'}
                  </button>

                  {/* Edit */}
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setModal({ mode: 'edit', notif: n })}
                    disabled={isBusy}
                    title="Edit notification"
                    id={`notif-edit-${n.id}`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>

                  {/* Delete */}
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleDelete(n)}
                    disabled={isBusy}
                    title={`Delete "${n.title}"`}
                    id={`notif-delete-${n.id}`}
                    style={{ color: 'var(--color-error)' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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

      {/* Modal */}
      {modal?.mode === 'add' && (
        <NotifModal
          onClose={() => setModal(null)}
          onSave={handleCreate}
        />
      )}
      {modal?.mode === 'edit' && (
        <NotifModal
          initial={modal.notif}
          onClose={() => setModal(null)}
          onSave={(data) => handleUpdate(modal.notif.id, data)}
        />
      )}
    </div>
  );
}
