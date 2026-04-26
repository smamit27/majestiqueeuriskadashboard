export default function ProgressBar({ label, value, total, tone = 'teal' }) {
  const percent = total ? Math.min((value / total) * 100, 100) : 0;

  return (
    <div className="progress-row">
      <div className="progress-row__copy">
        <span>{label}</span>
        <strong>{Math.round(percent)}%</strong>
      </div>
      <div className="progress-track">
        <span
          className={`progress-fill progress-fill--${tone}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
