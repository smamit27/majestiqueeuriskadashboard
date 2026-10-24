import { useCallback, useMemo, useState } from 'react';
import { SOCIETY_INFO } from '../../data/societyConfig.js';
import { initialParkingData, OFFICIAL_PENDING_PARKING_FLATS, isParkingSlotPending } from '../../data/parkingAllotmentData.js';
import './GeneralParkingNoticeDocument.css';


/**
 * GeneralParkingNoticeDocument Component
 * Renders an authentic, realistic Co-operative Housing Society (CHS) General Notice / Circular
 * on official bilingual society letterhead for notice boards and WhatsApp broadcasts.
 * Covers all flats with pending covered parking slot details under MCS Act Bye-Laws 78-84.
 */
export default function GeneralParkingNoticeDocument({
  flatsList = null,
  parkingRecords = null,
  onSelectFlat = null,
  onBackToRegister = null,
  onSwitchToIndividual = null
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Derive pending flats
  const items = useMemo(() => {
    if (Array.isArray(flatsList)) {
      return flatsList;
    }
    if (Array.isArray(parkingRecords)) {
      return parkingRecords.filter(isParkingSlotPending).map(p => p.flat);
    }
    return OFFICIAL_PENDING_PARKING_FLATS;
  }, [flatsList, parkingRecords]);

  // Map each flat to resident details
  const flatDetailsList = useMemo(() => {
    const list = Array.isArray(parkingRecords) ? parkingRecords : initialParkingData;
    const map = new Map(list.map(p => [p.flat, p]));
    return items.map((flatNo, idx) => {
      const rec = map.get(flatNo);
      return {
        srNo: idx + 1,
        flat: flatNo,
        floor: rec?.floor || flatNo.split('-')[1]?.charAt(0) || '1',
        residentName: rec?.residentName || `Owner of ${flatNo}`,
        occupantType: rec?.occupantType || 'Owner',
        parkingType: rec?.parkingType || 'Covered Parking',
        status: 'Slot Details Pending'
      };
    });
  }, [items, parkingRecords]);

  // Notice metadata
  const noticeRef = 'ME-A/CHS/NOTICE/2026-27/PRK-042';
  const todayFormatted = useMemo(() => {
    return '24th October 2026';
  }, []);

  const deadlineFormatted = useMemo(() => {
    return '31st October 2026';
  }, []);

  // WhatsApp Broadcast Text Formatter
  const formattedWhatsAppNotice = useMemo(() => {
    const flatsChunk = items.join(', ');
    return `📢 *MAJESTIQUE EURISKA 'A' CO-OP HOUSING SOCIETY LTD.*
${SOCIETY_INFO.fullLegalHeader}
Email: ${SOCIETY_INFO.email}

*Ref:* ${noticeRef} | *Date:* ${todayFormatted}

*OFFICIAL SOCIETY NOTICE / परिपत्रक*
*(Issued under Maharashtra Co-operative Societies Act 1960 & Society Bye-Laws 78–84)*

*TO:* ALL MEMBERS & RESIDENTS OF 'A' BUILDING
*SUBJECT:* URGENT SUBMISSION & VERIFICATION OF COVERED PARKING PARTICULARS (PENDING SLOT NO.)

Dear Members / Residents,

The Managing Committee is conducting a mandatory parking audit and regularization drive for 'A' Building. As per physical society records and builder handover registers, the following *${items.length} Flats* are registered with an entitlement for *Covered Parking*, but their physical *Slot Numbers* (Basement / Stilt Slot Identification) are currently *PENDING / UNCONFIRMED*:

*FLATS WITH PENDING SLOT DETAILS (${items.length} FLATS):*
${flatsChunk}

*MANDATORY DOCUMENTS TO SUBMIT WITHIN 7 DAYS (BY ${deadlineFormatted}):*
1️⃣ *Copy of Agreement / Builder Allotment Letter* confirming Covered Parking entitlement.
2️⃣ *Exact Slot Identification Number* (Basement / Stilt slot number as per builder documents).

*SUBMISSION MODES:*
🏢 *Physical:* Submit photocopies at Society Office (Clubhouse) between 7:00 PM – 9:00 PM to Society Manager.
📧 *Email:* Send scanned PDF to *${SOCIETY_INFO.email}* with subject *"Parking Verification - Flat <No>"*.

⚠️ *Note:* In the absence of verifiable builder documents within the deadline, slots will be treated as unregularized and the Managing Committee reserves the right to review allotment as per MCS Bye-Laws.

*By Order of the Managing Committee*
*Majestique Euriska 'A' Building Co-operative Housing Society Ltd.*
Hon. Secretary | Hon. Chairman`;
  }, [items, noticeRef, todayFormatted, deadlineFormatted]);

  const handleCopyText = useCallback(() => {
    navigator.clipboard.writeText(formattedWhatsAppNotice);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [formattedWhatsAppNotice]);

  const handleWhatsAppShare = useCallback(() => {
    const encoded = encodeURIComponent(formattedWhatsAppNotice);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
  }, [formattedWhatsAppNotice]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Canvas Ultra-HD PNG Exporter for the General Notice Document
  const handleDownloadPNG = useCallback(async () => {
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
      const width = 1240;
      // Calculate dynamic height based on table rows (30 flats)
      const rowCount = Math.ceil(flatDetailsList.length / 2);
      const height = Math.max(1650, 850 + (rowCount * 34));

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
      const metaY = divY + 22;
      ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f2952';
      ctx.fillText(`Ref. No.: ${noticeRef}`, margin + 20, metaY);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#334155';
      ctx.fillText(`Date: ${todayFormatted}`, width - margin - 20, metaY);

      // ── Notice Boxed Header ──────────────────────────────────────────────
      const titleBoxY = metaY + 16;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f2952';
      ctx.font = '800 20px "Times New Roman", Times, Georgia, serif';
      ctx.fillText('CIRCULAR / OFFICIAL NOTICE', width / 2, titleBoxY + 18);

      ctx.font = '700 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#b45309';
      ctx.fillText('(Issued under Maharashtra Co-operative Societies Act 1960 & Society Bye-Laws Nos. 78 to 84)', width / 2, titleBoxY + 36);
      ctx.restore();

      // ── Subject & Address ────────────────────────────────────────────────
      let curY = titleBoxY + 58;
      ctx.textAlign = 'left';
      ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f2952';
      ctx.fillText("TO: ALL MEMBERS & RESIDENTS OF 'A' BUILDING (SPECIFICALLY FLATS WITH PENDING PARKING DETAILS)", margin + 20, curY);

      curY += 20;
      ctx.fillStyle = '#0f2952';
      ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('SUBJECT: URGENT SUBMISSION & VERIFICATION OF COVERED PARKING PARTICULARS (PENDING SLOT NO.)', margin + 20, curY);

      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(margin + 20, curY + 3, 760, 1.5);

      curY += 24;
      ctx.font = '500 12.5px "Times New Roman", Times, Georgia, serif';
      ctx.fillStyle = '#1e293b';
      ctx.fillText('Dear Members / Residents,', margin + 20, curY);

      curY += 18;
      const intro1 = "1. Notice is hereby given to all members that the Managing Committee is conducting a mandatory parking audit and regularization drive for 'A' Building under the provisions of the Maharashtra Co-operative Societies (MCS) Act and Model Bye-Laws 78-84.";
      const intro2 = `2. As per the physical society records, the undermentioned ${items.length} Flats are recorded with Covered Parking entitlement; however, their physical designated Slot Numbers (Basement / Stilt Slot Identification) are currently PENDING / UNCONFIRMED in the society master roster:`;

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

      [intro1, intro2].forEach(p => {
        const lns = wrap(p, width - (margin * 2) - 40);
        lns.forEach(l => {
          ctx.fillText(l, margin + 20, curY);
          curY += 17;
        });
        curY += 4;
      });

      // ── Two-Column Table of All 30 Flats ─────────────────────────────────
      curY += 8;
      const tableW = width - (margin * 2) - 40;
      const halfW = (tableW - 16) / 2;
      const halfCount = Math.ceil(flatDetailsList.length / 2);
      const col1Flats = flatDetailsList.slice(0, halfCount);
      const col2Flats = flatDetailsList.slice(halfCount);

      const drawSubTable = (startX, list) => {
        const rowH = 24;
        const headH = 26;
        // Table Header
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(startX, curY, halfW, headH);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.strokeRect(startX, curY, halfW, headH);

        ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#0f2952';
        ctx.textAlign = 'center';
        ctx.fillText('Sr.', startX + 18, curY + 17);
        ctx.fillText('Flat No.', startX + 58, curY + 17);
        ctx.textAlign = 'left';
        ctx.fillText('Registered Member / Resident', startX + 96, curY + 17);
        ctx.textAlign = 'right';
        ctx.fillText('Status', startX + halfW - 10, curY + 17);

        let rY = curY + headH;
        list.forEach((item, rIdx) => {
          if (rIdx % 2 === 1) {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(startX, rY, halfW, rowH);
          }
          ctx.strokeStyle = '#e2e8f0';
          ctx.strokeRect(startX, rY, halfW, rowH);

          ctx.textAlign = 'center';
          ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.fillText(String(item.srNo), startX + 18, rY + 16);

          ctx.font = '800 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#0f2952';
          ctx.fillText(item.flat, startX + 58, rY + 16);

          ctx.textAlign = 'left';
          ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#1e293b';
          const truncatedName = item.residentName.length > 28 ? item.residentName.substring(0, 26) + '..' : item.residentName;
          ctx.fillText(truncatedName, startX + 96, rY + 16);

          ctx.textAlign = 'right';
          ctx.font = '700 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#b91c1c';
          ctx.fillText('Slot Pending', startX + halfW - 10, rY + 16);

          rY += rowH;
        });
      };

      drawSubTable(margin + 20, col1Flats);
      drawSubTable(margin + 20 + halfW + 16, col2Flats);

      curY += 26 + (halfCount * 24) + 14;

      // ── Checklist Box ────────────────────────────────────────────────────
      ctx.save();
      ctx.fillStyle = '#fefce8';
      ctx.fillRect(margin + 20, curY, tableW, 68);
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1;
      ctx.strokeRect(margin + 20, curY, tableW, 68);

      ctx.textAlign = 'left';
      ctx.font = '800 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#854d0e';
      ctx.fillText(`MANDATORY DOCUMENTS TO SUBMIT WITHIN 7 DAYS (ON OR BEFORE ${deadlineFormatted}):`, margin + 35, curY + 20);

      ctx.font = '600 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.fillText('1. Copy of Agreement / Builder Allotment Letter confirming Covered Parking entitlement.', margin + 35, curY + 40);
      ctx.fillText('2. Exact Slot Identification Number (Basement / Stilt slot number as per builder documents).', margin + 35, curY + 58);
      ctx.restore();

      curY += 82;

      // ── Submission Modes & Caution ───────────────────────────────────────
      ctx.textAlign = 'left';
      ctx.font = '500 12px "Times New Roman", Times, Georgia, serif';
      ctx.fillStyle = '#1e293b';

      const p4 = `3. Submission Modes: (A) Physical Submission at Society Office (Clubhouse) between 7:00 PM – 9:00 PM (Mon–Sat) to Society Manager. (B) Email scanned PDF to ${SOCIETY_INFO.email} with subject "Parking Verification - Flat <No>".`;
      const p5 = '4. Statutory Notice: In the absence of verifiable builder documents within the deadline, the slot will be treated as unregularized and the Managing Committee reserves the right to review allotment as per MCS Bye-Laws.';

      [p4, p5].forEach(p => {
        const lns = wrap(p, tableW);
        lns.forEach(l => {
          ctx.fillText(l, margin + 20, curY);
          curY += 16;
        });
        curY += 3;
      });

      // ── Sign-off & Purple Rubber Stamp ───────────────────────────────────
      curY += 15;
      ctx.font = '700 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f2952';
      ctx.fillText('By Order of the Managing Committee,', margin + 20, curY);
      ctx.fillText("MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.", margin + 20, curY + 18);

      const signY = curY + 60;
      ctx.font = '600 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText('Hon. Secretary', margin + 40, signY);
      ctx.fillText('Hon. Chairman', margin + 320, signY);
      ctx.fillText('Convenor - Parking Committee', margin + 580, signY);

      // Signature lines
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin + 40, signY - 8);
      ctx.lineTo(margin + 160, signY - 8);
      ctx.moveTo(margin + 320, signY - 8);
      ctx.lineTo(margin + 440, signY - 8);
      ctx.moveTo(margin + 580, signY - 8);
      ctx.lineTo(margin + 740, signY - 8);
      ctx.stroke();

      // Official Purple Circular Rubber Stamp on the right
      const stampX = width - margin - 120;
      const stampY = signY - 15;
      ctx.save();
      ctx.translate(stampX, stampY);
      ctx.rotate(-0.06); // Slight authentic stamp tilt
      ctx.strokeStyle = '#4338ca'; // Realistic violet ink
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 43, 0, Math.PI * 2);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#4338ca';
      ctx.font = '800 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('MAJESTIQUE EURISKA', 0, -22);
      ctx.font = '700 8px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText("'A' BLDG CHS LTD. * PUNE *", 0, -10);

      ctx.font = '800 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#b91c1c';
      ctx.fillText('★ OFFICIAL SEAL ★', 0, 4);

      ctx.font = '700 7px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#4338ca';
      ctx.fillText('REG. NO. 21207/2019-20', 0, 16);
      ctx.fillText('DT. 09-08-2019', 0, 26);
      ctx.restore();

      // Footer note
      ctx.font = 'italic 10px "Times New Roman", Times, Georgia, serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.fillText('Copy forwarded for display on: 1. Building Notice Board, 2. Lift Lobbies, 3. Society Office Records, 4. Official Residents Broadcast.', margin + 20, height - margin - 14);

      // Trigger Download
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `Official_Society_Parking_Notice_${items.length}_Flats.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error generating notice image:', err);
    } finally {
      setTimeout(() => setDownloading(false), 600);
    }
  }, [flatDetailsList, items, noticeRef, todayFormatted, deadlineFormatted]);

  return (
    <div className="general-parking-notice-document-s1">
      {/* ── Toolbar ── */}
      <div className="no-print general-parking-notice-document-s2">
        {/* Left: Navigation Buttons */}
        <div className="general-parking-notice-document-s3">
          {onBackToRegister && (
            <button
              type="button"
              onClick={onBackToRegister}
              className="general-parking-notice-document-s4"
            >
              <span>◀</span>
              <span>All Flats Register</span>
            </button>
          )}

          {onSwitchToIndividual && (
            <button
              type="button"
              onClick={onSwitchToIndividual}
              className="general-parking-notice-document-s5"
            >
              <span>✉️</span>
              <span>Individual Flat Notice Letter</span>
            </button>
          )}

          <div className="general-parking-notice-document-s6">
            <span className="general-parking-notice-document-s7">● OFFICIAL CIRCULAR</span>
            <span>Covering <strong>{items.length} Covered Flats</strong></span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="general-parking-notice-document-s8">
          <button
            type="button"
            onClick={handleCopyText}
            className="general-parking-notice-document-s9"
          >
            {copied ? '✓ Copied Text!' : '📋 Copy Circular Text'}
          </button>

          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="general-parking-notice-document-s10"
          >
            <span>💬</span>
            <span>Broadcast on WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="general-parking-notice-document-s11"
          >
            <span>🖨️</span>
            <span>Print / Save PDF</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="general-parking-notice-document-s12" style={{ cursor: downloading ? 'wait' : 'pointer' }}
          >
            <span>📸</span>
            <span>{downloading ? 'Rendering Image...' : 'Download Notice (PNG)'}</span>
          </button>
        </div>
      </div>

      {/* ── Real Physical Paper Letterhead Document Sheet ── */}
      <div
        id="official-society-general-notice"
        className="general-parking-notice-document-s13"
      >
        {/* Subtle Official Watermark in Document Center */}
        <div className="general-parking-notice-document-s14">
          OFFICIAL NOTICE
        </div>

        {/* ── Official Letterhead ── */}
        <div className="general-parking-notice-document-s15">
          {/* Authentic Crest / Logo */}
          <div className="general-parking-notice-document-s16">
            <img
              src="/euriska_logo.png"
              alt="Majestique Euriska Official Logo"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/logo.png';
              }}
              className="general-parking-notice-document-s17"
            />
          </div>

          {/* Letterhead Identity */}
          <div className="general-parking-notice-document-s18">
            <div className="general-parking-notice-document-s19">
              {SOCIETY_INFO.marathiName}
            </div>
            <h1 className="general-parking-notice-document-s20">
              MAJESTIQUE EURISKA 'A' BUILDING CO-OPERATIVE HOUSING SOCIETY LTD.
            </h1>
            <div className="general-parking-notice-document-s21">
              Regn. No. {SOCIETY_INFO.regNoShort} • Date of Regn: 09/08/2019
            </div>
            <div className="general-parking-notice-document-s22">
              Address: {SOCIETY_INFO.address}
            </div>
            <div className="general-parking-notice-document-s23">
              Email: <u>{SOCIETY_INFO.email}</u> • Wing A (87 Flats)
            </div>
          </div>
        </div>

        {/* Gold Accent Divider */}
        <div className="general-parking-notice-document-s24" />

        {/* ── Reference Number & Date Bar ── */}
        <div className="general-parking-notice-document-s25">
          <div>
            Ref. No.: <span className="general-parking-notice-document-s26">{noticeRef}</span>
          </div>
          <div>
            Date of Issue: <span>{todayFormatted}</span>
          </div>
        </div>

        {/* ── Centered Notice Banner ── */}
        <div className="general-parking-notice-document-s27">
          <div className="general-parking-notice-document-s28">
            CIRCULAR / OFFICIAL NOTICE
          </div>
          <div className="general-parking-notice-document-s29">
            (Issued under Maharashtra Co-operative Societies Act 1960 & Society Bye-Laws Nos. 78 to 84)
          </div>
        </div>

        {/* ── Recipient & Subject Block ── */}
        <div className="general-parking-notice-document-s30">
          <div className="general-parking-notice-document-s31">
            TO: ALL MEMBERS & RESIDENTS OF 'A' BUILDING (HAVING PENDING COVERED PARKING DETAILS)
          </div>
          <div className="general-parking-notice-document-s32">
            SUBJECT: URGENT SUBMISSION & VERIFICATION OF COVERED PARKING PARTICULARS (PENDING SLOT NO.)
            <div className="general-parking-notice-document-s33" />
          </div>
        </div>

        {/* ── Notice Body Content ── */}
        <div className="general-parking-notice-document-s34">
          <div>
            <strong>Dear Members / Residents,</strong>
          </div>

          <p className="general-parking-notice-document-s35">
            1. All members of Majestique Euriska 'A' Building Co-operative Housing Society Ltd. are hereby notified that the Managing Committee is executing a comprehensive parking allocation audit and regularization drive across 'A' Building, in accordance with the <strong>Maharashtra Co-operative Societies (MCS) Act 1960</strong> and <strong>Model Bye-Laws 78 to 84</strong> (Allotment of Parking Spaces).
          </p>

          <p className="general-parking-notice-document-s35">
            2. As per the physical records, agreement registers, and developer handover documentation, the undermentioned <strong>{items.length} Flats</strong> are registered with entitlement for <strong>Covered Parking</strong>; however, their exact designated <strong>Physical Slot Numbers</strong> (Stilt / Basement Slot Identification) are currently <strong>PENDING / UNCONFIRMED</strong> in the society master records:
          </p>

          {/* ── The Roster Table of All Pending Flats ── */}
          <div className="general-parking-notice-document-s36">
            <div className="general-parking-notice-document-s37">
              <span>REGISTER OF FLATS REQUIRING COVERED PARKING SLOT REGULARIZATION</span>
              <span className="general-parking-notice-document-s38">Total: {items.length} Units</span>
            </div>

            <div className="general-parking-notice-document-s39">
              <table className="general-parking-notice-document-s40">
                <thead>
                  <tr className="general-parking-notice-document-s41">
                    <th className="general-parking-notice-document-s42">Sr.</th>
                    <th className="general-parking-notice-document-s43">Flat No.</th>
                    <th className="general-parking-notice-document-s44">Floor</th>
                    <th className="general-parking-notice-document-s45">Registered Owner / Resident</th>
                    <th className="general-parking-notice-document-s46">Entitlement</th>
                    <th className="general-parking-notice-document-s47">Action Required</th>
                  </tr>
                </thead>
                <tbody>
                  {flatDetailsList.map((row, idx) => (
                    <tr
                      key={row.flat}
                      onClick={() => onSelectFlat && onSelectFlat(row.flat)}
                      className="general-parking-notice-document-s48" style={{ background: idx % 2 === 1 ? '#f8fafc' : '#ffffff', cursor: onSelectFlat ? 'pointer' : 'default' }}
                    >
                      <td className="general-parking-notice-document-s49">{row.srNo}</td>
                      <td className="general-parking-notice-document-s50">{row.flat}</td>
                      <td className="general-parking-notice-document-s51">{row.floor}</td>
                      <td className="general-parking-notice-document-s52">{row.residentName}</td>
                      <td className="general-parking-notice-document-s53">{row.parkingType}</td>
                      <td className="general-parking-notice-document-s54">
                        <span className="general-parking-notice-document-s55">
                          Submit Slot Proof
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mandatory Checklist Box ── */}
          <div className="general-parking-notice-document-s56">
            <div className="general-parking-notice-document-s57">
              📋 MANDATORY DOCUMENTARY PROOF TO BE SUBMITTED WITHIN 7 DAYS (ON OR BEFORE {deadlineFormatted}):
            </div>
            <div className="general-parking-notice-document-s58">
              <div><strong>1. Copy of Agreement / Builder Allotment Letter</strong> confirming Covered Parking entitlement.</div>
              <div><strong>2. Exact Slot Identification Number</strong> (Basement / Stilt slot number as per builder documents).</div>
            </div>
          </div>

          <p className="general-parking-notice-document-s35">
            3. <strong>Submission Modes:</strong> Members may submit clear scanned copies via email to <strong className="general-parking-notice-document-s59">{SOCIETY_INFO.email}</strong> with subject line <em>"Parking Regularization - Flat [Flat No.]"</em> or submit physical photocopies at the Society Office (Clubhouse) between 7:00 PM and 9:00 PM (Monday to Saturday) to the Society Manager.
          </p>

          <p className="general-parking-notice-document-s35">
            4. <strong>Statutory Advisory:</strong> Please note that in the absence of verified builder documentation within the stipulated period, the society will be unable to regularize or mark the slot on the official architectural parking site plan. The Managing Committee reserves the right to review allotment as per Society Bye-Laws to ensure orderly and transparent parking.
          </p>
        </div>

        {/* ── Sign-off & Authentic Rubber Stamp Block ── */}
        <div className="general-parking-notice-document-s60">
          {/* Left: Authority & Signatures */}
          <div>
            <div className="general-parking-notice-document-s61">
              By Order of the Managing Committee,
            </div>
            <div className="general-parking-notice-document-s62">
              Majestique Euriska 'A' Building Co-operative Housing Society Ltd.
            </div>

            {/* Signature Titles */}
            <div className="general-parking-notice-document-s63">
              <div>
                <div className="general-parking-notice-document-s64" />
                <div className="general-parking-notice-document-s65">Hon. Secretary</div>
                <div className="general-parking-notice-document-s66">Managing Committee</div>
              </div>

              <div>
                <div className="general-parking-notice-document-s64" />
                <div className="general-parking-notice-document-s65">Hon. Chairman</div>
                <div className="general-parking-notice-document-s66">Managing Committee</div>
              </div>
            </div>
          </div>

          {/* Right: Realistic Circular Violet Rubber Stamp */}
          <div className="general-parking-notice-document-s67">
            <div className="general-parking-notice-document-s68">
              <span className="general-parking-notice-document-s69">MAJESTIQUE EURISKA</span>
              <span className="general-parking-notice-document-s70">'A' BLDG CHS LTD.</span>
              <span className="general-parking-notice-document-s71">★ OFFICIAL SEAL ★</span>
              <span className="general-parking-notice-document-s70">REG. NO. 21207/2019-20</span>
              <span className="general-parking-notice-document-s72">PUNE - 411060</span>
            </div>
          </div>
        </div>

        {/* ── Document Footer Distribution ── */}
        <div className="general-parking-notice-document-s73">
          <div>
            Copy to: 1. Society Notice Board • 2. Lift Lobbies • 3. Residents WhatsApp Broadcast • 4. Office Files
          </div>
          <div className="general-parking-notice-document-s74">
            सोसायटी सूचना फलक व सर्व सभासदांच्या माहितीसाठी
          </div>
        </div>
      </div>
    </div>
  );
}
