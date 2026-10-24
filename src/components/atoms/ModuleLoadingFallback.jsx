import './ModuleLoadingFallback.css';
/**
 * ModuleLoadingFallback Component
 * Shimmering glassmorphic loading placeholder used during React.lazy() chunk loading.
 */
export default function ModuleLoadingFallback({ label = 'Loading Module' }) {
  return (
    <div
      className="module-loading-fallback-s1"
      role="status"
      aria-live="polite"
    >
      <div
        className="module-loading-fallback-s2"
      />
      <div className="module-loading-fallback-s3">
        {label}...
      </div>
      <div className="module-loading-fallback-s4">
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
