import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[CybrStudy] Unhandled error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-card">
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--color-error-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto var(--space-5)',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-3)' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
              An unexpected error occurred. Try refreshing the page.
            </p>
            {this.state.error && (
              <details style={{ textAlign: 'left', marginBottom: 'var(--space-5)' }}>
                <summary style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', cursor: 'pointer', marginBottom: 'var(--space-2)' }}>
                  Error details
                </summary>
                <pre style={{
                  fontSize: 'var(--text-xs)', color: 'var(--color-error)',
                  background: 'var(--color-error-bg)', borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3)', overflow: 'auto', whiteSpace: 'pre-wrap',
                }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              className="btn btn-primary"
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              id="error-boundary-reload-btn"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
