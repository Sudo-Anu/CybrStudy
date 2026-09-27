import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ className = '', style = {}, showLabel = false, id = 'theme-toggle-btn' }) {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      id={id}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        background: 'none',
        border: '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '6px 10px',
        cursor: 'pointer',
        color: 'var(--color-text-2)',
        transition: 'all var(--transition-fast)',
        userSelect: 'none',
        ...style,
      }}
    >
      <span className="theme-toggle-icon-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isDark ? (
          /* Warm Sun Icon */
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-fade-in"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          /* Warm Crescent Moon Icon */
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-2)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-fade-in"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </span>

      {showLabel && (
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-medium)', color: 'var(--color-text-2)' }}>
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}
