#!/usr/bin/env node
import { execSync } from 'child_process';
import https from 'https';
import fs from 'fs';
import { initialTenantData } from './src/data/tenantSeedData.js';

const PROJECT_ID = 'majestiqueeuriskadashboard';
const RECORD_ID = 'a_wing_flats_v2';

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
  let token = null;
  try {
    token = execSync('gcloud auth print-access-token 2>/dev/null', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    console.log('Using gcloud access token ✓');
  } catch {
    console.log('gcloud not available, trying firebase-tools...');
    try {
      const configPath = process.env.HOME + '/.config/configstore/firebase-tools.json';
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const tokens = config?.tokens;
      if (tokens?.refresh_token) {
        console.log('Found refresh token, obtaining fresh access token...');
        const bodyStr = new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
          client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
          refresh_token: tokens.refresh_token
        }).toString();

        const res = await httpsRequest({
          hostname: 'oauth2.googleapis.com',
          path: '/token',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(bodyStr)
          }
        }, bodyStr);

        if (res.status === 200) {
          const resObj = JSON.parse(res.body);
          token = resObj.access_token;
          console.log('Successfully refreshed access token ✓');
        } else {
          console.error('Failed to refresh access token:', res.status, res.body);
        }
      } else if (tokens?.access_token) {
        token = tokens.access_token;
        console.log('Using firebase-tools cached token ✓');
      }
    } catch (e) {
      console.error('Could not get access token:', e.message);
    }
  }
  return token;
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

async function seed() {
  console.log(`Pusing Tenant Tracker database with ${initialTenantData.length} records...`);
  const token = await getAccessToken();
  if (!token) {
    console.error('❌ No access token found. Please run: firebase login');
    process.exit(1);
  }

  const docBody = JSON.stringify({
    fields: {
      flats: toFirestoreValue(initialTenantData),
      lastUpdated: { stringValue: new Date().toISOString() }
    }
  });

  const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/tenantTracking/${RECORD_ID}`;

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
    console.log(`\n✅ Successfully seeded ${initialTenantData.length} flats to Firestore record ${RECORD_ID}!`);
  } else {
    console.error(`\n❌ Failed to write to Firestore: ${result.status} — ${result.body}`);
    process.exit(1);
  }
}

seed().catch(err => {
  console.error('Error during execution:', err);
  process.exit(1);
});
