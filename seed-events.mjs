#!/usr/bin/env node
// seed-events-admin.mjs — Uses firebase-tools auth (already logged in) via REST API
// Run: node seed-events-admin.mjs

import { execSync } from 'child_process';
import https from 'https';

const PROJECT_ID = 'majestiqueeuriskadashboard';

const events = [
  {
    id: 'EVT-001',
    title: "Monthly managing committee meet",
    date: '2026-04-27',
    venue: 'Society Office',
    attendees: 11,
    category: 'Governance',
    description: 'Monthly committee meeting to review society finances, maintenance, and upcoming activities.',
    reminder: false
  },
  {
    id: 'EVT-002',
    title: "Children's summer workshop",
    date: '2026-05-02',
    venue: 'Clubhouse',
    attendees: 28,
    category: 'Community',
    description: 'Fun-filled workshop for kids covering art, science, and storytelling activities.',
    reminder: false
  },
  {
    id: 'EVT-003',
    title: 'Fire drill and evacuation briefing',
    date: '2026-05-05',
    venue: 'Podium Level',
    attendees: 64,
    category: 'Safety',
    description: 'Annual fire safety drill covering evacuation routes, assembly points, and extinguisher usage.',
    reminder: false
  },
  {
    id: 'EVT-004',
    title: 'Ganesh Chaturthi Festival',
    date: '2026-09-14',
    endDate: '2026-09-24',
    venue: 'Society Podium & Clubhouse',
    attendees: 120,
    category: 'Festival',
    description: 'Ten-day celebration dedicated to Lord Ganesha with daily prayers, cultural programs, and Ganesh Visarjan on the final day.',
    reminder: false
  },
  {
    id: 'EVT-005',
    title: 'Durga Puja',
    date: '2026-10-18',
    endDate: '2026-10-21',
    venue: 'Society Clubhouse',
    attendees: 100,
    category: 'Festival',
    description: 'Four-day festival celebrating Goddess Durga, including Maha Saptami, Maha Ashtami, Maha Navami, and Vijayadashami.',
    reminder: false
  },
  {
    id: 'EVT-006',
    title: 'Dussehra (Vijayadashami)',
    date: '2026-10-20',
    venue: 'Society Garden',
    attendees: 80,
    category: 'Festival',
    description: 'Celebration of the victory of good over evil and the triumph of Lord Rama over Ravana.',
    reminder: false
  },
  {
    id: 'EVT-007',
    title: 'Diwali',
    date: '2026-11-08',
    venue: 'Society Common Areas',
    attendees: 150,
    category: 'Festival',
    description: 'Festival of Lights celebrated with Lakshmi Puja, decorations, diyas, and community gatherings.',
    reminder: false
  }
];

// Convert JS object to Firestore REST API field format
function toFirestoreValue(val) {
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return { integerValue: String(val) };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (val === null) return { nullValue: null };
  return { stringValue: String(val) };
}

function toFirestoreDoc(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) fields[key] = toFirestoreValue(val);
  }
  return { fields };
}

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken() {
  try {
    const token = execSync('npx firebase-tools@latest --project majestiqueeuriskadashboard login:ci --no-localhost 2>/dev/null || gcloud auth print-access-token 2>/dev/null', { encoding: 'utf8' }).trim();
    return token;
  } catch {
    return null;
  }
}

async function seed() {
  // Get access token from gcloud or firebase
  let token = null;
  try {
    token = execSync('gcloud auth print-access-token 2>/dev/null', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    console.log('Using gcloud access token ✓');
  } catch {
    console.log('gcloud not available, trying firebase-tools...');
    try {
      // Try to get the cached firebase token
      const configPath = process.env.HOME + '/.config/configstore/firebase-tools.json';
      const fs = await import('fs');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const tokens = config?.tokens;
      if (tokens?.access_token) {
        token = tokens.access_token;
        console.log('Using firebase-tools cached token ✓');
      }
    } catch (e) {
      console.error('Could not get access token:', e.message);
    }
  }

  if (!token) {
    console.error('❌ No access token found. Please run: gcloud auth login OR firebase login');
    process.exit(1);
  }

  for (const event of events) {
    const { id, ...data } = event;
    const docBody = JSON.stringify(toFirestoreDoc(data));
    const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/events/${id}`;

    const result = await httpsRequest({
      hostname: 'firestore.googleapis.com',
      path,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(docBody),
      }
    }, docBody);

    if (result.status === 200) {
      console.log(`  ✓ Written: ${id} — ${event.title}`);
    } else {
      console.error(`  ✗ Failed ${id}: ${result.status} — ${result.body.slice(0, 200)}`);
    }
  }

  console.log('\n✅ Done!');
}

seed().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
