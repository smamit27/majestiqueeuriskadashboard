export default function StatusPill({ value }) {
  const normalized = value.toLowerCase().replace(/\s+/g, '-');

  return <span className={`status-pill status-pill--${normalized}`}>{value}</span>;
}
