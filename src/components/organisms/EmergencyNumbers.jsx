import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../firebase.js';
import {
  emergencyServices,
  defaultSocietyContacts,
  defaultNearbyLocations,
  safetyTips
} from '../../data/emergencyData.js';

export default function EmergencyNumbers({ isAdmin = false }) {
  const [societyContacts, setSocietyContacts] = useState(defaultSocietyContacts);
  const [nearbyLocations, setNearbyLocations] = useState(defaultNearbyLocations);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // 'contact' | 'location'
  const [editFormData, setEditFormData] = useState({});
  const [saveStatus, setSaveStatus] = useState('idle');

  // Load customizable data from Firebase / localStorage
  useEffect(() => {
    // Check localStorage cache first
    const cachedContacts = localStorage.getItem('majestique_emergency_contacts');
    const cachedLocations = localStorage.getItem('majestique_emergency_locations');
    if (cachedContacts) {
      try { setSocietyContacts(JSON.parse(cachedContacts)); } catch (e) { /* ignore */ }
    }
    if (cachedLocations) {
      try { setNearbyLocations(JSON.parse(cachedLocations)); } catch (e) { /* ignore */ }
    }

    if (!isFirebaseConfigured || !db) return;

    try {
      const contactsDoc = doc(db, 'society_metadata', 'emergency_contacts');
      const unsub = onSnapshot(contactsDoc, (snap) => {
        if (snap.exists() && snap.data()?.items) {
          setSocietyContacts(snap.data().items);
          localStorage.setItem('majestique_emergency_contacts', JSON.stringify(snap.data().items));
        }
      }, () => {
        // Fallback to defaults
      });

      const locationsDoc = doc(db, 'society_metadata', 'emergency_locations');
      const unsubLoc = onSnapshot(locationsDoc, (snap) => {
        if (snap.exists() && snap.data()?.items) {
          setNearbyLocations(snap.data().items);
          localStorage.setItem('majestique_emergency_locations', JSON.stringify(snap.data().items));
        }
      }, () => {
        // Fallback to defaults
      });

      return () => {
        unsub();
        unsubLoc();
      };
    } catch (err) {
      console.warn('Firebase Emergency sync offline, using local data', err);
    }
  }, []);

  // Save updated contact/location
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');

    let updatedContacts = [...societyContacts];
    let updatedLocations = [...nearbyLocations];

    if (editingItem?.type === 'contact') {
      updatedContacts = updatedContacts.map(c => c.id === editFormData.id ? { ...c, ...editFormData } : c);
      setSocietyContacts(updatedContacts);
      localStorage.setItem('majestique_emergency_contacts', JSON.stringify(updatedContacts));

      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'society_metadata', 'emergency_contacts'), { items: updatedContacts, updatedAt: new Date().toISOString() });
        } catch (err) {
          console.error('Failed to sync contacts to Firebase:', err);
        }
      }
    } else if (editingItem?.type === 'location') {
      updatedLocations = updatedLocations.map(l => l.id === editFormData.id ? { ...l, ...editFormData } : l);
      setNearbyLocations(updatedLocations);
      localStorage.setItem('majestique_emergency_locations', JSON.stringify(updatedLocations));

      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'society_metadata', 'emergency_locations'), { items: updatedLocations, updatedAt: new Date().toISOString() });
        } catch (err) {
          console.error('Failed to sync locations to Firebase:', err);
        }
      }
    }

    setSaveStatus('idle');
    setIsEditModalOpen(false);
    setEditingItem(null);
  };

  const openEditModal = (item, type) => {
    setEditingItem({ ...item, type });
    setEditFormData({ ...item });
    setIsEditModalOpen(true);
  };

  return (
    <div className="emergency-page-container" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── 1. Page Header Box ── */}
      <section className="section-card" style={{ padding: '24px 28px' }}>
        <div className="section-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, margin: 0 }}>
          <div>
            <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 4px 0', color: '#b91c1c' }}>
              <span>🚨 24x7 EMERGENCY DIRECTORY</span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(220, 38, 38, 0.1)',
                  color: '#dc2626',
                  fontWeight: 700
                }}
              >
                Instant Response
              </span>
            </p>
            <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: '#0f172a' }}>Emergency Numbers</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
              Quick access to emergency services and society contacts
            </p>
          </div>

          <div className="section-toolbar" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <a
              href="tel:112"
              className="button-primary"
              aria-label="Call National Emergency 112"
              style={{
                background: '#dc2626',
                borderColor: '#b91c1c',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.92rem',
                padding: '10px 18px',
                borderRadius: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)'
              }}
            >
              📞 Call 112 (Universal)
            </a>
          </div>
        </div>
      </section>

      {/* ── 2. Emergency Hero Banner ── */}
      <div
        className="emergency-hero-banner"
        style={{
          background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
          borderRadius: 20,
          padding: '28px 32px',
          color: '#ffffff',
          boxShadow: '0 10px 30px rgba(185, 28, 28, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 24
        }}
      >
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255, 255, 255, 0.18)', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, marginBottom: 12 }}>
            <span>🚨</span> Emergency Contacts
          </div>
          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.85rem)', fontWeight: 800, margin: '0 0 8px 0', color: '#ffffff' }}>
            Quick access to important emergency services and society contacts
          </h2>
          <p style={{ margin: 0, fontSize: '0.92rem', color: 'rgba(255, 255, 255, 0.88)', maxWidth: '55ch', lineHeight: 1.5 }}>
            One-tap direct calling for residents of Majestique Euriska. Keep calm and connect with emergency authorities or on-site security immediately.
          </p>
        </div>

        <div
          style={{
            flex: '0 0 auto',
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(255, 255, 255, 0.3)',
            borderRadius: 16,
            padding: '20px 24px',
            textAlign: 'center',
            minWidth: 200
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255, 255, 255, 0.9)' }}>
            In Emergency
          </div>
          <a
            href="tel:112"
            aria-label="Dial 112 from any phone"
            style={{
              display: 'block',
              fontSize: '2.4rem',
              fontWeight: 900,
              color: '#ffffff',
              margin: '4px 0',
              textDecoration: 'none',
              letterSpacing: '-0.03em'
            }}
          >
            Dial 112
          </a>
          <div style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500 }}>
            from any phone
          </div>
        </div>
      </div>

      {/* ── 3. Emergency Services (Section 1) ── */}
      <section className="section-card" style={{ padding: '24px 28px' }}>
        <div style={{ marginBottom: 20, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              1. Emergency Services
            </h3>
            <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
              National & City 24x7 emergency response services (Free & Immediate)
            </p>
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: 8 }}>
            Toll-Free Helplines
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16
          }}
        >
          {emergencyServices.map((service) => (
            <div
              key={service.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 16,
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.8rem', background: '#f8fafc', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                      {service.icon}
                    </span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                        {service.name}
                      </h4>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        {service.badge}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ margin: '12px 0 6px' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#b91c1c', letterSpacing: '-0.02em' }}>
                    {service.primaryNumber} {service.secondaryNumber ? <span style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: 600 }}>/ {service.secondaryNumber}</span> : null}
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                    {service.description}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={`tel:${service.primaryNumber}`}
                  className="button-primary"
                  aria-label={`Call ${service.name} at ${service.primaryNumber}`}
                  style={{
                    flex: 1,
                    background: '#dc2626',
                    borderColor: '#b91c1c',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    padding: '10px',
                    borderRadius: 10,
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  📞 Call {service.primaryNumber}
                </a>

                {service.secondaryNumber && (
                  <a
                    href={`tel:${service.secondaryNumber}`}
                    className="button-secondary"
                    aria-label={`Call ${service.name} backup at ${service.secondaryNumber}`}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f8fafc',
                      color: '#334155',
                      border: '1px solid #cbd5e1'
                    }}
                    title={`Call backup line ${service.secondaryNumber}`}
                  >
                    📞 {service.secondaryNumber}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Society Emergency Contacts (Section 2) ── */}
      <section className="section-card" style={{ padding: '24px 28px' }}>
        <div style={{ marginBottom: 20, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              2. Society Emergency Contacts
            </h3>
            <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
              On-campus security, management, and technical escalation personnel
            </p>
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, background: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: 8 }}>
            Campus Desk
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16
          }}
        >
          {societyContacts.map((contact) => (
            <div
              key={contact.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 14,
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.6rem', background: '#f8fafc', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    {contact.icon || '📞'}
                  </span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                      {contact.category}
                    </h4>
                    <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                      {contact.person}
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => openEditModal(contact, 'contact')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      color: '#2563eb',
                      padding: '4px 8px',
                      borderRadius: 6
                    }}
                    title="Edit Contact Number (Admin)"
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Contact Phone
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    {contact.phone || 'Not Configured'}
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', maxWidth: 120, textAlign: 'right' }}>
                  {contact.available}
                </span>
              </div>

              <a
                href={contact.phone ? `tel:${contact.phone.replace(/\s+/g, '')}` : '#'}
                className="button-primary"
                aria-label={`Call ${contact.category} at ${contact.phone}`}
                style={{
                  width: '100%',
                  background: contact.phone ? '#196c6c' : '#94a3b8',
                  borderColor: contact.phone ? '#135252' : '#cbd5e1',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  padding: '9px',
                  borderRadius: 10,
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: contact.phone ? 'pointer' : 'not-allowed'
                }}
              >
                📞 Call {contact.category.split(' ')[0]}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. Important Locations Nearby (Section 3) ── */}
      <section className="section-card" style={{ padding: '24px 28px' }}>
        <div style={{ marginBottom: 20, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              3. Important Locations Nearby
            </h3>
            <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
              Immediate healthcare, police stations, fire stations, and 24x7 pharmacies with Google Maps directions
            </p>
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: 8 }}>
            Maps & Navigation
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 16
          }}
        >
          {nearbyLocations.map((loc) => {
            const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.query || (loc.name + ' ' + loc.address))}`;
            return (
              <div
                key={loc.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.6rem', background: '#f8fafc', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                        {loc.icon || '📍'}
                      </span>
                      <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
                          {loc.type}
                        </span>
                        <h4 style={{ margin: '2px 0 0', fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                          {loc.name}
                        </h4>
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openEditModal(loc, 'location')}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          color: '#2563eb',
                          padding: '4px 8px',
                          borderRadius: 6
                        }}
                        title="Edit Location (Admin)"
                      >
                        ✏️
                      </button>
                    )}
                  </div>

                  <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                      <span>📍 Approx Distance:</span>
                      <span style={{ color: '#16a34a' }}>{loc.distance}</span>
                    </div>
                    <div>{loc.address}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button-primary"
                    aria-label={`Get directions to ${loc.name}`}
                    style={{
                      flex: 1,
                      background: '#3b82f6',
                      borderColor: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      padding: '9px',
                      borderRadius: 10,
                      textAlign: 'center',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    📍 Get Directions
                  </a>

                  {loc.phone && (
                    <a
                      href={`tel:${loc.phone.replace(/\s+/g, '')}`}
                      className="button-secondary"
                      aria-label={`Call ${loc.name} at ${loc.phone}`}
                      style={{
                        padding: '9px 12px',
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f8fafc',
                        color: '#0f172a',
                        border: '1px solid #cbd5e1'
                      }}
                      title={`Call ${loc.name}`}
                    >
                      📞
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 6. Safety Tips (Section 4) ── */}
      <section className="section-card" style={{ padding: '22px 28px', background: 'rgba(255, 255, 255, 0.75)' }}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
            Safety Tips
          </h3>
          <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.82rem' }}>
            Essential emergency guidelines for society residents
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14
          }}
        >
          {safetyTips.map((tip) => (
            <div
              key={tip.id}
              style={{
                background: '#ffffff',
                border: '1px solid #f1f5f9',
                borderRadius: 14,
                padding: '16px',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start'
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>{tip.icon}</span>
              <div>
                <h5 style={{ margin: '0 0 4px 0', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                  {tip.title}
                </h5>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.45 }}>
                  {tip.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Admin Edit Modal ── */}
      {isEditModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16
          }}
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Edit {editingItem?.type === 'contact' ? 'Society Contact' : 'Nearby Location'}
            </h3>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {editingItem?.type === 'contact' ? (
                  <>
                    <div className="ann-form-field">
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Category</label>
                      <input
                        type="text"
                        value={editFormData.category || ''}
                        onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}
                        style={{ height: 38, width: '100%', borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 10px' }}
                        required
                      />
                    </div>

                    <div className="ann-form-field">
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Person / Title</label>
                      <input
                        type="text"
                        value={editFormData.person || ''}
                        onChange={e => setEditFormData({ ...editFormData, person: e.target.value })}
                        style={{ height: 38, width: '100%', borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 10px' }}
                        required
                      />
                    </div>

                    <div className="ann-form-field">
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Phone Number</label>
                      <input
                        type="text"
                        placeholder="+91 98XXX XXXXX"
                        value={editFormData.phone || ''}
                        onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                        style={{ height: 38, width: '100%', borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 10px' }}
                        required
                      />
                    </div>

                    <div className="ann-form-field">
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Availability Note</label>
                      <input
                        type="text"
                        value={editFormData.available || ''}
                        onChange={e => setEditFormData({ ...editFormData, available: e.target.value })}
                        style={{ height: 38, width: '100%', borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 10px' }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ann-form-field">
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Location Name</label>
                      <input
                        type="text"
                        value={editFormData.name || ''}
                        onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                        style={{ height: 38, width: '100%', borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 10px' }}
                        required
                      />
                    </div>

                    <div className="ann-form-field">
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Distance</label>
                      <input
                        type="text"
                        placeholder="e.g. ~2.5 km"
                        value={editFormData.distance || ''}
                        onChange={e => setEditFormData({ ...editFormData, distance: e.target.value })}
                        style={{ height: 38, width: '100%', borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 10px' }}
                      />
                    </div>

                    <div className="ann-form-field">
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Address / Landmark</label>
                      <input
                        type="text"
                        value={editFormData.address || ''}
                        onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                        style={{ height: 38, width: '100%', borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 10px' }}
                      />
                    </div>

                    <div className="ann-form-field">
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Contact Phone</label>
                      <input
                        type="text"
                        value={editFormData.phone || ''}
                        onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                        style={{ height: 38, width: '100%', borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 10px' }}
                      />
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? 'Saving...' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
