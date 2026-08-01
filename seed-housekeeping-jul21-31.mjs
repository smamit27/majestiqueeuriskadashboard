#!/usr/bin/env node
// seed-housekeeping-jul21-31.mjs
// Inserts housekeeping attendance for July 21–31, 2026
// Target: housekeepingAttendanceRegisters / register_2026-07
// Run: node seed-housekeeping-jul21-31.mjs

import { execSync } from 'child_process';
import https from 'https';

const PROJECT_ID = 'majestiqueeuriskadashboard';
const COLLECTION  = 'housekeepingAttendanceRegisters';
const DOC_ID      = 'register_2026-07';

// ── Attendance data Jul 21–31 ─────────────────────────────────────────────
// Columns: a=Building A, b=Building B, c=Building C, supervisor, common, tractorTrip
const ROWS = [
  { date: '2026-07-21', a: 2, b: 2, c: 1, supervisor: 1, common: 1, tractorTrip: 0 },
  { date: '2026-07-22', a: 2, b: 2, c: 1, supervisor: 1, common: 3, tractorTrip: 0 },
  { date: '2026-07-23', a: 2, b: 2, c: 1, supervisor: 1, common: 3, tractorTrip: 0 },
  { date: '2026-07-24', a: 2, b: 2, c: 1, supervisor: 1, common: 3, tractorTrip: 0 },
  { date: '2026-07-25', a: 2, b: 2, c: 1, supervisor: 1, common: 2, tractorTrip: 0 },
  { date: '2026-07-26', a: 2, b: 2, c: 1, supervisor: 1, common: 2, tractorTrip: 0 },
  { date: '2026-07-27', a: 2, b: 2, c: 1, supervisor: 1, common: 0, tractorTrip: 0 },
  { date: '2026-07-28', a: 2, b: 2, c: 1, supervisor: 1, common: 1, tractorTrip: 0 },
  { date: '2026-07-29', a: 2, b: 2, c: 1, supervisor: 1, common: 2, tractorTrip: 0 },
  { date: '2026-07-30', a: 2, b: 2, c: 1, supervisor: 1, common: 2, tractorTrip: 0 },
  { date: '2026-07-31', a: 2, b: 2, c: 1, supervisor: 1, common: 1, tractorTrip: '' },
];

function toFSValue(v) {
  if (v === '' || v === null || v === undefined) return { stringValue: '' };
  if (typeof v === 'number') return { integerValue: String(v) };
  return { stringValue: String(v) };
}

function rowToMapValue(row) {
  return {
    mapValue: {
      fields: {
        a:           toFSValue(row.a),
        b:           toFSValue(row.b),
        c:           toFSValue(row.c),
        supervisor:  toFSValue(row.supervisor),
        common:      toFSValue(row.common),
        tractorTrip: toFSValue(row.tractorTrip),
      }
    }
  };
}

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function seed() {
  console.log('🧹 Housekeeping Attendance Seeder — July 21–31, 2026');
  console.log(`📦 Target: ${COLLECTION}/${DOC_ID}\n`);

  // Get auth token (firebase-tools cached)
  let token = null;
  try {
    const raw = execSync('cat ~/.config/firebase/auth_tokens.json 2>/dev/null', { encoding: 'utf8' });
    const json = JSON.parse(raw);
    const user = Object.values(json?.users || {})[0];
    token = user?.tokens?.access_token || null;
    if (token) console.log('Using firebase-tools cached token ✓');
  } catch (_) {}

  if (!token) {
    try {
      token = execSync('gcloud auth print-access-token 2>/dev/null', { encoding: 'utf8' }).trim();
      if (token) console.log('Using gcloud token ✓');
    } catch (_) {}
  }

  if (!token) {
    console.error('❌ No access token. Run: firebase login');
    process.exit(1);
  }

  // Build entries map
  const entriesFields = {};
  for (const row of ROWS) {
    entriesFields[row.date] = rowToMapValue(row);
  }

  // updateMask: only touch specific entry keys (safe merge — existing days untouched)
  const maskFields = ROWS.map(r => `entries.\`${r.date}\``);
  const maskQuery  = maskFields.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');

  const body = JSON.stringify({
    fields: {
      month:        { stringValue: '2026-07' },
      registerType: { stringValue: 'daily-manpower' },
      entries:      { mapValue: { fields: entriesFields } },
    }
  });

  const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${DOC_ID}?${maskQuery}`;

  console.log(`📤 PATCHing ${ROWS.length} day entries (Jul 21 → Jul 31) with field-level mask...\n`);

  const result = await httpsRequest({
    hostname: 'firestore.googleapis.com',
    path,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Content-Length': Buffer.byteLength(body),
    }
  }, body);

  if (result.status === 200) {
    console.log('✅ Successfully written to Firestore!\n');
    console.log('Day Summary:');
    for (const r of ROWS) {
      const total = r.a + r.b + r.c + r.supervisor + (r.common === '' ? 0 : Number(r.common));
      const trip  = r.tractorTrip === '' ? '—' : r.tractorTrip;
      console.log(`  ${r.date}  A:${r.a} B:${r.b} C:${r.c} Sup:${r.supervisor} Com:${r.common}  ∑${total}  Tractor:${trip}`);
    }
  } else {
    console.error(`❌ PATCH failed (HTTP ${result.status}):`);
    console.error(result.body.slice(0, 600));
    process.exit(1);
  }
}

seed().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
