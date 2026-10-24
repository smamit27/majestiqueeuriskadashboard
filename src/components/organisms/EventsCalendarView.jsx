import { useState } from 'react';
import './EventsCalendarView.css';


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
    <article className="events-calendar-view-s1">
      <div className="events-calendar-view-s2">
        <h4 className="events-calendar-view-s3">
          {item.title}
        </h4>
        <span className="events-calendar-view-s4" style={{ color: priorityColor, background: `${priorityColor}18`, border: `1px solid ${priorityColor}30` }}>
          {item.priority}
        </span>
      </div>
      <p className="events-calendar-view-s5">{item.summary}</p>
      <small className="events-calendar-view-s6">{item.audience} · {formatDate(item.postedOn)}</small>
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
    <article className="events-calendar-view-s7" style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, borderLeft: `4px solid ${cfg.color}`, opacity: upcoming ? 1 : 0.65 }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${cfg.color}22`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Header row */}
      <div className="events-calendar-view-s8">
        <div className="events-calendar-view-s9">
          <span className="events-calendar-view-s10" style={{ background: `${cfg.color}20` }}>
            {cfg.emoji}
          </span>
          <div>
            <span className="events-calendar-view-s11" style={{ color: cfg.accent }}>
              {event.category}
            </span>
            <h4 className="events-calendar-view-s12">
              {event.title}
            </h4>
          </div>
        </div>

        {/* Reminder toggle */}
        <button
          onClick={() => onToggleReminder(event.id)}
          title={reminded ? 'Remove reminder' : 'Set reminder'}
          className="events-calendar-view-s13" style={{ background: reminded ? `${cfg.color}22` : 'rgba(255,255,255,0.05)', border: `1.5px solid ${reminded ? cfg.color : 'rgba(255,255,255,0.12)'}`, color: reminded ? cfg.color : 'rgba(255,255,255,0.5)' }}
        >
          <span>{reminded ? '🔔' : '🔕'}</span>
          <span className="events-calendar-view-s14" style={{ ['@media (min-width: 500px)']: { display: 'inline' } }}>
            {reminded ? 'Reminded' : 'Remind me'}
          </span>
        </button>
      </div>

      {/* Description */}
      {event.description && (
        <p className="events-calendar-view-s15">
          {event.description}
        </p>
      )}

      {/* Date / venue / attendees */}
      <div className="events-calendar-view-s16">
        {/* Date chip */}
        <div className="events-calendar-view-s17" style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}25`, color: cfg.accent }}>
          <span>📆</span>
          {isMultiDay
            ? <span>{formatDateShort(event.date)} – {formatDateShort(event.endDate)} <span className="events-calendar-view-s18">({daysCount} days)</span></span>
            : <span>{formatDateFull(event.date)}</span>
          }
        </div>

        {/* Venue chip */}
        {event.venue && (
          <div className="events-calendar-view-s19">
            <span>📍</span>
            <span>{event.venue}</span>
          </div>
        )}

        {/* Attendees chip */}
        {event.attendees && (
          <div className="events-calendar-view-s20">
            <span>👥</span>
            <span>{event.attendees} expected</span>
          </div>
        )}

        {/* Past indicator */}
        {!upcoming && (
          <span className="events-calendar-view-s21">Past</span>
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
    <div className="events-calendar-view-s22">

      {/* ── Page header ── */}
      <div className="events-calendar-view-s23">
        <div>
          <p className="events-calendar-view-s24">
            Events &amp; Announcements
          </p>
          <h2 className="events-calendar-view-s25">Festival Calendar 2026</h2>
          <p className="events-calendar-view-s26">
            Community events, festivals &amp; upcoming activities for Majestique Euriska
          </p>
        </div>
        <div className="events-calendar-view-s27">
          {[
            { label: 'Total Events', value: events.length, emoji: '📅' },
            { label: 'Upcoming', value: upcomingCount, emoji: '⏳' },
            { label: 'Festivals', value: festivalCount, emoji: '🎉' },
          ].map(s => (
            <div key={s.label} className="events-calendar-view-s28">
              <div className="events-calendar-view-s29">{s.emoji}</div>
              <div className="events-calendar-view-s30">{s.value}</div>
              <div className="events-calendar-view-s31">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Category filter pills ── */}
      <div className="events-calendar-view-s32">
        {categories.map(cat => {
          const cfg = cat === 'All' ? { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', emoji: '🗓️' } : getCategoryConfig(cat);
          const isActive = activeFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className="events-calendar-view-s33" style={{ background: isActive ? cfg.color : cfg.bg, border: `1.5px solid ${isActive ? cfg.color : cfg.border}`, color: isActive ? '#fff' : cfg.color }}
            >
              <span>{cfg.emoji}</span>
              <span>{cat}</span>
            </button>
          );
        })}
      </div>

      {/* ── Two-column layout ── */}
      <div className="events-calendar-view-s34">

        {/* Left: grouped events by month */}
        <div className="events-calendar-view-s22">
          {monthGroups.length === 0 ? (
            <div className="events-calendar-view-s35">
              <div className="events-calendar-view-s36">📭</div>
              <p>No events match this filter.</p>
            </div>
          ) : (
            monthGroups.map(group => (
              <div key={group.label}>
                {/* Month header */}
                <div className="events-calendar-view-s37">
                  <h3 className="events-calendar-view-s38">
                    {group.label}
                  </h3>
                  <div className="events-calendar-view-s39" />
                  <span className="events-calendar-view-s40">{group.events.length} event{group.events.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Events in this month */}
                <div className="events-calendar-view-s41">
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
        <div className="events-calendar-view-s42">
          <div className="events-calendar-view-s43">
            <div className="events-calendar-view-s44">
              <h3 className="events-calendar-view-s45">📢 Announcements</h3>
              <span className="events-calendar-view-s46">
                {announcements.length} posts
              </span>
            </div>
            <div className="events-calendar-view-s41">
              {announcements.map(ann => (
                <AnnouncementCard key={ann.id} item={ann} formatDate={formatDate} />
              ))}
            </div>
          </div>

          {/* Reminder summary */}
          {Object.values(reminders).some(Boolean) && (
            <div className="events-calendar-view-s47">
              <p className="events-calendar-view-s48">
                🔔 Your Reminders
              </p>
              <ul className="events-calendar-view-s49">
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
