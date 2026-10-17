import { useCallback, useMemo, useState } from 'react';
import { SOCIETY_INFO } from '../../data/societyConfig.js';
import { initialParkingData } from '../../data/parkingAllotmentData.js';

/**
 * IndividualFlatNoticeCard Component
 * Displays a formal society letterhead notice addressed to a specific flat
 * requiring submission and regularization of covered parking slot details.
 * Supports dropdown flat switching, Ultra-HD Canvas PNG export, print-to-PDF,
 * and one-click formatted WhatsApp sharing.
 */
export default function IndividualFlatNoticeCard({
  flat = 'A-101',
  flatsList = [],
  parkingRecords = null,
  onSelectFlat = null,
  onBackToRegister = null
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Derive flat record details
  const flatRecord = useMemo(() => {
    const list = Array.isArray(parkingRecords) ? parkingRecords : initialParkingData;
    return list.find(p => p.flat === flat) || null;
  }, [parkingRecords, flat]);

  const residentName = flatRecord?.residentName || `Owner / Resident of Flat ${flat}`;
  const floorNo = flatRecord?.floor || flat.split('-')[1]?.charAt(0) || '1';
  const parkingType = flatRecord?.parkingType || 'Covered Parking';

  // Dates
  const todayFormatted = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  const deadlineFormatted = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  const noticeRef = `ME-A/CHS/NOT/2026/CP-${flat.replace('-', '')}`;

  // Navigation (Prev / Next Flat)
  const currentIndex = flatsList.indexOf(flat);
  const prevFlat = currentIndex > 0 ? flatsList[currentIndex - 1] : null;
  const nextFlat = currentIndex < flatsList.length - 1 ? flatsList[currentIndex + 1] : null;

  // ── WhatsApp Text Formatting ──────────────────────────────────────────────
  const formattedNoticeText = useMemo(() => {
    return `🚨 *OFFICIAL SOCIETY NOTICE: PARKING SLOT DETAILS* 🚨
*MAJESTIQUE EURISKA 'A' CO-OP HOUSING SOCIETY LTD.*
${SOCIETY_INFO.fullLegalHeader}

*To:* The Owner / Resident, Flat No. *${flat}* (Wing A)
*Resident Name:* ${residentName}
*Notice Ref:* ${noticeRef}
*Date:* ${todayFormatted}

*Subject:* URGENT SUBMISSION & VERIFICATION OF COVERED PARKING PARTICULARS

Dear Resident / Member,

As per the official records of Majestique Euriska 'A' Building CHS Ltd., Flat No. *${flat}* is registered with an entitlement for *Covered Parking*. However, your specific designated *Slot Number* is currently *PENDING / UNCONFIRMED* in the society allocation roster.

To ensure comprehensive parking regularization, avoid parking inconvenience, and finalize society records, you are requested to submit the following particulars within *7 days* (by *${deadlineFormatted}*):

1️⃣ *Copy of Agreement / Builder Allotment Letter* (Covered Parking entitlement clause)
2️⃣ *Slot Identification Number* (Basement / Stilt slot number as per builder documents)

*Submission Modes:*
📧 Email scanned copies to: *${SOCIETY_INFO.email}* (mention Flat ${flat} in subject)
🏢 Submit hard copies at Society Office (Clubhouse) between 7:00 PM – 9:00 PM.

Your timely cooperation is appreciated.

*By Order of the Managing Committee*
*Majestique Euriska 'A' Building Co-operative Housing Society Ltd.*`;
  }, [flat, residentName, noticeRef, todayFormatted, deadlineFormatted]);

  const handleCopyText = useCallback(() => {
    navigator.clipboard.writeText(formattedNoticeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [formattedNoticeText]);

  const handleWhatsAppShare = useCallback(() => {
    const encoded = encodeURIComponent(formattedNoticeText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
  }, [formattedNoticeText]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ── High-Res Canvas Notice Exporter (2x Retina PNG) ────────────────────────
  const handleDownloadNoticePNG = useCallback(async () => {
    setDownloading(true);
    try {
      const loadLogo = () => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => {
            const fallback = new Image();
            fallback.crossOrigin = 'anonymous';
            fallback.onload = () => resolve(fallback);
            fallback.onerror = () => resolve(null);
            fallback.src = '/logo.png';
          };
          img.src = '/euriska_logo.png';
        });
      };

      const logoImg = await loadLogo();

      const scale = 2;
      const width = 1200;
      const height = 1450;

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.scale(scale, scale);

      // 1. Ambient Background
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0c2340');
      bgGrad.addColorStop(0.35, '#1e3a8a');
      bgGrad.addColorStop(0.7, '#2563eb');
      bgGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Main Letter Document Sheet
      const sheetX = 50;
      const sheetY = 50;
      const sheetW = width - 100;
      const sheetH = height - 100;
      const radius = 20;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(sheetX, sheetY, sheetW, sheetH, radius);
      ctx.clip();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sheetX, sheetY, sheetW, sheetH);

      // 3. Official Letterhead Banner
      const headH = 150;
      const headGrad = ctx.createLinearGradient(sheetX, sheetY, sheetX + sheetW, sheetY);
      headGrad.addColorStop(0, '#091a32');
      headGrad.addColorStop(0.5, '#0f2952');
      headGrad.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = headGrad;
      ctx.fillRect(sheetX, sheetY, sheetW, headH);

      // Gold Bottom Accent Rule
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(sheetX, sheetY + headH - 4, sheetW, 4);

      // Draw Circular Society Logo on Left
      const logoRadius = 46;
      const logoCenterX = sheetX + 75;
      const logoCenterY = sheetY + 75;

      if (logoImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoCenterX, logoCenterY, logoRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#f59e0b';
        ctx.stroke();
        ctx.clip();
        ctx.drawImage(
          logoImg,
          logoCenterX - logoRadius,
          logoCenterY - logoRadius,
          logoRadius * 2,
          logoRadius * 2
        );
        ctx.restore();
      }

      // Letterhead Typography
      const textStartX = logoCenterX + logoRadius + 24;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText("MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.", textStartX, sheetY + 45);

      ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#fde68a';
      ctx.fillText(SOCIETY_INFO.marathiName, textStartX, sheetY + 70);

      ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`Reg. No: ${SOCIETY_INFO.regNoShort} • Date 09/08/2019`, textStartX, sheetY + 92);
      ctx.fillText(SOCIETY_INFO.address, textStartX, sheetY + 112);
      ctx.fillText(`Official Email: ${SOCIETY_INFO.email}`, textStartX, sheetY + 130);

      // 4. Reference & Date Bar
      const metaY = sheetY + headH + 24;
      ctx.fillStyle = '#0f2952';
      ctx.font = '700 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`Notice Ref: ${noticeRef}`, sheetX + 40, metaY);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#475569';
      ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`Date: ${todayFormatted}`, sheetX + sheetW - 40, metaY);

      // Horizontal line
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sheetX + 40, metaY + 14);
      ctx.lineTo(sheetX + sheetW - 40, metaY + 14);
      ctx.stroke();

      // 5. Recipient Box
      const recipY = metaY + 36;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(sheetX + 40, recipY, sheetW - 80, 110, 12);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#1e3a8a';
      ctx.font = '800 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`TO: THE OWNER / RESIDENT`, sheetX + 60, recipY + 28);

      ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f2952';
      ctx.fillText(`FLAT NO. ${flat} (Floor ${floorNo}, Wing A)`, sheetX + 60, recipY + 56);

      ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(`Resident / Member Name: ${residentName}`, sheetX + 60, recipY + 84);

      // Status pill on the right of recipient box
      const pillW = 210;
      const pillX = sheetX + sheetW - 40 - pillW - 20;
      const pillY = recipY + 30;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, 46, 10);
      ctx.fillStyle = '#fee2e2';
      ctx.fill();
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#991b1b';
      ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔴 ACTION REQUIRED', pillX + (pillW / 2), pillY + 20);
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Covered Slot Details Pending', pillX + (pillW / 2), pillY + 36);
      ctx.restore();

      // 6. Subject Header
      const subjY = recipY + 145;
      ctx.fillStyle = '#0f2952';
      ctx.textAlign = 'left';
      ctx.font = '800 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('SUBJECT: URGENT SUBMISSION & VERIFICATION OF COVERED PARKING PARTICULARS', sheetX + 40, subjY);

      // Underline under subject
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(sheetX + 40, subjY + 6, sheetW - 80, 2.5);

      // 7. Notice Body Paragraphs
      ctx.fillStyle = '#1e293b';
      ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      let currentY = subjY + 36;
      const lineHeight = 24;

      const p1 = `Dear Resident / Member,`;
      ctx.fillText(p1, sheetX + 40, currentY);
      currentY += lineHeight + 4;

      const p2 = `1. In accordance with the resolutions passed in the General Body Meetings and the applicable provisions of the Maharashtra Co-operative Societies (MCS) Act, the Society is conducting a comprehensive audit and regularization of all vehicle parking allocations in 'A' Building.`;
      const p3 = `2. As per the official society allotment master records, Flat No. ${flat} is registered with an entitlement for ${parkingType}; however, your specific designated Parking Slot Number is currently marked as PENDING / UNCONFIRMED in the society register.`;
      const p4 = `3. To finalize the official building parking map and regularize society parking records, you are hereby requested to provide the following documents and particulars within 7 (seven) days (on or before ${deadlineFormatted}):`;

      const wrapText = (text, maxWidth) => {
        const words = text.split(' ');
        const lines = [];
        let line = '';
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);
        return lines;
      };

      [p2, p3, p4].forEach(p => {
        const lines = wrapText(p, sheetW - 80);
        lines.forEach(l => {
          ctx.fillText(l, sheetX + 40, currentY);
          currentY += lineHeight;
        });
        currentY += 8;
      });

      // 8. Required Documents Checklist Box
      const checkY = currentY + 6;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(sheetX + 40, checkY, sheetW - 80, 105, 12);
      ctx.fillStyle = '#eff6ff';
      ctx.fill();
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#1e3a8a';
      ctx.font = '800 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('📋 REQUIRED SUBMISSION CHECKLIST (Within 7 Days):', sheetX + 60, checkY + 28);

      const itemsList = [
        '1. Copy of Agreement / Builder Allotment Letter confirming Covered Parking entitlement.',
        '2. Exact Slot Identification Number (Basement / Stilt slot number as per builder documents).'
      ];

      ctx.fillStyle = '#0f2952';
      ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      itemsList.forEach((it, idx) => {
        ctx.fillText(it, sheetX + 60, checkY + 56 + (idx * 26));
      });
      ctx.restore();

      // 9. Submission Modes
      currentY = checkY + 125;
      ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#334155';

      const p5 = `4. Submission Modes: You may email clear scanned copies to ${SOCIETY_INFO.email} (mention Flat ${flat} in the subject) or submit physical photocopies at the Society Office during office hours (7:00 PM – 9:00 PM).`;

      const lines = wrapText(p5, sheetW - 80);
      lines.forEach(l => {
        ctx.fillText(l, sheetX + 40, currentY);
        currentY += lineHeight - 3;
      });
      currentY += 10;

      // 10. Official Sign-off Block & Stamp
      const signY = currentY + 30;
      ctx.fillStyle = '#0f2952';
      ctx.font = '700 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('By Order of the Managing Committee,', sheetX + sheetW - 380, signY);

      ctx.font = '800 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText("Majestique Euriska 'A' Building CHS Ltd.", sheetX + sheetW - 380, signY + 26);

      ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Secretary / Chairman / Parking Sub-Committee', sheetX + sheetW - 380, signY + 48);

      // Official Stamp / Seal Emblem Graphic on the right
      const stampX = sheetX + sheetW - 130;
      const stampY = signY + 25;
      ctx.save();
      ctx.beginPath();
      ctx.arc(stampX, stampY, 38, 0, Math.PI * 2);
      ctx.strokeStyle = '#1e40af';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(stampX, stampY, 34, 0, Math.PI * 2);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = '800 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#1e40af';
      ctx.textAlign = 'center';
      ctx.fillText('MAJESTIQUE EURISKA', stampX, stampY - 14);
      ctx.font = '700 7.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText("'A' BUILDING CHS", stampX, stampY - 4);
      ctx.font = '800 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#dc2626';
      ctx.fillText('★ OFFICIAL SEAL ★', stampX, stampY + 8);
      ctx.font = '600 7px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#1e40af';
      ctx.fillText('REG. NO. 21207/2019-20', stampX, stampY + 18);
      ctx.restore();

      // Outer Sheet Glass Border
      ctx.restore();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(sheetX, sheetY, sheetW, sheetH, radius);
      ctx.stroke();

      // Trigger Download
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `Notice_Flat_${flat}_Pending_Parking_Details.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error generating notice image:', err);
    } finally {
      setTimeout(() => setDownloading(false), 600);
    }
  }, [flat, residentName, floorNo, parkingType, noticeRef, todayFormatted, deadlineFormatted]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* ── Toolbar: Dropdown Selector & Quick Actions ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        padding: '14px 20px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 18,
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)'
      }}>
        {/* Left: Dropdown Flat Selector & Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {onBackToRegister && (
            <button
              type="button"
              onClick={onBackToRegister}
              style={{
                padding: '7px 12px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: '0.80rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <span>◀</span>
              <span>All Flats Register</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label htmlFor="flat-notice-select" style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f2952' }}>
              Select Flat:
            </label>
            <select
              id="flat-notice-select"
              aria-label="Select flat for notice"
              value={flat}
              onChange={(e) => onSelectFlat && onSelectFlat(e.target.value)}
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                border: '2px solid #0284c7',
                background: '#f0f9ff',
                color: '#0f2952',
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.15)'
              }}
            >
              {flatsList.map(f => (
                <option key={f} value={f}>
                  Flat {f} (Floor {f.split('-')[1]?.charAt(0) || '1'})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Prev / Next Flat Buttons */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              onClick={() => prevFlat && onSelectFlat && onSelectFlat(prevFlat)}
              disabled={!prevFlat}
              title={prevFlat ? `Previous flat: ${prevFlat}` : 'No previous flat'}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: prevFlat ? '#ffffff' : '#f1f5f9',
                color: prevFlat ? '#1e293b' : '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: prevFlat ? 'pointer' : 'not-allowed'
              }}
            >
              ◀ Prev
            </button>
            <button
              type="button"
              onClick={() => nextFlat && onSelectFlat && onSelectFlat(nextFlat)}
              disabled={!nextFlat}
              title={nextFlat ? `Next flat: ${nextFlat}` : 'No next flat'}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: nextFlat ? '#ffffff' : '#f1f5f9',
                color: nextFlat ? '#1e293b' : '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: nextFlat ? 'pointer' : 'not-allowed'
              }}
            >
              Next ▶
            </button>
          </div>
        </div>

        {/* Right: Actions (Download PNG, Print PDF, Copy Text, Share WhatsApp) */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleCopyText}
            style={{
              padding: '7px 12px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            {copied ? '✓ Copied Text!' : '📋 Copy Text'}
          </button>

          <button
            type="button"
            onClick={handleWhatsAppShare}
            style={{
              padding: '7px 13px',
              borderRadius: 10,
              border: 'none',
              background: '#25d366',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)'
            }}
          >
            <span>💬</span>
            <span>Send WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: '7px 12px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f2952',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <span>🖨️</span>
            <span>Print / PDF</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadNoticePNG}
            disabled={downloading}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)',
              color: '#ffffff',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: downloading ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
            }}
          >
            <span>📸</span>
            <span>{downloading ? 'Rendering Image...' : 'Download Notice (PNG)'}</span>
          </button>
        </div>
      </div>

      {/* ── Official Letterhead Notice Document Card ── */}
      <div
        id="individual-flat-notice-document"
        style={{
          position: 'relative',
          borderRadius: 24,
          overflow: 'hidden',
          background: '#ffffff',
          border: '2px solid rgba(226, 232, 240, 0.95)',
          boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.15)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        }}
      >
        {/* Official Society Letterhead Header */}
        <div style={{
          background: 'linear-gradient(135deg, #091a32 0%, #0f2952 45%, #1e3a8a 100%)',
          padding: '24px 32px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          position: 'relative',
          borderBottom: '4px solid #f59e0b',
          flexWrap: 'wrap'
        }}>
          {/* Official Round Logo Badge */}
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            padding: 3,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
            border: '2.5px solid #f59e0b'
          }}>
            <img
              src="/euriska_logo.png"
              alt="Majestique Euriska Logo"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/logo.png';
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '50%'
              }}
            />
          </div>

          {/* Letterhead Identity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <h2 style={{
              margin: 0,
              fontSize: 'clamp(1.1rem, 2.2vw, 1.45rem)',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '0.02em',
              lineHeight: 1.2
            }}>
              MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.
            </h2>
            <div style={{ fontSize: '0.82rem', color: '#fde68a', fontWeight: 600 }}>
              {SOCIETY_INFO.marathiName}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: 2 }}>
              Reg. No: <strong>{SOCIETY_INFO.regNoShort}</strong> • Dt. 09/08/2019 • S. No. 2, Plot No C-1, Mohammed Wadi, Pune - 411060
            </div>
            <div style={{ fontSize: '0.72rem', color: '#93c5fd' }}>
              Official Society Email: <strong>{SOCIETY_INFO.email}</strong>
            </div>
          </div>
        </div>

        {/* Notice Meta Strip */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 32px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '0.80rem'
        }}>
          <div>
            <strong style={{ color: '#0f2952' }}>Notice Reference:</strong> <code>{noticeRef}</code>
          </div>
          <div>
            <strong style={{ color: '#0f2952' }}>Date of Issue:</strong> {todayFormatted}
          </div>
        </div>

        {/* Notice Content Container */}
        <div style={{ padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Recipient Information Card */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
            padding: '18px 24px',
            background: 'linear-gradient(145deg, #f0f7ff 0%, #ffffff 100%)',
            borderRadius: 16,
            border: '1.5px solid #bfdbfe'
          }}>
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1e40af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                TO THE MEMBER / RESIDENT
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f2952', marginTop: 3 }}>
                Flat No. {flat} <span style={{ fontSize: '0.90rem', fontWeight: 600, color: '#475569' }}>(Floor {floorNo}, Wing A)</span>
              </div>
              <div style={{ fontSize: '0.90rem', color: '#334155', marginTop: 3 }}>
                Resident / Registered Member: <strong>{residentName}</strong>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
                Allotment Record: <strong style={{ color: '#1e3a8a' }}>{parkingType}</strong> (Designated Slot Identification Pending)
              </div>
            </div>

            {/* Urgency Badge */}
            <div style={{
              padding: '8px 16px',
              borderRadius: 12,
              background: '#fee2e2',
              border: '1.5px solid #fca5a5',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2
            }}>
              <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#991b1b' }}>
                🔴 ACTION REQUIRED
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b91c1c' }}>
                Reply by {deadlineFormatted}
              </span>
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <div style={{
              fontSize: '1.02rem',
              fontWeight: 800,
              color: '#0f2952',
              lineHeight: 1.3
            }}>
              SUBJECT: URGENT SUBMISSION & VERIFICATION OF COVERED PARKING PARTICULARS
            </div>
            <div style={{ width: 160, height: 3.5, background: '#e11d48', borderRadius: 2, marginTop: 6 }} />
          </div>

          {/* Notice Body Text */}
          <div style={{
            fontSize: '0.92rem',
            lineHeight: 1.65,
            color: '#1e293b',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }}>
            <p style={{ margin: 0 }}>
              Dear Member / Resident,
            </p>
            <p style={{ margin: 0 }}>
              1. In accordance with the resolutions passed in the General Body Meetings and the applicable provisions of the Maharashtra Co-operative Societies (MCS) Act, the Society is conducting a comprehensive audit and regularization of all vehicle parking allocations in 'A' Building.
            </p>
            <p style={{ margin: 0 }}>
              2. As per the official society allotment master records, Flat No. <strong>{flat}</strong> is registered with an entitlement for <strong>{parkingType}</strong>; however, your specific designated <strong>Parking Slot Number</strong> is currently marked as <strong>PENDING / UNCONFIRMED</strong> in the society register.
            </p>
            <p style={{ margin: 0 }}>
              3. To finalize the official building parking map and regularize society parking records, you are hereby requested to provide the following documents and particulars within <strong>7 (seven) days</strong> (on or before <strong>{deadlineFormatted}</strong>):
            </p>

            {/* Checklist Highlight Box */}
            <div style={{
              background: '#f8fafc',
              border: '2px dashed #94a3b8',
              borderRadius: 14,
              padding: '16px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              <div style={{ fontWeight: 800, color: '#0f2952', fontSize: '0.92rem' }}>
                📋 Required Submission Checklist:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.88rem', color: '#1e293b' }}>
                <div>• <strong>Copy of Agreement / Builder Allotment Letter</strong> confirming Covered Parking entitlement.</div>
                <div>• <strong>Exact Slot Identification Number</strong> (Basement / Stilt slot number as per builder documents).</div>
              </div>
            </div>

            <p style={{ margin: 0 }}>
              4. <strong>Submission Modes:</strong> You may email clear scanned copies to <strong style={{ color: '#1e40af' }}>{SOCIETY_INFO.email}</strong> (mention Flat <strong>{flat}</strong> in the subject) or submit physical photocopies at the Society Office during office hours (7:00 PM – 9:00 PM).
            </p>
          </div>

          {/* Sign-off & Seal Block */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: 20,
            marginTop: 16,
            paddingTop: 18,
            borderTop: '1px solid #e2e8f0'
          }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Notice Issued On: <strong>{todayFormatted}</strong>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                Scope: Covered Parking Audit • Wing A
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {/* Signatory Text */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f2952' }}>
                  By Order of the Managing Committee
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e3a8a', marginTop: 2 }}>
                  Majestique Euriska 'A' Building CHS Ltd.
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 2 }}>
                  Parking Allotment & Compliance Sub-Committee
                </div>
              </div>

              {/* Official Seal Badge */}
              <div style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                border: '2.5px solid #1e40af',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                textAlign: 'center',
                color: '#1e40af',
                fontSize: '0.48rem',
                fontWeight: 800,
                lineHeight: 1.1,
                boxShadow: '0 2px 8px rgba(30, 64, 175, 0.15)'
              }}>
                <div style={{ border: '1px solid #3b82f6', borderRadius: '50%', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 2 }}>
                  <span>MAJESTIQUE</span>
                  <span>EURISKA 'A'</span>
                  <span style={{ color: '#dc2626', fontSize: '0.52rem', margin: '1px 0' }}>★ SEAL ★</span>
                  <span style={{ fontSize: '0.44rem' }}>2019-20</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
