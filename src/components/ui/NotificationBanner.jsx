import { useState, useEffect } from 'react';
import { subscribeToActiveNotifications } from '../../services/notificationService';

// ---- Type config -------------------------------------------------------
const TYPE_CONFIG = {
  info: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    colorVar:      'var(--color-info)',
    bgVar:         'var(--color-info-bg)',
    borderVar:     'var(--color-info-border)',
    glowColor:     'rgba(54, 100, 136, 0.12)',
    pulseColor:    'rgba(54, 100, 136, 0.35)',
    badgeLabel:    'Notice',
  },
  warning: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    colorVar:      'var(--color-warning)',
    bgVar:         'var(--color-warning-bg)',
    borderVar:     'var(--color-warning-border)',
    glowColor:     'rgba(144, 98, 24, 0.10)',
    pulseColor:    'rgba(144, 98, 24, 0.35)',
    badgeLabel:    'Reminder',
  },
  success: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    colorVar:      'var(--color-success)',
    bgVar:         'var(--color-success-bg)',
    borderVar:     'var(--color-success-border)',
    glowColor:     'rgba(60, 110, 74, 0.10)',
    pulseColor:    'rgba(60, 110, 74, 0.35)',
    badgeLabel:    'Update',
  },
  urgent: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    colorVar:      'var(--color-error)',
    bgVar:         'var(--color-error-bg)',
    borderVar:     'var(--color-error-border)',
    glowColor:     'rgba(164, 58, 41, 0.12)',
    pulseColor:    'rgba(164, 58, 41, 0.40)',
    badgeLabel:    'Urgent',
  },
};

