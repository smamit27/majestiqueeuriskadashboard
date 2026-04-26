import { useMemo, useState } from 'react';
import MetricCard from './components/MetricCard.jsx';
import HousekeepingAttendanceManager from './components/HousekeepingAttendanceManager.jsx';
import HousekeepingBillCalculator from './components/HousekeepingBillCalculator.jsx';
import SecurityAttendanceManager from './components/SecurityAttendanceManager.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import SectionCard from './components/SectionCard.jsx';
import StatusPill from './components/StatusPill.jsx';
import { announcements, complaints, dues, events, finance, members, staff, visitors } from './data/mockData.js';
import { useCollection } from './hooks/useCollection.js';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

function formatCurrency(value) {
  return currencyFormatter.format(value || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

function sortByDateDescending(items, key) {
  return [...items].sort((left, right) => new Date(right[key]) - new Date(left[key]));
}

function sortByDateAscending(items, key) {
  return [...items].sort((left, right) => new Date(left[key]) - new Date(right[key]));
}

export default function App() {
  const [activeTab, setActiveTab] = useState('members');
  const [memberSearchText, setMemberSearchText] = useState('');
  const [complaintSearchText, setComplaintSearchText] = useState('');

  const memberData = useCollection('members', members);
  const duesData = useCollection('dues', dues);
  const announcementData = useCollection('announcements', announcements);
  const eventData = useCollection('events', events);
  const complaintData = useCollection('complaints', complaints);
  const financeData = useCollection('finance', finance);
  const visitorData = useCollection('visitors', visitors);
  const staffData = useCollection('staff', staff);

  const sourceSummary = [
    memberData.source,
    duesData.source,
    announcementData.source,
    eventData.source,
    complaintData.source,
    financeData.source,
    visitorData.source,
    staffData.source
  ];

  const hasFirebaseSync = sourceSummary.some((source) => source === 'firebase');
  const loadErrors = [
    memberData.error,
    duesData.error,
    announcementData.error,
    eventData.error,
    complaintData.error,
    financeData.error,
    visitorData.error,
    staffData.error
  ].filter(Boolean);

  const filteredMembers = useMemo(() => {
    const query = memberSearchText.trim().toLowerCase();

    if (!query) {
      return memberData.items;
    }

    return memberData.items.filter((member) =>
      [member.name, member.flat, member.phone, member.ownership]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [memberData.items, memberSearchText]);

  const filteredComplaints = useMemo(() => {
    const query = complaintSearchText.trim().toLowerCase();

    if (!query) {
      return sortByDateDescending(complaintData.items, 'raisedOn');
    }

    return sortByDateDescending(complaintData.items, 'raisedOn').filter((item) =>
      [item.resident, item.flat, item.category, item.note, item.status]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [complaintData.items, complaintSearchText]);

  const upcomingEvents = useMemo(
    () => sortByDateAscending(eventData.items, 'date'),
    [eventData.items]
  );

  const totalOutstanding = duesData.items.reduce((sum, item) => sum + (item.outstanding || 0), 0);
  const collectionTarget = duesData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const duesCollected = collectionTarget - totalOutstanding;
  const paidDuesCount = duesData.items.filter((item) => item.status === 'Paid').length;
  const openComplaints = complaintData.items.filter((item) => item.status !== 'Resolved').length;
  const activeVisitors = visitorData.items.filter((item) =>
    ['Checked In', 'At Gate'].includes(item.status)
  ).length;
  const staffPresent = staffData.items.filter((item) => item.attendance !== 'On Leave').length;
  const financeSnapshot = financeData.items[0] || finance[0];
  const nextEvent = upcomingEvents[0];

  const collectionRate = collectionTarget ? (duesCollected / collectionTarget) * 100 : 0;
  const operatingMargin = financeSnapshot.collections - financeSnapshot.expenses;
  const expenseRatio = financeSnapshot.collections
    ? (financeSnapshot.expenses / financeSnapshot.collections) * 100
    : 0;

  const tabItems = [
    {
      id: 'members',
      label: 'Members',
      metric: `${memberData.items.length} households`,
      render: () => (
        <SectionCard
          id="members"
          badge="Member Management"
          title="Residents, flats, and occupancy"
          subtitle="Track owners, tenants, household size, and dues status."
        >
          <div className="section-toolbar">
            <label className="filter-field">
              <span>Search households</span>
              <input
                type="search"
                value={memberSearchText}
                onChange={(event) => setMemberSearchText(event.target.value)}
                placeholder="Search by resident, flat, phone, or ownership type"
              />
            </label>
          </div>

          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Resident</th>
                  <th>Flat</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Dues</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <strong>{member.name}</strong>
                        <span>{member.householdSize} residents</span>
                      </td>
                      <td>{member.flat}</td>
                      <td>{member.ownership}</td>
                      <td>{member.phone}</td>
                      <td>
                        <StatusPill value={member.status} />
                      </td>
                      <td>
                        <StatusPill value={member.duesStatus} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="empty-row">
                    <td colSpan="6">No matching households were found for this search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )
    },
    {
      id: 'dues',
      label: 'Dues',
      metric: `${Math.round(collectionRate)}% collected`,
      render: () => (
        <SectionCard
          id="dues"
          badge="Maintenance / Dues Tracking"
          title="Monthly collections and follow-ups"
          subtitle="Highlight pending balances before they become aging receivables."
        >
          <div className="section-grid section-grid--dual">
            <div className="table-card">
              <table>
                <thead>
                  <tr>
                    <th>Resident</th>
                    <th>Flat</th>
                    <th>Amount</th>
                    <th>Outstanding</th>
                    <th>Due date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {duesData.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.resident}</td>
                      <td>{item.flat}</td>
                      <td>{formatCurrency(item.amount)}</td>
                      <td>{formatCurrency(item.outstanding)}</td>
                      <td>{formatDate(item.dueDate)}</td>
                      <td>
                        <StatusPill value={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="stack-card">
              <div>
                <p className="eyebrow">Cycle overview</p>
                <h3>{formatCurrency(duesCollected)} collected</h3>
                <p>{formatCurrency(totalOutstanding)} still outstanding across current dues.</p>
              </div>
              <ProgressBar label="Paid units" value={paidDuesCount} total={duesData.items.length} tone="teal" />
              <ProgressBar
                label="Pending or overdue amount"
                value={totalOutstanding}
                total={collectionTarget}
                tone="coral"
              />
            </div>
          </div>
        </SectionCard>
      )
    },
    {
      id: 'events',
      label: 'Events',
      metric: `${eventData.items.length} scheduled`,
      render: () => (
        <SectionCard
          id="events"
          badge="Events & Announcements"
          title="Community communication and upcoming activities"
          subtitle="Keep residents informed about maintenance, safety, and shared events."
        >
          <div className="section-grid section-grid--dual">
            <div className="list-card">
              <div className="list-card__header">
                <h3>Announcements</h3>
                <span>{announcementData.items.length} posts</span>
              </div>
              {sortByDateDescending(announcementData.items, 'postedOn').map((announcement) => (
                <article key={announcement.id} className="list-item">
                  <div className="list-item__title">
                    <h4>{announcement.title}</h4>
                    <StatusPill value={announcement.priority} />
                  </div>
                  <p>{announcement.summary}</p>
                  <small>
                    {announcement.audience} · {formatDate(announcement.postedOn)}
                  </small>
                </article>
              ))}
            </div>

            <div className="list-card">
              <div className="list-card__header">
                <h3>Upcoming events</h3>
                <span>{eventData.items.length} scheduled</span>
              </div>
              {upcomingEvents.map((event) => (
                <article key={event.id} className="timeline-item">
                  <div>
                    <p className="eyebrow">{event.category}</p>
                    <h4>{event.title}</h4>
                  </div>
                  <div className="timeline-item__meta">
                    <strong>{formatDate(event.date)}</strong>
                    <span>{event.venue}</span>
                    <span>{event.attendees} attendees expected</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </SectionCard>
      )
    },
    {
      id: 'complaints',
      label: 'Complaints',
      metric: `${openComplaints} open`,
      render: () => (
        <SectionCard
          id="complaints"
          badge="Complaints & Requests"
          title="Issue logging and escalation monitoring"
          subtitle="Prioritize service requests and keep residents updated on resolution progress."
        >
          <div className="section-toolbar">
            <label className="filter-field">
              <span>Search complaints</span>
              <input
                type="search"
                value={complaintSearchText}
                onChange={(event) => setComplaintSearchText(event.target.value)}
                placeholder="Search by resident, flat, category, or ticket status"
              />
            </label>
          </div>

          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Resident</th>
                  <th>Category</th>
                  <th>Raised</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length > 0 ? (
                  filteredComplaints.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.id}</strong>
                        <span>{item.note}</span>
                      </td>
                      <td>
                        {item.resident}
                        <span>{item.flat}</span>
                      </td>
                      <td>{item.category}</td>
                      <td>{formatDate(item.raisedOn)}</td>
                      <td>
                        <StatusPill value={item.priority} />
                      </td>
                      <td>
                        <StatusPill value={item.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="empty-row">
                    <td colSpan="6">No complaint records matched the current search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )
    },
    {
      id: 'finance',
      label: 'Finance',
      metric: formatCurrency(financeSnapshot.collections),
      render: () => (
        <SectionCard
          id="finance"
          badge="Financial Overview"
          title="Collections, expenses, and reserve movement"
          subtitle="Use monthly snapshots to spot spending trends and maintain reserve health."
        >
          <div className="section-grid section-grid--dual">
            <div className="table-card">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Collections</th>
                    <th>Expenses</th>
                    <th>Reserve</th>
                    <th>Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {financeData.items.map((month) => (
                    <tr key={month.id}>
                      <td>{month.month}</td>
                      <td>{formatCurrency(month.collections)}</td>
                      <td>{formatCurrency(month.expenses)}</td>
                      <td>{formatCurrency(month.reserveContribution)}</td>
                      <td>{formatCurrency(month.outstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="stack-card">
              <div>
                <p className="eyebrow">Current month</p>
                <h3>{financeSnapshot.month}</h3>
                <p>Track whether collection inflows are staying ahead of society operating costs.</p>
              </div>
              <div className="stat-line">
                <span>Total collections</span>
                <strong>{formatCurrency(financeSnapshot.collections)}</strong>
              </div>
              <div className="stat-line">
                <span>Total expenses</span>
                <strong>{formatCurrency(financeSnapshot.expenses)}</strong>
              </div>
              <div className="stat-line">
                <span>Outstanding dues</span>
                <strong>{formatCurrency(financeSnapshot.outstanding)}</strong>
              </div>
            </div>
          </div>
        </SectionCard>
      )
    },
    {
      id: 'visitors',
      label: 'Visitors',
      metric: `${activeVisitors} live`,
      render: () => (
        <SectionCard
          id="visitors"
          badge="Visitor / Gate Log"
          title="Visitor movement and gate updates"
          subtitle="Log courier, guest, and service partner entry status for faster front-gate handling."
        >
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>Purpose</th>
                  <th>Host Flat</th>
                  <th>Time In</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visitorData.items.map((visitor) => (
                  <tr key={visitor.id}>
                    <td>{visitor.visitorName}</td>
                    <td>{visitor.purpose}</td>
                    <td>{visitor.hostFlat}</td>
                    <td>{visitor.timeIn}</td>
                    <td>
                      <StatusPill value={visitor.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )
    },
    {
      id: 'staff',
      label: 'Housekeeping',
      metric: `${staffPresent}/${staffData.items.length} on shift`,
      render: () => (
        <SectionCard
          id="staff"
          badge="Housekeeping Staff Tracker"
          title="Attendance, zoning, and shift visibility"
          subtitle="Monitor housekeeping coverage and let managers maintain a daily manpower attendance register for the full month."
        >
          <div className="section-grid section-grid--dual">
            <div className="table-card">
              <table>
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Role</th>
                    <th>Shift</th>
                    <th>Zone</th>
                    <th>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {staffData.items.map((person) => (
                    <tr key={person.id}>
                      <td>{person.name}</td>
                      <td>{person.role}</td>
                      <td>{person.shift}</td>
                      <td>{person.zone}</td>
                      <td>
                        <StatusPill value={person.attendance} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="stack-card">
              <div>
                <p className="eyebrow">Coverage snapshot</p>
                <h3>{staffPresent} team members available</h3>
                <p>Supervision and floor cleaning coverage can be reviewed at a glance before peak resident hours.</p>
              </div>
              <ProgressBar label="On-shift coverage" value={staffPresent} total={staffData.items.length} tone="pine" />
              <ProgressBar
                label="Leave impact"
                value={staffData.items.filter((item) => item.attendance === 'On Leave').length}
                total={staffData.items.length}
                tone="amber"
              />
            </div>
          </div>

          <HousekeepingAttendanceManager staffMembers={staffData.items} />
        </SectionCard>
      )
    },
    {
      id: 'security',
      label: 'Security',
      metric: 'Guard deployment',
      render: () => (
        <SectionCard
          id="security"
          badge="Security Staff Tracker"
          title="Guard deployment and post coverage"
          subtitle="Track daily guard counts across A Building, B Building, C Building, Common Area, and Chauhanji."
        >
          <SecurityAttendanceManager />
        </SectionCard>
      )
    },
    {
      id: 'hkbill',
      label: 'HK Bill',
      metric: 'Bill calculator',
      render: () => (
        <SectionCard
          id="hkbill"
          badge="Housekeeping Bill Calculation"
          title="Monthly bill breakdown per building"
          subtitle="Enter salary, absences, garbage, tractor, and STP — auto-calculates A, B, C building share and saves to Firebase."
        >
          <HousekeepingBillCalculator />
        </SectionCard>
      )
    }
  ];

  const activeTabPanel = tabItems.find((item) => item.id === activeTab) || tabItems[0];

  return (
    <div className="dashboard-shell dashboard-shell--tabs">
      <div className="backdrop backdrop--top" />
      <div className="backdrop backdrop--bottom" />

      <main className="main-panel">
        <header className="dashboard-header">
          <div className="dashboard-header__copy">

            {/* Society logo + title row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '12px' }}>
              <img
                src="/logo.png"
                alt="Majestique Euriska Logo"
                style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                  border: '3px solid rgba(255,255,255,0.25)',
                  background: '#fff',
                }}
              />
              <div>
                <p className="eyebrow">Residential Society Dashboard</p>
                <h1 style={{ margin: 0 }}>Majestique Euriska</h1>
              </div>
            </div>

            <p className="dashboard-header__text">
              A cleaner tab-based control center for member operations, dues, community updates,
              complaints, finance, visitor movement, and housekeeping management.
            </p>

            <div className="header-badges">
              <span className="header-badge">Residential / Housing Society</span>
              <span className="header-badge">
                {hasFirebaseSync ? 'Firebase connected' : 'Mock preview mode'}
              </span>
              <span className="header-badge">{activeTabPanel.label} tab active</span>
            </div>
          </div>

          <div className="dashboard-header__aside">
            <article className="summary-panel">
              <p className="eyebrow">Live snapshot</p>
              <div className="summary-panel__grid">
                <div>
                  <span>Open complaints</span>
                  <strong>{openComplaints}</strong>
                </div>
                <div>
                  <span>Visitors at gate</span>
                  <strong>{activeVisitors}</strong>
                </div>
                <div>
                  <span>Dues outstanding</span>
                  <strong>{formatCurrency(totalOutstanding)}</strong>
                </div>
              </div>
            </article>

            <article className="highlight-card">
              <p className="eyebrow">Upcoming priority</p>
              <h3>{nextEvent?.title || 'Committee meeting'}</h3>
              <p>
                {nextEvent
                  ? `${formatDate(nextEvent.date)} at ${nextEvent.venue}`
                  : 'Schedule the next community event.'}
              </p>
            </article>
          </div>
        </header>

        {loadErrors.length > 0 ? <div className="notice-banner">{loadErrors[0]}</div> : null}

        <section className="metrics-grid">
          <MetricCard
            label="Members & Occupancy"
            value={`${memberData.items.length} households`}
            detail={`${memberData.items.filter((item) => item.status === 'Active').length} currently active`}
            tone="sand"
          />
          <MetricCard
            label="Dues Outstanding"
            value={formatCurrency(totalOutstanding)}
            detail={`${Math.round(collectionRate)}% collected this cycle`}
            tone="teal"
          />
          <MetricCard
            label="Open Complaints"
            value={openComplaints}
            detail="Across maintenance, security, and housekeeping"
            tone="coral"
          />
          <MetricCard
            label="Live Gate Activity"
            value={`${activeVisitors} visitors`}
            detail={`${staffPresent}/${staffData.items.length} staff available today`}
            tone="pine"
          />
        </section>

        <section className="tabs-shell">
          <div className="tabs-row" role="tablist" aria-label="Dashboard sections">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                className={`tab-button ${activeTab === tab.id ? 'tab-button--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.label}</span>
                <small>{tab.metric}</small>
              </button>
            ))}
          </div>
        </section>

        <div
          id={`panel-${activeTabPanel.id}`}
          className="tab-content-panel"
          role="tabpanel"
          aria-labelledby={`tab-${activeTabPanel.id}`}
        >
          {activeTabPanel.render()}
        </div>

        <section className="snapshot-grid">
          <div className="snapshot-panel">
            <p className="eyebrow">Collection health</p>
            <ProgressBar label="Maintenance collected" value={duesCollected} total={collectionTarget} tone="teal" />
            <ProgressBar label="Expense ratio" value={expenseRatio} total={100} tone="amber" />
          </div>

          <div className="snapshot-panel">
            <p className="eyebrow">Financial pulse</p>
            <div className="stat-line">
              <span>Operating margin</span>
              <strong>{formatCurrency(operatingMargin)}</strong>
            </div>
            <div className="stat-line">
              <span>Reserve contribution</span>
              <strong>{formatCurrency(financeSnapshot.reserveContribution)}</strong>
            </div>
            <div className="stat-line">
              <span>Utility spend</span>
              <strong>{formatCurrency(financeSnapshot.utilities)}</strong>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
