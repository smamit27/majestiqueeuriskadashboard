import { useCallback, useMemo, useState } from 'react';
import { SOCIETY_INFO } from '../../data/societyConfig.js';
import { initialParkingData } from '../../data/parkingAllotmentData.js';
import './IndividualFlatNoticeCard.css';


/**
 * IndividualFlatNoticeCard Component
 * Displays a formal, authentic society letterhead notice addressed to a specific flat
 * requiring submission and regularization of covered parking slot details.
 * Supports dropdown flat switching, Ultra-HD Canvas PNG export, print-to-PDF,
 * and one-click formatted WhatsApp sharing.
 */
export default function IndividualFlatNoticeCard({
  flat = 'A-101',
  flatsList = [],
  parkingRecords = null,
  onSelectFlat = null,
  onBackToRegister = null,
  onSwitchToGeneral = null
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
    return '24th October 2026';
  }, []);

  const deadlineFormatted = useMemo(() => {
    return '31st October 2026';
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
2️⃣ *Exact Slot Identification Number* (Basement / Stilt slot number as per builder documents)

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

      // Clean White Paper Sheet
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Subtle Legal Margin Border
      const margin = 36;
      ctx.strokeStyle = '#0f2952';
      ctx.lineWidth = 2;
      ctx.strokeRect(margin, margin, width - (margin * 2), height - (margin * 2));

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(margin + 4, margin + 4, width - (margin * 2) - 8, height - (margin * 2) - 8);

      // ── Letterhead Header ────────────────────────────────────────────────
      const headY = margin + 20;
      const logoRadius = 40;
      const logoX = margin + 55;
      const logoY = headY + 45;

      if (logoImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoX, logoY, logoRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#0f2952';
        ctx.stroke();
        ctx.clip();
        ctx.drawImage(logoImg, logoX - logoRadius, logoY - logoRadius, logoRadius * 2, logoRadius * 2);
        ctx.restore();
      }

      // Letterhead Typography
      const textX = logoX + logoRadius + 20;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#991b1b'; // Marathi in formal society maroon/red
      ctx.font = '700 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(SOCIETY_INFO.marathiName, textX, headY + 22);

      ctx.fillStyle = '#0f2952'; // Deep Navy Title
      ctx.font = '800 21px "Times New Roman", Times, Georgia, serif';
      ctx.fillText("MAJESTIQUE EURISKA 'A' BUILDING CO-OPERATIVE HOUSING SOCIETY LTD.", textX, headY + 46);

      ctx.font = '600 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText(`Reg. No: ${SOCIETY_INFO.regNoShort} • Date of Registration: 09/08/2019`, textX, headY + 66);
      ctx.fillText(`Address: ${SOCIETY_INFO.address}`, textX, headY + 82);
      ctx.fillText(`Official Email: ${SOCIETY_INFO.email} • Wing A (87 Flats)`, textX, headY + 98);

      // Double Dividing Line
      const divY = headY + 115;
      ctx.strokeStyle = '#0f2952';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(margin + 16, divY);
      ctx.lineTo(width - margin - 16, divY);
      ctx.stroke();

      ctx.strokeStyle = '#d97706'; // Gold accent rule
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin + 16, divY + 3.5);
      ctx.lineTo(width - margin - 16, divY + 3.5);
      ctx.stroke();

      // ── Document Metadata Strip ──────────────────────────────────────────
      const metaY = divY + 24;
      ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f2952';
      ctx.fillText(`Notice Ref: ${noticeRef}`, margin + 20, metaY);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#334155';
      ctx.fillText(`Date of Issue: ${todayFormatted}`, width - margin - 20, metaY);

      // ── Formal Recipient Box ─────────────────────────────────────────────
      const recipY = metaY + 20;
      ctx.save();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(margin + 20, recipY, width - (margin * 2) - 40, 100);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(margin + 20, recipY, width - (margin * 2) - 40, 100);

      ctx.textAlign = 'left';
      ctx.font = '800 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0369a1';
      ctx.fillText('TO THE MEMBER / RESIDENT:', margin + 36, recipY + 24);

      ctx.font = '800 19px "Times New Roman", Times, Georgia, serif';
      ctx.fillStyle = '#0f2952';
      ctx.fillText(`FLAT NO. ${flat} (Floor ${floorNo}, Wing A)`, margin + 36, recipY + 50);

      ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText(`Resident / Member: ${residentName}`, margin + 36, recipY + 74);
      ctx.fillText(`Registered Entitlement: ${parkingType} (Slot Details Pending)`, margin + 36, recipY + 92);

      // Urgency Pill on Right
      const pillW = 190;
      const pillH = 46;
      const pillX = width - margin - 20 - pillW - 16;
      const pillY = recipY + 26;
      ctx.fillStyle = '#fef2f2';
      ctx.fillRect(pillX, pillY, pillW, pillH);
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(pillX, pillY, pillW, pillH);

      ctx.textAlign = 'center';
      ctx.font = '800 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#991b1b';
      ctx.fillText('🔴 ACTION REQUIRED', pillX + (pillW / 2), pillY + 18);
      ctx.font = '700 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`Reply by ${deadlineFormatted}`, pillX + (pillW / 2), pillY + 34);
      ctx.restore();

      // ── Subject Line ─────────────────────────────────────────────────────
      const subjY = recipY + 130;
      ctx.textAlign = 'left';
      ctx.font = '800 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f2952';
      ctx.fillText('SUBJECT: URGENT SUBMISSION & VERIFICATION OF COVERED PARKING PARTICULARS', margin + 20, subjY);

      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(margin + 20, subjY + 4, 680, 2);

      // ── Body Paragraphs ──────────────────────────────────────────────────
      let curY = subjY + 34;
      ctx.font = '500 13px "Times New Roman", Times, Georgia, serif';
      ctx.fillStyle = '#1e293b';

      ctx.fillText('Dear Resident / Member,', margin + 20, curY);
      curY += 22;

      const p1 = `1. In accordance with the resolutions passed in the General Body Meetings and the applicable provisions of the Maharashtra Co-operative Societies (MCS) Act and Model Bye-Laws 78-84, the Society is conducting a comprehensive audit and regularization of all vehicle parking allocations in 'A' Building.`;
      const p2 = `2. As per the official society allotment master records, Flat No. ${flat} is registered with an entitlement for ${parkingType}; however, your specific designated Parking Slot Number is currently marked as PENDING / UNCONFIRMED in the society register.`;
      const p3 = `3. To finalize the official building parking map and regularize society parking records, you are hereby requested to provide the following documents and particulars within 7 (seven) days (on or before ${deadlineFormatted}):`;

      const wrap = (text, maxW) => {
        const words = text.split(' ');
        const lines = [];
        let cur = '';
        for (let i = 0; i < words.length; i++) {
          const test = cur + words[i] + ' ';
          if (ctx.measureText(test).width > maxW && i > 0) {
            lines.push(cur);
            cur = words[i] + ' ';
          } else {
            cur = test;
          }
        }
        lines.push(cur);
        return lines;
      };

      [p1, p2, p3].forEach(p => {
        const lns = wrap(p, width - (margin * 2) - 40);
        lns.forEach(l => {
          ctx.fillText(l, margin + 20, curY);
          curY += 20;
        });
        curY += 8;
      });

      // ── Checklist Box ────────────────────────────────────────────────────
      curY += 6;
      const boxW = width - (margin * 2) - 40;
      ctx.save();
      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(margin + 20, curY, boxW, 80);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(margin + 20, curY, boxW, 80);

      ctx.textAlign = 'left';
      ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#92400e';
      ctx.fillText('📋 REQUIRED SUBMISSION CHECKLIST (Within 7 Days):', margin + 35, curY + 24);

      ctx.font = '600 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.fillText('1. Copy of Agreement / Builder Allotment Letter confirming Covered Parking entitlement.', margin + 35, curY + 46);
      ctx.fillText('2. Exact Slot Identification Number (Basement / Stilt slot number as per builder documents).', margin + 35, curY + 66);
      ctx.restore();

      curY += 105;

      // ── Modes & Closing ──────────────────────────────────────────────────
      const p4 = `4. Submission Modes: You may email clear scanned copies to ${SOCIETY_INFO.email} (mention Flat ${flat} in the subject) or submit physical photocopies at the Society Office during office hours (7:00 PM – 9:00 PM) to the Society Manager.`;
      const p5 = '5. Statutory Caution: Failure to confirm builder entitlement within the stipulated period will result in the slot remaining unregularized, and the Managing Committee reserves the right to review allotment as per Society Bye-Laws.';

      [p4, p5].forEach(p => {
        const lns = wrap(p, boxW);
        lns.forEach(l => {
          ctx.fillText(l, margin + 20, curY);
          curY += 19;
        });
        curY += 6;
      });

      // ── Signatures & Stamp ───────────────────────────────────────────────
      curY += 30;
      ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f2952';
      ctx.fillText('By Order of the Managing Committee,', margin + 20, curY);
      ctx.fillText("MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.", margin + 20, curY + 18);

      const signY = curY + 68;
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText('Hon. Secretary', margin + 40, signY);
      ctx.fillText('Hon. Chairman', margin + 360, signY);

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin + 40, signY - 8);
      ctx.lineTo(margin + 170, signY - 8);
      ctx.moveTo(margin + 360, signY - 8);
      ctx.lineTo(margin + 490, signY - 8);
      ctx.stroke();

      // Official Purple Circular Rubber Stamp on the right
      const stampX = width - margin - 130;
      const stampY = signY - 20;
      ctx.save();
      ctx.translate(stampX, stampY);
      ctx.rotate(-0.06);
      ctx.strokeStyle = '#4338ca';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 50, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 45, 0, Math.PI * 2);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#4338ca';
      ctx.font = '800 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('MAJESTIQUE EURISKA', 0, -22);
      ctx.font = '700 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText("'A' BLDG CHS LTD. * PUNE *", 0, -10);

      ctx.font = '800 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#b91c1c';
      ctx.fillText('★ OFFICIAL SEAL ★', 0, 4);

      ctx.font = '700 7.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#4338ca';
      ctx.fillText('REG. NO. 21207/2019-20', 0, 17);
      ctx.fillText('DT. 09-08-2019', 0, 27);
      ctx.restore();

      // Footer note
      ctx.font = 'italic 10.5px "Times New Roman", Times, Georgia, serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.fillText('Copy forwarded to: 1. Member Records • 2. Society Office Register • 3. Legal & Compliance File.', margin + 20, height - margin - 16);

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
    <div className="individual-flat-notice-card-s1">
      {/* ── Toolbar: Dropdown Selector & Quick Actions ── */}
      <div className="no-print individual-flat-notice-card-s2">
        {/* Left: Dropdown Flat Selector & Navigation */}
        <div className="individual-flat-notice-card-s3">
          {onBackToRegister && (
            <button
              type="button"
              onClick={onBackToRegister}
              className="individual-flat-notice-card-s4"
            >
              <span>◀</span>
              <span>All Flats Register</span>
            </button>
          )}

          {onSwitchToGeneral && (
            <button
              type="button"
              onClick={onSwitchToGeneral}
              className="individual-flat-notice-card-s5"
            >
              <span>📜</span>
              <span>General Notice (All 30 Flats)</span>
            </button>
          )}

          <div className="individual-flat-notice-card-s6">
            <label htmlFor="flat-notice-select" className="individual-flat-notice-card-s7">
              Select Flat:
            </label>
            <select
              id="flat-notice-select"
              aria-label="Select flat for notice"
              value={flat}
              onChange={(e) => onSelectFlat && onSelectFlat(e.target.value)}
              className="individual-flat-notice-card-s8"
            >
              {flatsList.map(f => (
                <option key={f} value={f}>
                  Flat {f} (Floor {f.split('-')[1]?.charAt(0) || '1'})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Prev / Next Flat Buttons */}
          <div className="individual-flat-notice-card-s9">
            <button
              type="button"
              onClick={() => prevFlat && onSelectFlat && onSelectFlat(prevFlat)}
              disabled={!prevFlat}
              title={prevFlat ? `Previous flat: ${prevFlat}` : 'No previous flat'}
              className="individual-flat-notice-card-s10" style={{ background: prevFlat ? '#ffffff' : '#f1f5f9', color: prevFlat ? '#1e293b' : '#94a3b8', cursor: prevFlat ? 'pointer' : 'not-allowed' }}
            >
              ◀ Prev
            </button>
            <button
              type="button"
              onClick={() => nextFlat && onSelectFlat && onSelectFlat(nextFlat)}
              disabled={!nextFlat}
              title={nextFlat ? `Next flat: ${nextFlat}` : 'No next flat'}
              className="individual-flat-notice-card-s10" style={{ background: nextFlat ? '#ffffff' : '#f1f5f9', color: nextFlat ? '#1e293b' : '#94a3b8', cursor: nextFlat ? 'pointer' : 'not-allowed' }}
            >
              Next ▶
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="individual-flat-notice-card-s11">
          <button
            type="button"
            onClick={handleCopyText}
            className="individual-flat-notice-card-s12"
          >
            {copied ? '✓ Copied Text!' : '📋 Copy Text'}
          </button>

          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="individual-flat-notice-card-s13"
          >
            <span>💬</span>
            <span>Send WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="individual-flat-notice-card-s14"
          >
            <span>🖨️</span>
            <span>Print / PDF</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadNoticePNG}
            disabled={downloading}
            className="individual-flat-notice-card-s15" style={{ cursor: downloading ? 'wait' : 'pointer' }}
          >
            <span>📸</span>
            <span>{downloading ? 'Rendering Image...' : 'Download Notice (PNG)'}</span>
          </button>
        </div>
      </div>

      {/* ── Official Letterhead Notice Document Card ── */}
      <div
        id="individual-flat-notice-document"
        className="individual-flat-notice-card-s16"
      >
        {/* Subtle Watermark */}
        <div className="individual-flat-notice-card-s17">
          OFFICIAL NOTICE
        </div>

        {/* ── Official Society Letterhead ── */}
        <div className="individual-flat-notice-card-s18">
          {/* Authentic Crest / Logo */}
          <div className="individual-flat-notice-card-s19">
            <img
              src="/euriska_logo.png"
              alt="Majestique Euriska Official Logo"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/logo.png';
              }}
              className="individual-flat-notice-card-s20"
            />
          </div>

          {/* Letterhead Identity */}
          <div className="individual-flat-notice-card-s21">
            <div className="individual-flat-notice-card-s22">
              {SOCIETY_INFO.marathiName}
            </div>
            <h1 className="individual-flat-notice-card-s23">
              MAJESTIQUE EURISKA 'A' BUILDING CO-OPERATIVE HOUSING SOCIETY LTD.
            </h1>
            <div className="individual-flat-notice-card-s24">
              Regn. No. {SOCIETY_INFO.regNoShort} • Date of Regn: 09/08/2019
            </div>
            <div className="individual-flat-notice-card-s25">
              Address: {SOCIETY_INFO.address}
            </div>
            <div className="individual-flat-notice-card-s26">
              Email: <u>{SOCIETY_INFO.email}</u> • Wing A (87 Flats)
            </div>
          </div>
        </div>

        {/* Gold Accent Divider */}
        <div className="individual-flat-notice-card-s27" />

        {/* ── Notice Meta Strip ── */}
        <div className="individual-flat-notice-card-s28">
          <div>
            Notice Reference: <code className="individual-flat-notice-card-s29">{noticeRef}</code>
          </div>
          <div>
            Date of Issue: <span>{todayFormatted}</span>
          </div>
        </div>

        {/* ── Centered Notice Banner ── */}
        <div className="individual-flat-notice-card-s30">
          <div className="individual-flat-notice-card-s31">
            OFFICIAL NOTICE / परिपत्रक
          </div>
          <div className="individual-flat-notice-card-s32">
            (Issued under Maharashtra Co-operative Societies Act 1960 & Society Bye-Laws Nos. 78 to 84)
          </div>
        </div>

        {/* ── Recipient Information Card ── */}
        <div className="individual-flat-notice-card-s33">
          <div>
            <div className="individual-flat-notice-card-s34">
              TO THE MEMBER / RESIDENT
            </div>
            <div className="individual-flat-notice-card-s35">
              Flat No. {flat} <span className="individual-flat-notice-card-s36">(Floor {floorNo}, Wing A)</span>
            </div>
            <div className="individual-flat-notice-card-s37">
              Resident / Registered Member: <strong>{residentName}</strong>
            </div>
            <div className="individual-flat-notice-card-s38">
              Allotment Record: <strong className="individual-flat-notice-card-s39">{parkingType}</strong> (Designated Slot Identification Pending)
            </div>
          </div>

          {/* Action Required Badge */}
          <div className="individual-flat-notice-card-s40">
            <span className="individual-flat-notice-card-s41">
              🔴 ACTION REQUIRED
            </span>
            <span className="individual-flat-notice-card-s42">
              Reply by {deadlineFormatted}
            </span>
          </div>
        </div>

        {/* ── Subject Line ── */}
        <div className="individual-flat-notice-card-s43">
          <div className="individual-flat-notice-card-s44">
            SUBJECT: URGENT SUBMISSION & VERIFICATION OF COVERED PARKING PARTICULARS
          </div>
          <div className="individual-flat-notice-card-s45" />
        </div>

        {/* ── Notice Body Text ── */}
        <div className="individual-flat-notice-card-s46">
          <div>
            <strong>Dear Member / Resident,</strong>
          </div>

          <p className="individual-flat-notice-card-s47">
            1. In accordance with the resolutions passed in the General Body Meetings and the applicable provisions of the Maharashtra Co-operative Societies (MCS) Act, the Society is conducting a comprehensive audit and regularization of all vehicle parking allocations in 'A' Building.
          </p>

          <p className="individual-flat-notice-card-s47">
            2. As per the official society allotment master records, Flat No. <strong>{flat}</strong> is registered with an entitlement for <strong>{parkingType}</strong>; however, your specific designated <strong>Parking Slot Number</strong> is currently marked as <strong>PENDING / UNCONFIRMED</strong> in the society register.
          </p>

          <p className="individual-flat-notice-card-s47">
            3. To finalize the official building parking map and regularize society parking records, you are hereby requested to provide the following documents and particulars within <strong>7 (seven) days</strong> (on or before <strong>{deadlineFormatted}</strong>):
          </p>

          {/* Checklist Highlight Box */}
          <div className="individual-flat-notice-card-s48">
            <div className="individual-flat-notice-card-s49">
              📋 Required Submission Checklist:
            </div>
            <div className="individual-flat-notice-card-s50">
              <div>• <strong>Copy of Agreement / Builder Allotment Letter</strong> confirming Covered Parking entitlement.</div>
              <div>• <strong>Exact Slot Identification Number</strong> (Basement / Stilt slot number as per builder documents).</div>
            </div>
          </div>

          <p className="individual-flat-notice-card-s47">
            4. <strong>Submission Modes:</strong> You may email clear scanned copies to <strong className="individual-flat-notice-card-s51">{SOCIETY_INFO.email}</strong> (mention Flat <strong>{flat}</strong> in the subject) or submit physical photocopies at the Society Office during office hours (7:00 PM – 9:00 PM).
          </p>

          <p className="individual-flat-notice-card-s47">
            5. <strong>Statutory Notice:</strong> Failure to confirm builder entitlement within the stipulated period will result in the slot remaining unregularized, and the Managing Committee reserves the right to review allotment as per Society Bye-Laws.
          </p>
        </div>

        {/* ── Sign-off & Seal Block ── */}
        <div className="individual-flat-notice-card-s52">
          <div>
            <div className="individual-flat-notice-card-s53">
              Notice Issued On: <strong>{todayFormatted}</strong>
            </div>
            <div className="individual-flat-notice-card-s54">
              Scope: Covered Parking Audit • Wing A
            </div>

            <div className="individual-flat-notice-card-s55">
              <div className="individual-flat-notice-card-s56">
                By Order of the Managing Committee
              </div>
              <div className="individual-flat-notice-card-s57">
                Majestique Euriska 'A' Building CHS Ltd.
              </div>
              <div className="individual-flat-notice-card-s58">
                Parking Allotment & Compliance Sub-Committee
              </div>
            </div>
          </div>

          {/* Authentic Violet Circular Rubber Stamp */}
          <div className="individual-flat-notice-card-s59">
            <div className="individual-flat-notice-card-s60">
              <span className="individual-flat-notice-card-s61">MAJESTIQUE EURISKA</span>
              <span className="individual-flat-notice-card-s62">'A' BLDG CHS LTD.</span>
              <span className="individual-flat-notice-card-s63">★ OFFICIAL SEAL ★</span>
              <span className="individual-flat-notice-card-s62">REG. NO. 21207/2019-20</span>
              <span className="individual-flat-notice-card-s64">PUNE - 411060</span>
            </div>
          </div>
        </div>

        {/* Document Footer */}
        <div className="individual-flat-notice-card-s65">
          <div>
            Copy to: 1. Member Records • 2. Society Office Register • 3. Legal & Compliance File
          </div>
          <div className="individual-flat-notice-card-s66">
            सोसायटी सूचना फलक व सर्व सभासदांच्या माहितीसाठी
          </div>
        </div>
      </div>
    </div>
  );
}