// ---- Single notification card -----------------------------------------
function NotificationCard({ notification, onDismiss, dismissed }) {
  const cfg = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info;
  const hasLink = notification.linkUrl?.trim();
  const label   = notification.linkLabel?.trim() || 'Learn more';

  if (dismissed) return null;

  return (
    <div
      className="notif-card animate-fade-in"
      style={{
        background:   cfg.bgVar,
        border:       `1px solid ${cfg.borderVar}`,
        borderLeft:   `4px solid ${cfg.colorVar}`,
        borderRadius: 'var(--radius-xl)',
        padding:      'var(--space-4) var(--space-5)',
        display:      'flex',
        alignItems:   'flex-start',
        gap:          'var(--space-4)',
        position:     'relative',
        overflow:     'hidden',
        boxShadow:    `0 2px 16px ${cfg.glowColor}`,
        transition:   'box-shadow var(--transition-base), transform var(--transition-base)',
      }}
      id={`notif-card-${notification.id}`}
    >
      {/* Ambient glow blob */}
      <div style={{
        position: 'absolute', top: -24, right: -24,
        width: 120, height: 120, borderRadius: '50%',
        background: cfg.glowColor,
        filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />

      {/* Pulse dot + icon */}
      <div style={{
        flexShrink: 0,
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36, height: 36,
        borderRadius: 'var(--radius-lg)',
        background: cfg.bgVar,
        border:     `1px solid ${cfg.borderVar}`,
        color:      cfg.colorVar,
        position:   'relative',
        marginTop:  2,
      }}>
        {/* Animated pulse ring for urgent */}
        {notification.type === 'urgent' && (
          <span style={{
            position: 'absolute', inset: -4,
            borderRadius: 'var(--radius-lg)',
            border: `2px solid ${cfg.pulseColor}`,
            animation: 'notifPulse 1.8s ease-in-out infinite',
          }} />
        )}
        {cfg.icon}
      </div>

      {/* Text content */}
      <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)', flexWrap: 'wrap' }}>
          <span style={{
            fontSize:     'var(--text-xs)',
            fontWeight:   'var(--fw-semibold)',
            color:        cfg.colorVar,
            background:   cfg.bgVar,
            border:       `1px solid ${cfg.borderVar}`,
            borderRadius: 'var(--radius-full)',
            padding:      '1px 8px',
            letterSpacing: '0.02em',
          }}>
            {cfg.badgeLabel}
          </span>
          <span style={{
            fontWeight: 'var(--fw-semibold)',
            fontSize:   'var(--text-sm)',
            color:      'var(--color-text)',
            lineHeight: 1.3,
          }}>
            {notification.title}
          </span>
        </div>

        {notification.body && (
          <p style={{
            fontSize:   'var(--text-xs)',
            color:      'var(--color-text-2)',
            lineHeight: 1.55,
            margin:     0,
          }}>
            {notification.body}
          </p>
        )}

        {hasLink && (
          <a
            href={notification.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            id={`notif-link-${notification.id}`}
            style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          'var(--space-1)',
              marginTop:    'var(--space-2)',
              fontSize:     'var(--text-xs)',
              fontWeight:   'var(--fw-semibold)',
              color:        cfg.colorVar,
              textDecoration: 'none',
              transition:   'opacity var(--transition-fast)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.75'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {label}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(notification.id)}
        aria-label="Dismiss notification"
        id={`notif-dismiss-${notification.id}`}
        style={{
          flexShrink:  0,
          background:  'none',
          border:      'none',
          cursor:      'pointer',
          color:       'var(--color-text-3)',
          padding:     'var(--space-1)',
          borderRadius:'var(--radius-md)',
          display:     'flex',
          alignItems:  'center',
          transition:  'color var(--transition-fast)',
          zIndex:      1,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-3)'; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

// ---- Main exported component ------------------------------------------
export default function NotificationBanner() {
  const [notifications, setNotifications] = useState([]);
  const [permError,     setPermError]     = useState(false);
  const [dismissed,     setDismissed]     = useState(() => {
    try {
      return new Set(JSON.parse(sessionStorage.getItem('cs_dismissed_notifs') || '[]'));
    } catch { return new Set(); }
  });

  useEffect(() => {
    return subscribeToActiveNotifications(
      (list) => { setPermError(false); setNotifications(list); },
      (err)  => {
        // Firestore permission denied — rules don't include 'notifications' collection yet
        if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
          setPermError(true);
          console.warn(
            '[CybrStudy] NotificationBanner: Firestore permission denied for `notifications` collection.\n' +
            'Add the following to your Firestore Security Rules:\n\n' +
            '  match /notifications/{document=**} {\n' +
            '    allow read:  if request.auth != null;\n' +
            '    allow write: if isAdmin();\n' +
            '  }\n\n' +
            'See README.md → Step 3 for the full updated rules.'
          );
        }
      }
    );
  }, []);

  const handleDismiss = (id) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try { sessionStorage.setItem('cs_dismissed_notifs', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // Silently hide if permission error or no notifications
  const visible = notifications.filter((n) => !dismissed.has(n.id));
  if (permError || visible.length === 0) return null;

  return (
    <section
      aria-label="Notifications"
      style={{
        marginBottom:    'var(--space-8)',
        display:         'flex',
        flexDirection:   'column',
        gap:             'var(--space-3)',
      }}
    >
      {/* Section header */}
      <div style={{
        display:     'flex',
        alignItems:  'center',
        gap:         'var(--space-2)',
        marginBottom:'var(--space-1)',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span style={{
          fontSize:    'var(--text-xs)',
          fontWeight:  'var(--fw-semibold)',
          color:       'var(--color-text-3)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          Announcements
        </span>
        <span style={{
          fontSize:    'var(--text-xs)',
          fontWeight:  'var(--fw-semibold)',
          color:       'var(--color-accent)',
          background:  'var(--color-accent-muted)',
          border:      '1px solid var(--color-accent-border)',
          borderRadius:'var(--radius-full)',
          padding:     '0px 7px',
        }}>
          {visible.length}
        </span>
      </div>

      {/* Cards */}
      {visible.map((n) => (
        <NotificationCard
          key={n.id}
          notification={n}
          onDismiss={handleDismiss}
          dismissed={dismissed.has(n.id)}
        />
      ))}

      {/* Keyframe injected once */}
      <style>{`
        @keyframes notifPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 0.15; transform: scale(1.12); }
        }
        .notif-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.08) !important;
        }
        @media (max-width: 640px) {
          .notif-card {
            padding: var(--space-3) var(--space-3) !important;
            gap: var(--space-3) !important;
          }
        }
      `}</style>
    </section>
  );
}
