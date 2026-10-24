import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../firebase.js';
import {
  emergencyServices,
  defaultSocietyContacts,
  defaultNearbyLocations,
  safetyTips
} from '../../data/emergencyData.js';
import './EmergencyNumbers.css';


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
    <div className="emergency-page-container emergency-numbers-s1">
      {/* ── 1. Page Header Box ── */}
      <section className="section-card emergency-numbers-s2">
        <div className="section-card__header emergency-numbers-s3">
          <div>
            <p className="eyebrow emergency-numbers-s4">
              <span>🚨 24x7 EMERGENCY DIRECTORY</span>
              <span
                className="emergency-numbers-s5"
              >
                Instant Response
              </span>
            </p>
            <h2 className="emergency-numbers-s6">Emergency Numbers</h2>
            <p className="emergency-numbers-s7">
              Quick access to emergency services and society contacts
            </p>
          </div>

          <div className="section-toolbar emergency-numbers-s8">
            <a
              href="tel:112"
              className="button-primary emergency-numbers-s9"
              aria-label="Call National Emergency 112"
            >
              📞 Call 112 (Universal)
            </a>
          </div>
        </div>
      </section>

      {/* ── 2. Emergency Hero Banner ── */}
      <div
        className="emergency-hero-banner emergency-numbers-s10"
      >
        <div className="emergency-numbers-s11">
          <div className="emergency-numbers-s12">
            <span>🚨</span> Emergency Contacts
          </div>
          <h2 className="emergency-numbers-s13">
            Quick access to important emergency services and society contacts
          </h2>
          <p className="emergency-numbers-s14">
            One-tap direct calling for residents of Majestique Euriska. Keep calm and connect with emergency authorities or on-site security immediately.
          </p>
        </div>

        <div
          className="emergency-numbers-s15"
        >
          <div className="emergency-numbers-s16">
            In Emergency
          </div>
          <a
            href="tel:112"
            aria-label="Dial 112 from any phone"
            className="emergency-numbers-s17"
          >
            Dial 112
          </a>
          <div className="emergency-numbers-s18">
            from any phone
          </div>
        </div>
      </div>

      {/* ── 3. Emergency Services (Section 1) ── */}
      <section className="section-card emergency-numbers-s2">
        <div className="emergency-numbers-s19">
          <div>
            <h3 className="emergency-numbers-s20">
              1. Emergency Services
            </h3>
            <p className="emergency-numbers-s21">
              National & City 24x7 emergency response services (Free & Immediate)
            </p>
          </div>
          <span className="emergency-numbers-s22">
            Toll-Free Helplines
          </span>
        </div>

        <div
          className="emergency-numbers-s23"
        >
          {emergencyServices.map((service) => (
            <div
              key={service.id}
              className="emergency-numbers-s24"
            >
              <div>
                <div className="emergency-numbers-s25">
                  <div className="emergency-numbers-s26">
                    <span className="emergency-numbers-s27">
                      {service.icon}
                    </span>
                    <div>
                      <h4 className="emergency-numbers-s28">
                        {service.name}
                      </h4>
                      <span className="emergency-numbers-s29">
                        {service.badge}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="emergency-numbers-s30">
                  <div className="emergency-numbers-s31">
                    {service.primaryNumber} {service.secondaryNumber ? <span className="emergency-numbers-s32">/ {service.secondaryNumber}</span> : null}
                  </div>
                  <p className="emergency-numbers-s33">
                    {service.description}
                  </p>
                </div>
              </div>

              <div className="emergency-numbers-s34">
                <a
                  href={`tel:${service.primaryNumber}`}
                  className="button-primary emergency-numbers-s35"
                  aria-label={`Call ${service.name} at ${service.primaryNumber}`}
                >
                  📞 Call {service.primaryNumber}
                </a>

                {service.secondaryNumber && (
                  <a
                    href={`tel:${service.secondaryNumber}`}
                    className="button-secondary emergency-numbers-s36"
                    aria-label={`Call ${service.name} backup at ${service.secondaryNumber}`}
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
      <section className="section-card emergency-numbers-s2">
        <div className="emergency-numbers-s37">
          <div>
            <h3 className="emergency-numbers-s20">
              2. Society Emergency Contacts
            </h3>
            <p className="emergency-numbers-s21">
              On-campus security, management, and technical escalation personnel
            </p>
          </div>
          <span className="emergency-numbers-s38">
            Campus Desk
          </span>
        </div>

        <div
          className="emergency-numbers-s39"
        >
          {societyContacts.map((contact) => (
            <div
              key={contact.id}
              className="emergency-numbers-s40"
            >
              <div className="emergency-numbers-s41">
                <div className="emergency-numbers-s42">
                  <span className="emergency-numbers-s43">
                    {contact.icon || '📞'}
                  </span>
                  <div>
                    <h4 className="emergency-numbers-s44">
                      {contact.category}
                    </h4>
                    <div className="emergency-numbers-s45">
                      {contact.person}
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => openEditModal(contact, 'contact')}
                    className="emergency-numbers-s46"
                    title="Edit Contact Number (Admin)"
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>

              <div className="emergency-numbers-s47">
                <div>
                  <span className="emergency-numbers-s48">
                    Contact Phone
                  </span>
                  <span className="emergency-numbers-s49">
                    {contact.phone || 'Not Configured'}
                  </span>
                </div>
                <span className="emergency-numbers-s50">
                  {contact.available}
                </span>
              </div>

              <a
                href={contact.phone ? `tel:${contact.phone.replace(/\s+/g, '')}` : '#'}
                className="button-primary emergency-numbers-s51"
                aria-label={`Call ${contact.category} at ${contact.phone}`}
                style={{ background: contact.phone ? '#196c6c' : '#94a3b8', borderColor: contact.phone ? '#135252' : '#cbd5e1', cursor: contact.phone ? 'pointer' : 'not-allowed' }}
              >
                📞 Call {contact.category.split(' ')[0]}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. Important Locations Nearby (Section 3) ── */}
      <section className="section-card emergency-numbers-s2">
        <div className="emergency-numbers-s37">
          <div>
            <h3 className="emergency-numbers-s20">
              3. Important Locations Nearby
            </h3>
            <p className="emergency-numbers-s21">
              Immediate healthcare, police stations, fire stations, and 24x7 pharmacies with Google Maps directions
            </p>
          </div>
          <span className="emergency-numbers-s52">
            Maps & Navigation
          </span>
        </div>

        <div
          className="emergency-numbers-s53"
        >
          {nearbyLocations.map((loc) => {
            const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.query || (loc.name + ' ' + loc.address))}`;
            return (
              <div
                key={loc.id}
                className="emergency-numbers-s40"
              >
                <div>
                  <div className="emergency-numbers-s54">
                    <div className="emergency-numbers-s26">
                      <span className="emergency-numbers-s43">
                        {loc.icon || '📍'}
                      </span>
                      <div>
                        <span className="emergency-numbers-s55">
                          {loc.type}
                        </span>
                        <h4 className="emergency-numbers-s56">
                          {loc.name}
                        </h4>
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openEditModal(loc, 'location')}
                        className="emergency-numbers-s46"
                        title="Edit Location (Admin)"
                      >
                        ✏️
                      </button>
                    )}
                  </div>

                  <div className="emergency-numbers-s57">
                    <div className="emergency-numbers-s58">
                      <span>📍 Approx Distance:</span>
                      <span className="emergency-numbers-s59">{loc.distance}</span>
                    </div>
                    <div>{loc.address}</div>
                  </div>
                </div>

                <div className="emergency-numbers-s34">
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button-primary emergency-numbers-s60"
                    aria-label={`Get directions to ${loc.name}`}
                  >
                    📍 Get Directions
                  </a>

                  {loc.phone && (
                    <a
                      href={`tel:${loc.phone.replace(/\s+/g, '')}`}
                      className="button-secondary emergency-numbers-s61"
                      aria-label={`Call ${loc.name} at ${loc.phone}`}
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
      <section className="section-card emergency-numbers-s62">
        <div className="emergency-numbers-s63">
          <h3 className="emergency-numbers-s64">
            Safety Tips
          </h3>
          <p className="emergency-numbers-s65">
            Essential emergency guidelines for society residents
          </p>
        </div>

        <div
          className="emergency-numbers-s66"
        >
          {safetyTips.map((tip) => (
            <div
              key={tip.id}
              className="emergency-numbers-s67"
            >
              <span className="emergency-numbers-s68">{tip.icon}</span>
              <div>
                <h5 className="emergency-numbers-s69">
                  {tip.title}
                </h5>
                <p className="emergency-numbers-s70">
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
          className="emergency-numbers-s71"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="emergency-numbers-s72"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="emergency-numbers-s73">
              Edit {editingItem?.type === 'contact' ? 'Society Contact' : 'Nearby Location'}
            </h3>

            <form onSubmit={handleSaveEdit}>
              <div className="emergency-numbers-s74">
                {editingItem?.type === 'contact' ? (
                  <>
                    <div className="ann-form-field">
                      <label className="emergency-numbers-s75">Category</label>
                      <input
                        type="text"
                        value={editFormData.category || ''}
                        onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}
                        className="emergency-numbers-s76"
                        required
                      />
                    </div>

                    <div className="ann-form-field">
                      <label className="emergency-numbers-s75">Person / Title</label>
                      <input
                        type="text"
                        value={editFormData.person || ''}
                        onChange={e => setEditFormData({ ...editFormData, person: e.target.value })}
                        className="emergency-numbers-s76"
                        required
                      />
                    </div>

                    <div className="ann-form-field">
                      <label className="emergency-numbers-s75">Phone Number</label>
                      <input
                        type="text"
                        placeholder="+91 98XXX XXXXX"
                        value={editFormData.phone || ''}
                        onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="emergency-numbers-s76"
                        required
                      />
                    </div>

                    <div className="ann-form-field">
                      <label className="emergency-numbers-s75">Availability Note</label>
                      <input
                        type="text"
                        value={editFormData.available || ''}
                        onChange={e => setEditFormData({ ...editFormData, available: e.target.value })}
                        className="emergency-numbers-s76"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ann-form-field">
                      <label className="emergency-numbers-s75">Location Name</label>
                      <input
                        type="text"
                        value={editFormData.name || ''}
                        onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="emergency-numbers-s76"
                        required
                      />
                    </div>

                    <div className="ann-form-field">
                      <label className="emergency-numbers-s75">Distance</label>
                      <input
                        type="text"
                        placeholder="e.g. ~2.5 km"
                        value={editFormData.distance || ''}
                        onChange={e => setEditFormData({ ...editFormData, distance: e.target.value })}
                        className="emergency-numbers-s76"
                      />
                    </div>

                    <div className="ann-form-field">
                      <label className="emergency-numbers-s75">Address / Landmark</label>
                      <input
                        type="text"
                        value={editFormData.address || ''}
                        onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                        className="emergency-numbers-s76"
                      />
                    </div>

                    <div className="ann-form-field">
                      <label className="emergency-numbers-s75">Contact Phone</label>
                      <input
                        type="text"
                        value={editFormData.phone || ''}
                        onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="emergency-numbers-s76"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="emergency-numbers-s77">
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
