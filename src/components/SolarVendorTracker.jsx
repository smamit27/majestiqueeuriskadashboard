import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../firebase.js';

const CATEGORIES = [
  {
    name: 'SYSTEM DESIGN',
    questions: [
      { id: 'sys_size', label: 'What is total system size?', benchmark: '20 kW' },
      { id: 'sys_ratio', label: 'What is DC/AC ratio?', benchmark: '1.1 - 1.3' },
      { id: 'sys_inv_just', label: 'Why this inverter size is selected?', benchmark: 'Proper justification' },
    ]
  },
  {
    name: 'PANELS',
    questions: [
      { id: 'pnl_brand', label: 'Which panel brand & technology?', benchmark: 'TOPCon (Waaree/Vikram)' },
      { id: 'pnl_eff', label: 'Panel efficiency?', benchmark: '≥21%' },
      { id: 'pnl_deg', label: 'Degradation rate?', benchmark: 'Yr1 ≤2%, then ≤0.5%' },
      { id: 'pnl_cert', label: 'Certifications available?', benchmark: 'IEC 61215, 61730' },
    ]
  },
  {
    name: 'INVERTER',
    questions: [
      { id: 'inv_brand', label: 'Which inverter brand?', benchmark: 'Sungrow / Growatt' },
      { id: 'inv_eff', label: 'Inverter efficiency?', benchmark: '≥98%' },
      { id: 'inv_mppt', label: 'No. of MPPT?', benchmark: '≥2 MPPT' },
      { id: 'inv_monitor', label: 'Monitoring system included?', benchmark: 'Mobile/App based' },
    ]
  },
  {
    name: 'GENERATION',
    questions: [
      { id: 'gen_annual', label: 'Expected annual generation?', benchmark: '28,000 - 32,000 units' },
      { id: 'gen_guarantee', label: 'Do you guarantee generation?', benchmark: 'Yes / partial' },
      { id: 'gen_pr', label: 'Performance Ratio (PR)?', benchmark: '≥75%' },
    ]
  },
  {
    name: 'STRUCTURE',
    questions: [
      { id: 'str_type', label: 'Structure type?', benchmark: 'Elevated HDGI' },
      { id: 'str_gi', label: 'GI coating thickness?', benchmark: '≥80 micron' },
      { id: 'str_wind', label: 'Wind load capacity?', benchmark: '≥150 km/h' },
      { id: 'str_design', label: 'Design standard followed?', benchmark: 'IS 875 Part 3' },
    ]
  },
  {
    name: 'SAFETY',
    questions: [
      { id: 'sft_earthing', label: 'Earthing resistance?', benchmark: '<1 ohm' },
      { id: 'sft_arrestor', label: 'Lightning arrestor included?', benchmark: 'Yes' },
      { id: 'sft_db', label: 'DB protection brands?', benchmark: 'Schneider / L&T / ABB' },
    ]
  },
  {
    name: 'ELECTRICAL',
    questions: [
      { id: 'ele_dc', label: 'DC cable size?', benchmark: '4 - 6 sqmm copper' },
      { id: 'ele_ac', label: 'AC cable brand?', benchmark: 'Polycab / Finolex' },
      { id: 'ele_mc4', label: 'MC4 connectors rating?', benchmark: 'IP67, 1000V' },
    ]
  },
  {
    name: 'NET METERING',
    questions: [
      { id: 'net_who', label: 'Who handles net metering?', benchmark: 'Vendor' },
      { id: 'net_time', label: 'Timeline for approval?', benchmark: '30 - 60 days' },
      { id: 'net_appr', label: 'MSEDCL approvals included?', benchmark: 'Yes' },
    ]
  },
  {
    name: 'MAINTENANCE',
    questions: [
      { id: 'mnt_amc', label: 'AMC included?', benchmark: 'Yes / optional' },
      { id: 'mnt_clean', label: 'Cleaning frequency?', benchmark: 'Monthly / quarterly' },
      { id: 'mnt_resp', label: 'Response time for issues?', benchmark: '<48 hours' },
    ]
  },
  {
    name: 'WARRANTY',
    questions: [
      { id: 'war_panel', label: 'Panel warranty?', benchmark: '25 - 30 yrs' },
      { id: 'war_inv', label: 'Inverter warranty?', benchmark: '8 - 10 yrs' },
      { id: 'war_work', label: 'Workmanship warranty?', benchmark: '≥2 - 5 yrs' },
      { id: 'war_water', label: 'Waterproofing responsibility?', benchmark: 'Vendor clarity' },
    ]
  },
  {
    name: 'RISK / SAFETY',
    questions: [
      { id: 'rsk_liab', label: 'Structure damage liability?', benchmark: 'Defined' },
      { id: 'rsk_disast', label: 'Disaster coverage?', benchmark: 'Not included' },
      { id: 'rsk_insur', label: 'Insurance support provided?', benchmark: 'Yes guidance' },
    ]
  },
  {
    name: 'COSTING',
    questions: [
      { id: 'cst_total', label: 'Total project cost?', benchmark: '₹9 - 11L' },
      { id: 'cst_watt', label: 'Cost per watt?', benchmark: '₹45 - 55 / W' },
      { id: 'cst_hidden', label: 'Any hidden charges?', benchmark: 'No' },
    ]
  }
];

