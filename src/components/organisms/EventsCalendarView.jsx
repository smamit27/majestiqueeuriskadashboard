import { useState } from 'react';

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG = {
  Festival: {
    emoji: '🎉',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.30)',
    accent: '#d97706',
  },
  Governance: {
    emoji: '📋',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.10)',
    border: 'rgba(99,102,241,0.25)',
    accent: '#4f46e5',
  },
  Community: {
    emoji: '🤝',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.10)',
    border: 'rgba(16,185,129,0.25)',
    accent: '#059669',
  },
  Safety: {
    emoji: '🛡️',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.25)',
    accent: '#dc2626',
  },
};

const DEFAULT_CATEGORY = {
  emoji: '📅',
  color: '#6b7280',
  bg: 'rgba(107,114,128,0.10)',
  border: 'rgba(107,114,128,0.20)',
  accent: '#4b5563',
};

function getCategoryConfig(category) {
  return CATEGORY_CONFIG[category] || DEFAULT_CATEGORY;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateShort(dateStr) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(dateStr));
}

function formatDateFull(dateStr) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr));
}

function getDaysCount(startDate, endDate) {
  if (!endDate) return 1;
  const diff = new Date(endDate) - new Date(startDate);
  return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
}

function isUpcoming(dateStr) {
  return new Date(dateStr) >= new Date(new Date().toDateString());
}

