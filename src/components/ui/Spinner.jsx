export default function Spinner({ size = 'md', center = false }) {
  const cls = size === 'lg' ? 'spinner spinner--lg' : 'spinner';
  if (center) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <span className={cls} role="status" aria-label="Loading" />
      </div>
    );
  }
  return <span className={cls} role="status" aria-label="Loading" />;
}
