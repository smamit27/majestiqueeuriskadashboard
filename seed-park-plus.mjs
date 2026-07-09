#!/usr/bin/env node
import { execSync } from 'child_process';
import https from 'https';

const PROJECT_ID = 'majestiqueeuriskadashboard';

const invoices = [
  {
    id: 'PTI-202526-MAY',
    invoiceDate: '2025-05-01',
    dueDate: '2025-05-16',
    description: 'Automated Gate and Security Solution',
    hsn: '997319',
    qty: 3,
    uom: 'NOS',
    unitPrice: 18750.0,
    igstRate: 18,
    igstAmt: 3375.0,
    grandTotal: 22125.0,
    paymentStatus: 'Paid',
    paidDate: '',
    remarks: '₹6,250 × 3 months',
    period: '01-05-2025 to 31-07-2025',
  },
  {
    id: 'PTI-202526-001',
    invoiceDate: '2025-05-31',
    dueDate: '2025-06-15',
    description: 'RFID Installation Charges',
    hsn: '995461',
    qty: 1,
    uom: 'NOS',
    unitPrice: 20000.0,
    igstRate: 18,
    igstAmt: 3600.0,
    grandTotal: 23600.0,
    paymentStatus: 'Paid',
    paidDate: '',
    remarks: '',
    period: '',
  },
  {
    id: 'PTI-202526-18817',
    invoiceDate: '2025-08-31',
    dueDate: '2025-09-15',
    description: 'Automated Gate and Security Solution',
    hsn: '997319',
    qty: 1,
    uom: 'NOS',
    unitPrice: 6387.36,
    igstRate: 18,
    igstAmt: 1149.72,
    grandTotal: 7537.0,
    paymentStatus: 'Paid',
    paidDate: '',
    remarks: '',
    period: '31-08-2025 to 30-09-2025',
  },
  {
    id: 'PTI-202526-OCT',
    invoiceDate: '2025-10-01',
    dueDate: '2025-10-16',
    description: 'Automated Gate and Security Solution',
    hsn: '997319',
    qty: 1,
    uom: 'NOS',
    unitPrice: 18750.0,
    igstRate: 18,
    igstAmt: 3392.25,
    grandTotal: 22238.0,
    paymentStatus: 'Paid',
    paidDate: '',
    remarks: '',
    period: '01-10-2025 to 31-12-2025',
  },
  {
    id: 'PTI-202526-JAN',
    invoiceDate: '2026-01-01',
    dueDate: '2026-01-16',
    description: 'Automated Gate and Security Solution',
    hsn: '997319',
    qty: 1,
    uom: 'NOS',
    unitPrice: 18750.0,
    igstRate: 18,
    igstAmt: 3426.74,
    grandTotal: 22464.0,
    paymentStatus: 'Paid',
    paidDate: '',
    remarks: '',
    period: '01-01-2026 to 31-03-2026',
  },
  {
    id: 'PTI202627-01870',
    invoiceDate: '2026-04-01',
    dueDate: '2026-04-16',
    description: 'Automated Gate and Security Solution',
    hsn: '997319',
    qty: 1,
    uom: 'NOS',
    unitPrice: 19687.5,
    igstRate: 18,
    igstAmt: 3543.75,
    grandTotal: 23231.25,
    paymentStatus: 'Paid',
    paidDate: '',
    remarks: '',
    period: '01-04-2026 to 30-06-2026',
  },
  {
    id: 'PTI-202526-JUL',
    invoiceDate: '2026-07-01',
    dueDate: '2026-07-16',
    description: 'Automated Gate and Security Solution',
    hsn: '997319',
    qty: 1,
    uom: 'NOS',
    unitPrice: 19687.5,
    igstRate: 18,
    igstAmt: 3543.75,
    grandTotal: 23231.0,
    paymentStatus: 'Unpaid',
    paidDate: '',
    remarks: '',
    period: '01-07-2026 to 30-09-2026',
  }
];

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
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
  let token = null;
  try {
    token = execSync('gcloud auth print-access-token 2>/dev/null', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    console.log('Using gcloud access token ✓');
  } catch {
    console.log('gcloud not available, trying firebase-tools...');
    try {
      const configPath = process.env.HOME + '/.config/configstore/firebase-tools.json';
      const fs = await import('fs');
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

async function seed() {
  const token = await getAccessToken();
  if (!token) {
    console.error('❌ No access token found. Please run: firebase login');
    process.exit(1);
  }

  for (const inv of invoices) {
    const docBody = JSON.stringify(toFirestoreDoc(inv));
    const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/parkPlusInvoices/${inv.id}`;

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
      console.log(`  ✓ Written: ${inv.id}`);
    } else {
      console.error(`  ✗ Failed ${inv.id}: ${result.status} — ${result.body}`);
    }
  }
  console.log('\n✅ Seeding Park+ Invoices Done!');
}

seed().catch(console.error);