function groupEventsByMonth(events) {
  const groups = {};
  events.forEach(ev => {
    const d = new Date(ev.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(d);
    if (!groups[key]) groups[key] = { label, events: [] };
    groups[key].events.push(ev);
  });
  return Object.values(groups);
}

// ─── Announcement card ────────────────────────────────────────────────────────
function AnnouncementCard({ item, formatDate }) {
  const priorityColor = item.priority === 'High' ? '#ef4444' : item.priority === 'Medium' ? '#f59e0b' : '#6b7280';
  return (
    <article style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary, #f1f5f9)' }}>
          {item.title}
        </h4>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
          color: priorityColor, background: `${priorityColor}18`, border: `1px solid ${priorityColor}30`,
          borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {item.priority}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.75, lineHeight: 1.5 }}>{item.summary}</p>
      <small style={{ opacity: 0.5, fontSize: '0.78rem' }}>{item.audience} · {formatDate(item.postedOn)}</small>
    </article>
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────
function EventCard({ event, formatDate, reminded, onToggleReminder }) {
  const cfg = getCategoryConfig(event.category);
  const upcoming = isUpcoming(event.date);
  const daysCount = getDaysCount(event.date, event.endDate);
  const isMultiDay = daysCount > 1;

  return (
    <article style={{
      background: cfg.bg,
      border: `1.5px solid ${cfg.border}`,
      borderLeft: `4px solid ${cfg.color}`,
      borderRadius: 14,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      opacity: upcoming ? 1 : 0.65,
      transition: 'transform 0.18s, box-shadow 0.18s',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${cfg.color}22`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: '1.5rem', width: 40, height: 40, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: `${cfg.color}20`, borderRadius: 10,
          }}>
            {cfg.emoji}
          </span>
          <div>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
              color: cfg.accent, display: 'block', marginBottom: 2,
            }}>
              {event.category}
            </span>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary, #f1f5f9)', lineHeight: 1.3 }}>
              {event.title}
            </h4>
          </div>
        </div>

        {/* Reminder toggle */}
        <button
          onClick={() => onToggleReminder(event.id)}
          title={reminded ? 'Remove reminder' : 'Set reminder'}
          style={{
            flexShrink: 0,
            background: reminded ? `${cfg.color}22` : 'rgba(255,255,255,0.05)',
            border: `1.5px solid ${reminded ? cfg.color : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: reminded ? cfg.color : 'rgba(255,255,255,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            transition: 'all 0.2s',
          }}
        >
          <span>{reminded ? '🔔' : '🔕'}</span>
          <span style={{ display: 'none', ['@media (min-width: 500px)']: { display: 'inline' } }}>
            {reminded ? 'Reminded' : 'Remind me'}
          </span>
        </button>
      </div>

      {/* Description */}
      {event.description && (
        <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.78, lineHeight: 1.6 }}>
          {event.description}
        </p>
      )}

      {/* Date / venue / attendees */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', alignItems: 'center' }}>
        {/* Date chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: `${cfg.color}15`, border: `1px solid ${cfg.color}25`,
          borderRadius: 8, padding: '5px 10px', fontSize: '0.82rem', fontWeight: 600,
          color: cfg.accent,
        }}>
          <span>📆</span>
          {isMultiDay
            ? <span>{formatDateShort(event.date)} – {formatDateShort(event.endDate)} <span style={{ fontWeight: 400, opacity: 0.75 }}>({daysCount} days)</span></span>
            : <span>{formatDateFull(event.date)}</span>
          }
        </div>

        {/* Venue chip */}
        {event.venue && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.82rem', opacity: 0.72,
          }}>
            <span>📍</span>
            <span>{event.venue}</span>
          </div>
        )}

        {/* Attendees chip */}
        {event.attendees && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.82rem', opacity: 0.65,
          }}>
            <span>👥</span>
            <span>{event.attendees} expected</span>
          </div>
        )}

        {/* Past indicator */}
        {!upcoming && (
          <span style={{
            marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.06em', opacity: 0.5,
          }}>Past</span>
        )}
      </div>
    </article>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function EventsCalendarView({ events, announcements, formatDate }) {
  const [reminders, setReminders] = useState({});
  const [activeFilter, setActiveFilter] = useState('All');

  const toggleReminder = (id) => {
    setReminders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Get unique categories
  const categories = ['All', ...Array.from(new Set(events.map(e => e.category)))];

  const filteredEvents = activeFilter === 'All'
    ? events
    : events.filter(e => e.category === activeFilter);

  const monthGroups = groupEventsByMonth(filteredEvents);
  const festivalCount = events.filter(e => e.category === 'Festival').length;
  const upcomingCount = events.filter(e => isUpcoming(e.date)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Page header ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(99,102,241,0.08) 100%)',
        border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: 18,
        padding: '24px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20,
      }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f59e0b', opacity: 0.9 }}>
            Events &amp; Announcements
          </p>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.5rem', fontWeight: 800 }}>Festival Calendar 2026</h2>
          <p style={{ margin: 0, opacity: 0.65, fontSize: '0.9rem' }}>
            Community events, festivals &amp; upcoming activities for Majestique Euriska
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'Total Events', value: events.length, emoji: '📅' },
            { label: 'Upcoming', value: upcomingCount, emoji: '⏳' },
            { label: 'Festivals', value: festivalCount, emoji: '🎉' },
          ].map(s => (
            <div key={s.label} style={{
              textAlign: 'center',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: '12px 18px',
            }}>
              <div style={{ fontSize: '1.3rem' }}>{s.emoji}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2 }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Category filter pills ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {categories.map(cat => {
          const cfg = cat === 'All' ? { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', emoji: '🗓️' } : getCategoryConfig(cat);
          const isActive = activeFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              style={{
                background: isActive ? cfg.color : cfg.bg,
                border: `1.5px solid ${isActive ? cfg.color : cfg.border}`,
                color: isActive ? '#fff' : cfg.color,
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.18s',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>{cfg.emoji}</span>
              <span>{cat}</span>
            </button>
          );
        })}
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,360px)', gap: 24, alignItems: 'start' }}>

        {/* Left: grouped events by month */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {monthGroups.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px', opacity: 0.5,
              background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.12)',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
              <p>No events match this filter.</p>
            </div>
          ) : (
            monthGroups.map(group => (
              <div key={group.label}>
                {/* Month header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
                }}>
                  <h3 style={{
                    margin: 0, fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.1em', opacity: 0.55,
                  }}>
                    {group.label}
                  </h3>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                  <span style={{ fontSize: '0.75rem', opacity: 0.4 }}>{group.events.length} event{group.events.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Events in this month */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {group.events.map(ev => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      formatDate={formatDate}
                      reminded={!!reminders[ev.id]}
                      onToggleReminder={toggleReminder}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: announcements sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>📢 Announcements</h3>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, background: 'rgba(99,102,241,0.15)',
                color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 20, padding: '2px 10px',
              }}>
                {announcements.length} posts
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {announcements.map(ann => (
                <AnnouncementCard key={ann.id} item={ann} formatDate={formatDate} />
              ))}
            </div>
          </div>

          {/* Reminder summary */}
          {Object.values(reminders).some(Boolean) && (
            <div style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1.5px solid rgba(245,158,11,0.25)',
              borderRadius: 14,
              padding: '14px 18px',
            }}>
              <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '0.88rem', color: '#f59e0b' }}>
                🔔 Your Reminders
              </p>
              <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: '0.82rem', opacity: 0.8, lineHeight: 1.8 }}>
                {events
                  .filter(ev => reminders[ev.id])
                  .map(ev => (
                    <li key={ev.id}>{ev.title} — {formatDateShort(ev.date)}</li>
                  ))
                }
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
