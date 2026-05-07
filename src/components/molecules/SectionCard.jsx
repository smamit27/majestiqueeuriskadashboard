export default function SectionCard({ id, title, badge, subtitle, children }) {
  return (
    <section id={id} className="section-card">
      <div className="section-card__header">
        <div>
          <p className="eyebrow">{badge}</p>
          <h2>{title}</h2>
        </div>
        <p>{subtitle}</p>
      </div>
      <div className="section-card__body">{children}</div>
    </section>
  );
}