const DEFAULT_FORM = {
  vendor1: { name: '', answers: {}, score: '', remarks: '' },
  vendor2: { name: '', answers: {}, score: '', remarks: '' },
  vendor3: { name: '', answers: {}, score: '', remarks: '' }
};

export default function SolarVendorTracker({ isAdmin = false }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const loadedRef = useRef(false);
  const recordId = 'solar_vendor_evaluation_20kw';

  useEffect(() => {
    let cancelled = false;
    loadedRef.current = false;
    setSaveStatus('idle'); setSaveMsg('');

    async function load() {
      setLoading(true);
      if (!isFirebaseConfigured || !db) { setLoading(false); loadedRef.current = true; return; }
      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, 'solarEvaluations', recordId));
        if (!cancelled && snap.exists()) {
          setForm({ ...DEFAULT_FORM, ...snap.data().form });
          setSaveMsg('Loaded from Firebase ✓');
        } else if (!cancelled) {
          setForm(DEFAULT_FORM);
          setSaveMsg('New evaluation checklist');
        }
      } catch (e) { console.error(e); }
      finally { if (!cancelled) { setLoading(false); loadedRef.current = true; } }
    }
    load();
    return () => { cancelled = true; };
  }, [recordId]);

  const saveToFirebase = useCallback(async (currentForm) => {
    setSaveStatus('saving');
    try {
      await ensureFirebaseSession();
      await setDoc(doc(db, 'solarEvaluations', recordId),
        { form: currentForm, updatedAt: serverTimestamp() }, { merge: true });
      setSaveStatus('saved'); setSaveMsg('Saved to Firebase ✓');
    } catch (e) { setSaveStatus('error'); setSaveMsg('Save failed.'); }
  }, [recordId]);

  async function handleManualSave() {
    setIsSaving(true);
    await saveToFirebase(form);
    setIsSaving(false);
  }

  function handleVendorNameChange(vendorKey, name) {
    setForm(prev => ({
      ...prev,
      [vendorKey]: { ...prev[vendorKey], name }
    }));
  }

  function handleAnswerChange(vendorKey, questionId, value) {
    setForm(prev => ({
      ...prev,
      [vendorKey]: {
        ...prev[vendorKey],
        answers: {
          ...prev[vendorKey].answers,
          [questionId]: value
        }
      }
    }));
  }

  function handleScoreChange(vendorKey, field, value) {
    setForm(prev => ({
      ...prev,
      [vendorKey]: { ...prev[vendorKey], [field]: value }
    }));
  }

  function handleDownloadExcel() {
    const rows = [
      ['VENDOR QUESTION CHECKLIST (20 kW SOLAR)'],
      ['MAJESTIQUE EURISKA HOUSING SOCIETY'],
      [],
      ['Category', 'Question to Vendor', 'Expected Answer (Benchmark)', form.vendor1.name || 'Vendor 1', form.vendor2.name || 'Vendor 2', form.vendor3.name || 'Vendor 3'],
    ];

    CATEGORIES.forEach(cat => {
      cat.questions.forEach((q, i) => {
        rows.push([
          i === 0 ? cat.name : '',
          q.label,
          q.benchmark,
          form.vendor1.answers[q.id] || '',
          form.vendor2.answers[q.id] || '',
          form.vendor3.answers[q.id] || ''
        ]);
      });
    });

    rows.push([]);
    rows.push(['', '', 'Overall Score (1-5)', form.vendor1.score, form.vendor2.score, form.vendor3.score]);
    rows.push(['', '', 'Remarks', form.vendor1.remarks, form.vendor2.remarks, form.vendor3.remarks]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 35 }, { wch: 25 }, { wch: 22 }, { wch: 22 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Solar Evaluation');
    XLSX.writeFile(wb, 'solar-vendor-evaluation.xlsx');
    setSaveMsg('Excel downloaded.');
  }

  const badge = { idle: { c: '#6b7280', i: '●' }, pending: { c: '#f59e0b', i: '⏳' }, saving: { c: '#3b82f6', i: '↑' }, saved: { c: '#10b981', i: '✓' }, error: { c: '#ef4444', i: '✗' } }[saveStatus];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
      <div className="table-card attendance-table-card" style={{ padding: 0 }}>
        <div className="attendance-table-card__header">
          <div>
            <p className="eyebrow">Project Evaluation</p>
            <h3>Vendor Question Checklist (20 kW Solar)</h3>
          </div>
          <div className="attendance-table-card__actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: badge.c, fontWeight: 500, fontSize: '0.9rem' }}>
              <span>{badge.i}</span>
              <span>{isLoading ? 'Loading…' : saveMsg || 'Ready'}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {isAdmin && (
                <button
                  className="button-primary"
                  type="button"
                  onClick={handleManualSave}
                  disabled={isSaving || isLoading}
                >
                  {isSaving ? 'Saving…' : '💾 Save Checklist'}
                </button>
              )}
              <button className="button-secondary" type="button" onClick={handleDownloadExcel}>
                ⬇ Download Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="table-card" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#1e3a8a', color: 'white' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, width: '120px' }}>Category</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, minWidth: '220px' }}>Question to Vendor</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, minWidth: '180px', background: '#172554' }}>Expected Answer (Benchmark)</th>
              {['vendor1', 'vendor2', 'vendor3'].map((vKey, i) => (
                <th key={vKey} style={{ padding: '8px', minWidth: '200px', background: ['#2563eb', '#16a34a', '#7e22ce'][i] }}>
                  <div style={{ textAlign: 'center', marginBottom: '6px', fontSize: '0.8rem', opacity: 0.9 }}>VENDOR {i + 1}</div>
                  <input
                    type="text"
                    value={form[vKey].name}
                    onChange={(e) => handleVendorNameChange(vKey, e.target.value)}
                    placeholder="Enter Vendor Name"
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: 'none', textAlign: 'center', fontWeight: 'bold' }}
                    readOnly={!isAdmin}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat, cIdx) => (
              <Fragment key={cat.name}>
                {cat.questions.map((q, qIdx) => (
                  <tr key={q.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    {qIdx === 0 && (
                      <td rowSpan={cat.questions.length} style={{ padding: '10px 14px', fontWeight: 700, verticalAlign: 'top', background: 'rgba(0,0,0,0.02)', color: '#334155', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                        {cat.name}
                      </td>
                    )}
                    <td style={{ padding: '8px 14px', color: '#1e293b' }}>{q.label}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 600, color: '#334155', background: 'rgba(0,0,0,0.02)' }}>{q.benchmark}</td>
                    {['vendor1', 'vendor2', 'vendor3'].map((vKey, vIdx) => (
                      <td key={vKey} style={{ padding: '4px 8px', background: ['rgba(37, 99, 235, 0.05)', 'rgba(22, 163, 74, 0.05)', 'rgba(126, 34, 206, 0.05)'][vIdx] }}>
                        <input
                          type="text"
                          value={form[vKey].answers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(vKey, q.id, e.target.value)}
                          placeholder="Your Answer"
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.1)', background: 'white' }}
                          readOnly={!isAdmin}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid rgba(0,0,0,0.1)' }}>
              <td colSpan={3} style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>Overall Score (1-5)</td>
              {['vendor1', 'vendor2', 'vendor3'].map((vKey, vIdx) => (
                <td key={vKey} style={{ padding: '8px', background: ['rgba(37, 99, 235, 0.1)', 'rgba(22, 163, 74, 0.1)', 'rgba(126, 34, 206, 0.1)'][vIdx] }}>
                   <input
                      type="number"
                      min="1" max="5"
                      value={form[vKey].score || ''}
                      onChange={(e) => handleScoreChange(vKey, 'score', e.target.value)}
                      placeholder="Score"
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.15)', fontWeight: 'bold', textAlign: 'center' }}
                      readOnly={!isAdmin}
                    />
                </td>
              ))}
            </tr>
            <tr>
              <td colSpan={3} style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>Remarks / Recommendation</td>
              {['vendor1', 'vendor2', 'vendor3'].map((vKey, vIdx) => (
                <td key={vKey} style={{ padding: '8px', background: ['rgba(37, 99, 235, 0.1)', 'rgba(22, 163, 74, 0.1)', 'rgba(126, 34, 206, 0.1)'][vIdx] }}>
                   <textarea
                      value={form[vKey].remarks || ''}
                      onChange={(e) => handleScoreChange(vKey, 'remarks', e.target.value)}
                      placeholder="Remarks"
                      rows={2}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.15)', resize: 'vertical' }}
                      readOnly={!isAdmin}
                    />
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
         <div className="table-card" style={{ padding: '20px' }}>
            <h4 style={{ marginTop: 0, marginBottom: '12px', opacity: 0.8 }}>Scoring Guide (Internal Use)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr', gap: '8px', fontSize: '0.85rem' }}>
              <strong style={{ background: '#1e293b', color: 'white', textAlign: 'center', padding: '4px', borderRadius: '4px' }}>5</strong> <span>Excellent (Exceeds Benchmark)</span>
              <strong style={{ background: '#334155', color: 'white', textAlign: 'center', padding: '4px', borderRadius: '4px' }}>4</strong> <span>Good (Meets Benchmark)</span>
              <strong style={{ background: '#475569', color: 'white', textAlign: 'center', padding: '4px', borderRadius: '4px' }}>3</strong> <span>Average (Partially Meets Benchmark)</span>
              <strong style={{ background: '#64748b', color: 'white', textAlign: 'center', padding: '4px', borderRadius: '4px' }}>2</strong> <span>Below Average (Below Benchmark)</span>
              <strong style={{ background: '#94a3b8', color: 'white', textAlign: 'center', padding: '4px', borderRadius: '4px' }}>1</strong> <span>Poor (Does Not Meet Benchmark)</span>
            </div>
         </div>
      </div>
    </div>
  );
}
