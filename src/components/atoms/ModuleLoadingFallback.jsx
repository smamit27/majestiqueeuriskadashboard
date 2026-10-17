/**
 * ModuleLoadingFallback Component
 * Shimmering glassmorphic loading placeholder used during React.lazy() chunk loading.
 */
export default function ModuleLoadingFallback({ label = 'Loading Module' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        minHeight: '380px',
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '24px',
        border: '1px solid rgba(226, 232, 240, 0.85)',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
        textAlign: 'center',
        gap: '16px'
      }}
      role="status"
      aria-live="polite"
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '3.5px solid rgba(2, 132, 199, 0.15)',
          borderTopColor: '#0284c7',
          borderRadius: '50%',
          animation: 'moduleFallbackSpin 0.8s linear infinite'
        }}
      />
      <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0f2952' }}>
        {label}...
      </div>
      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
        Loading optimized module chunk on demand
      </div>
      <style>{`
        @keyframes moduleFallbackSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
