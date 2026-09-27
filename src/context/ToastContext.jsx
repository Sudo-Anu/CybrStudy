import { createContext, useCallback, useContext, useRef, useState } from 'react';
import '../styles/components.css';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const icons = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role="alert">
            <span style={{ fontWeight: 600, fontSize: '1rem', flexShrink: 0 }}>
              {icons[t.type]}
            </span>
            <span style={{ flex: 1, color: 'var(--color-text)', fontSize: 'var(--text-sm)' }}>
              {t.message}
            </span>
            <button
              onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-3)', fontSize: '1rem', padding: '0 2px',
              }}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
