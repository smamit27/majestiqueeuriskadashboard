import { useCallback, useEffect, useMemo, useState } from 'react';
import { OFFICIAL_PENDING_PARKING_FLATS, isParkingSlotPending } from '../../data/parkingAllotmentData.js';
import IndividualFlatNoticeCard from './IndividualFlatNoticeCard.jsx';
import GeneralParkingNoticeDocument from './GeneralParkingNoticeDocument.jsx';
import './PendingParkingSlotsCard.css';


/**
 * PendingParkingSlotsCard Component
 * Displays the dynamic 3-column "Flats with Pending Parking Slot Details" card UI
 * driven live by covered parking allotment data, with instant 2x high-resolution PNG image download.
 * Also provides an interactive Flat Notice Generator to select any flat from a dropdown and generate a formal individual notice.
 */
export default function PendingParkingSlotsCard({
  flatsList = null,
  parkingRecords = null,
  onSelectFlat = null,
  showControls = true,
  initialView = 'register',
  initialSelectedFlat = null
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeView, setActiveView] = useState(initialView); // 'register' | 'notice'

  // Dynamically derive pending flats from flatsList or parkingRecords
  const items = useMemo(() => {
    if (Array.isArray(flatsList)) {
      return flatsList;
    }
    if (Array.isArray(parkingRecords)) {
      return parkingRecords.filter(isParkingSlotPending).map(p => p.flat);
    }
    return OFFICIAL_PENDING_PARKING_FLATS;
  }, [flatsList, parkingRecords]);

  // Selected flat for individual notice
  const [selectedNoticeFlat, setSelectedNoticeFlat] = useState(() => {
    return initialSelectedFlat || (items && items[0]) || 'A-101';
  });

  // Keep selectedNoticeFlat valid when items change
  useEffect(() => {
    if (items && items.length > 0 && !items.includes(selectedNoticeFlat)) {
      setSelectedNoticeFlat(items[0]);
    }
  }, [items, selectedNoticeFlat]);

  // Split into 3 columns dynamically
  const columns = useMemo(() => {
    if (!items || items.length === 0) {
      return [
        { startIdx: 1, items: [] },
        { startIdx: 1, items: [] },
        { startIdx: 1, items: [] }
      ];
    }
    const itemsPerCol = Math.ceil(items.length / 3);
    const col1 = items.slice(0, itemsPerCol);
    const col2 = items.slice(itemsPerCol, itemsPerCol * 2);
    const col3 = items.slice(itemsPerCol * 2);
    return [
      { startIdx: 1, items: col1 },
      { startIdx: itemsPerCol + 1, items: col2 },
      { startIdx: (itemsPerCol * 2) + 1, items: col3 },
    ];
  }, [items]);

  // ── High-Res Canvas Drawing & PNG Download ─────────────────────────────────
  const handleDownloadPNG = useCallback(async () => {
    setDownloading(true);
    try {
      // Asynchronously load the official society logo
      const loadLogo = () => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => {
            // Fallback to /logo.png if needed
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

      const maxRows = Math.max(...columns.map(c => c.items.length), 1);
      const rowH = maxRows <= 10 ? 42 : maxRows <= 18 ? 38 : 32;
      const colHeaderH = 48;
      const headerH = 114;
      const tableAreaH = colHeaderH + (maxRows * rowH);
      const cardH = headerH + tableAreaH + 45;
      const height = Math.max(780, cardH + 70);
      const width = 1400;

      // ── Ultra-HD 2x Supersampling (2800px x 1600px+ Retina Quality) ───────
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Maximum image smoothing and subpixel text rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.scale(scale, scale);

      // 1. Background (Glass ambient gradient)
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0c2340');
      bgGrad.addColorStop(0.35, '#1e3a8a');
      bgGrad.addColorStop(0.7, '#2563eb');
      bgGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Add ambient background circles/bokeh
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.arc(150, 100, 200, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(width - 150, height - 100, 250, 0, Math.PI * 2);
      ctx.fill();

      // 2. Rounded Outer Glass Card
      const cardX = 35;
      const cardY = 35;
      const cardW = width - 70;
      const radius = 26;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, radius);
      ctx.clip();

      // Card inner fill (light glass)
      const cardBg = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
      cardBg.addColorStop(0, 'rgba(255, 255, 255, 0.94)');
      cardBg.addColorStop(1, 'rgba(240, 246, 255, 0.96)');
      ctx.fillStyle = cardBg;
      ctx.fillRect(cardX, cardY, cardW, cardH);

      // 3. Card Header Banner (Deep Blue Gradient)
      const headGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
      headGrad.addColorStop(0, '#0f2952');
      headGrad.addColorStop(0.5, '#1e3a8a');
      headGrad.addColorStop(1, '#1e40af');
      ctx.fillStyle = headGrad;
      ctx.fillRect(cardX, cardY, cardW, headerH);

      // Header bottom border
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(cardX, cardY + headerH - 1, cardW, 1);

      const centerY = cardY + (headerH / 2);

      // ── Left Zone: Official Society Logo & Brand Identity ───────────────
      const logoRadius = 38;
      const logoCenterX = cardX + 55;

      if (logoImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoCenterX, centerY, logoRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.stroke();
        ctx.clip();
        ctx.drawImage(
          logoImg,
          logoCenterX - logoRadius,
          centerY - logoRadius,
          logoRadius * 2,
          logoRadius * 2
        );
        ctx.restore();
      }

      // Society Name & Reg subtitle beside logo
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = '800 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('MAJESTIQUE EURISKA', logoCenterX + logoRadius + 14, centerY - 10);
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#93c5fd';
      ctx.fillText("'A' Building CHS Ltd.", logoCenterX + logoRadius + 14, centerY + 12);
      ctx.restore();

      // ── Right Zone: Live Status KPI Pill ─────────────────────────────────
      const badgeW = 205;
      const badgeH = 52;
      const badgeX = cardX + cardW - badgeW - 25;
      const badgeY = centerY - (badgeH / 2);

      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`⚠️ ${items.length} Flats Pending`, badgeX + (badgeW / 2), badgeY + 18);
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#93c5fd';
      ctx.fillText('Covered Parking Scope', badgeX + (badgeW / 2), badgeY + 36);
      ctx.restore();

      // ── Center Zone: Car Icon + Exact Mockup Title + Red Underline ───────
      const titleText = "Flats with Pending Parking Slot Details";
      ctx.save();
      ctx.font = '800 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const titleW = ctx.measureText(titleText).width;
      const carW = 44;
      const centerGap = 14;
      const centerTotalW = carW + centerGap + titleW;
      const startCenterX = cardX + (cardW / 2) - (centerTotalW / 2);
      const iconX = startCenterX + (carW / 2);
      const titleX = startCenterX + carW + centerGap;

      // Draw Car Icon
      ctx.fillStyle = '#ffffff';
      ctx.translate(iconX, centerY - 20);

      // Car silhouette
      ctx.beginPath();
      ctx.roundRect(-24, 6, 48, 22, 6);
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(-16, -6, 32, 14, 4);
      ctx.fill();

      // Windows
      ctx.fillStyle = '#0f2952';
      ctx.fillRect(-13, -3, 11, 8);
      ctx.fillRect(2, -3, 11, 8);

      // Wheels
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(-15, 28, 6, 0, Math.PI * 2);
      ctx.arc(15, 28, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(-15, 28, 2.5, 0, Math.PI * 2);
      ctx.arc(15, 28, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Headlights
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-22, 12, 4, 6);
      ctx.fillRect(18, 12, 4, 6);
      ctx.restore();

      // Header Title text
      ctx.save();
      ctx.font = '800 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(titleText, titleX, centerY - 3);

      // Signature Red Underline Accent under "Flats with"
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(titleX, centerY + 18, 145, 4);
      ctx.restore();

      // 4. Draw the 3 Column Tables
      const tableAreaY = cardY + headerH + 25;
      const colGap = 24;
      const totalColW = cardW - 60;
      const singleColW = (totalColW - (colGap * 2)) / 3;

      if (items.length === 0) {
        ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#065f46';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎉 All Covered Parking Slots are Confirmed!', cardX + (cardW / 2), tableAreaY + 120);
      } else {
        columns.forEach((colData, colIndex) => {
          const colX = cardX + 30 + (colIndex * (singleColW + colGap));

          // Column Box Border & Clip
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(colX, tableAreaY, singleColW, tableAreaH, 12);
          ctx.clip();

          // White background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(colX, tableAreaY, singleColW, tableAreaH);

          // Header Background
          const colHeadGrad = ctx.createLinearGradient(colX, tableAreaY, colX, tableAreaY + colHeaderH);
          colHeadGrad.addColorStop(0, '#e0e7ff');
          colHeadGrad.addColorStop(1, '#dbeafe');
          ctx.fillStyle = colHeadGrad;
          ctx.fillRect(colX, tableAreaY, singleColW, colHeaderH);

          // Header Divider
          const srNoWidth = singleColW * 0.32;
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(colX + srNoWidth, tableAreaY);
          ctx.lineTo(colX + srNoWidth, tableAreaY + tableAreaH);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(colX, tableAreaY + colHeaderH);
          ctx.lineTo(colX + singleColW, tableAreaY + colHeaderH);
          ctx.stroke();

          // Header Text
          ctx.font = '700 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#1e3a8a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Sr. No.', colX + (srNoWidth / 2), tableAreaY + (colHeaderH / 2));

          ctx.font = '800 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#0f2952';
          ctx.fillText('Flat Number', colX + srNoWidth + ((singleColW - srNoWidth) / 2), tableAreaY + (colHeaderH / 2));

          // Rows
          colData.items.forEach((flatNo, rowIndex) => {
            const rowY = tableAreaY + colHeaderH + (rowIndex * rowH);
            const srNo = colData.startIdx + rowIndex;

            // Alternate row fill
            if (rowIndex % 2 === 1) {
              ctx.fillStyle = '#f8fafc';
              ctx.fillRect(colX, rowY, singleColW, rowH);
            }

            // Row Bottom Divider
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(colX, rowY + rowH);
            ctx.lineTo(colX + singleColW, rowY + rowH);
            ctx.stroke();

            // Cell: Sr. No.
            ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#475569';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(srNo), colX + (srNoWidth / 2), rowY + (rowH / 2));

            // Cell: Flat Number (Bold Dark Navy)
            ctx.font = '800 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#0f2952';
            ctx.fillText(flatNo, colX + srNoWidth + ((singleColW - srNoWidth) / 2), rowY + (rowH / 2));
          });

          // Column outer border
          ctx.restore();
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(colX, tableAreaY, singleColW, tableAreaH, 12);
          ctx.stroke();
        });
      }

      // Outer Card Glass Border
      ctx.restore();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, radius);
      ctx.stroke();

      // Trigger Download
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `Flats_with_Pending_Parking_Slot_Details_${items.length}_Flats.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error generating image:', err);
    } finally {
      setTimeout(() => setDownloading(false), 600);
    }
  }, [columns, items]);

  // ── Copy flat list to clipboard ───────────────────────────────────────────
  const handleCopy = useCallback(() => {
    const text = items.join(', ');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [items]);

  return (
    <div className="pending-parking-slots-card-s1">
      {/* ── Toolbar Actions & Mode Switcher ── */}
      {showControls && (
        <div className="pending-parking-slots-card-s2">
          {/* Left: Title & Mode Toggle */}
          <div className="pending-parking-slots-card-s3">
            <div className="pending-parking-slots-card-s4">
              <span className="pending-parking-slots-card-s5">🚗</span>
              <div>
                <div className="pending-parking-slots-card-s6">
                  Pending Parking Slot Details Register
                </div>
                <div className="pending-parking-slots-card-s7">
                  Dynamically tracking <strong>{items.length} Covered Parking Flats</strong> requiring slot confirmation
                </div>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="pending-parking-slots-card-s8">
              <button
                type="button"
                onClick={() => setActiveView('general')}
                className="pending-parking-slots-card-s9" style={{ background: activeView === 'general' ? '#ffffff' : 'transparent', color: activeView === 'general' ? '#0f2952' : '#64748b', boxShadow: activeView === 'general' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}
              >
                <span>📜</span>
                <span>General Notice</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('notice')}
                className="pending-parking-slots-card-s9" style={{ background: activeView === 'notice' ? '#ffffff' : 'transparent', color: activeView === 'notice' ? '#0f2952' : '#64748b', boxShadow: activeView === 'notice' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}
              >
                <span>✉️</span>
                <span>Flat Notice</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('register')}
                className="pending-parking-slots-card-s9" style={{ background: activeView === 'register' ? '#ffffff' : 'transparent', color: activeView === 'register' ? '#0f2952' : '#64748b', boxShadow: activeView === 'register' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}
              >
                <span>📋</span>
                <span>3-Column Register</span>
              </button>
            </div>
          </div>

          {/* Right: Flat Dropdown & Actions */}
          <div className="pending-parking-slots-card-s10">
            {/* Flat Selector Dropdown for Notice Generation */}
            <div className="pending-parking-slots-card-s11">
              <label htmlFor="flat-notice-select-dropdown" className="pending-parking-slots-card-s12">
                Flat:
              </label>
              <select
                id="flat-notice-select-dropdown"
                aria-label="Select flat for notice"
                value={selectedNoticeFlat}
                onChange={(e) => {
                  setSelectedNoticeFlat(e.target.value);
                  setActiveView('notice');
                }}
                className="pending-parking-slots-card-s13"
              >
                {items.map(f => (
                  <option key={f} value={f}>
                    Flat {f}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setActiveView('notice')}
                className="pending-parking-slots-card-s14"
              >
                <span>📄</span>
                <span>Make Notice</span>
              </button>
            </div>

            {activeView === 'register' && (
              <>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={items.length === 0}
                  className="pending-parking-slots-card-s15" style={{ cursor: items.length === 0 ? 'not-allowed' : 'pointer' }}
                >
                  {copied ? '✓ Copied!' : '📋 Copy Flats'}
                </button>

                <a
                  href="/pending_parking_slots_card.svg"
                  download={`Flats_with_Pending_Parking_Slot_Details_${items.length}_Flats.svg`}
                  title="Download vector SVG (infinite zoom without pixelation)"
                  className="pending-parking-slots-card-s16"
                >
                  <span>📐</span>
                  <span>Download Vector SVG</span>
                </a>

                <button
                  type="button"
                  onClick={handleDownloadPNG}
                  disabled={downloading || items.length === 0}
                  className="pending-parking-slots-card-s17" style={{ cursor: downloading ? 'wait' : items.length === 0 ? 'not-allowed' : 'pointer' }}
                >
                  <span>📸</span>
                  <span>{downloading ? 'Rendering Ultra-HD Image...' : 'Download as PNG Image (Ultra-HD)'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Conditional View: General Notice OR Individual Flat Notice OR 3-Column Register Card ── */}
      {activeView === 'general' ? (
        <GeneralParkingNoticeDocument
          flatsList={items}
          parkingRecords={parkingRecords}
          onSelectFlat={(f) => {
            setSelectedNoticeFlat(f);
            setActiveView('notice');
          }}
          onBackToRegister={() => setActiveView('register')}
          onSwitchToIndividual={() => setActiveView('notice')}
        />
      ) : activeView === 'notice' ? (
        <IndividualFlatNoticeCard
          flat={selectedNoticeFlat}
          flatsList={items}
          parkingRecords={parkingRecords}
          onSelectFlat={(f) => setSelectedNoticeFlat(f)}
          onBackToRegister={() => setActiveView('register')}
          onSwitchToGeneral={() => setActiveView('general')}
        />
      ) : (
        /* ── The Exact UI Card Matching Mockup ── */
        <div
          id="pending-parking-slots-ui-card"
          className="pending-parking-slots-card-s18"
        >
        {/* Deep Blue Symmetrical Executive Header Banner */}
        <div className="pending-parking-slots-card-s19">
          {/* ── Left Zone: Society Brand Identity ── */}
          <div className="pending-parking-slots-card-s20">
            {/* Crisp Circular Society Logo Badge */}
            <div className="pending-parking-slots-card-s21">
              <img
                src="/euriska_logo.png"
                alt="Majestique Euriska Logo"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/logo.png';
                }}
                className="pending-parking-slots-card-s22"
              />
            </div>
            <div className="pending-parking-slots-card-s23">
              <span className="pending-parking-slots-card-s24">
                MAJESTIQUE EURISKA
              </span>
              <span className="pending-parking-slots-card-s25">
                'A' Building CHS Ltd.
              </span>
            </div>
          </div>

          {/* ── Center Zone: Car Silhouette + Exact Title + Red Underline ── */}
          <div className="pending-parking-slots-card-s26">
            <div className="pending-parking-slots-card-s27">
              {/* Crisp Car Silhouette Icon */}
              <div className="pending-parking-slots-card-s28">
                <svg width="38" height="38" viewBox="0 0 64 64" fill="none">
                  <rect x="4" y="24" width="56" height="24" rx="8" fill="#FFFFFF" />
                  <path d="M12 24L18 10C19 8 21 6 24 6H40C43 6 45 8 46 10L52 24H12Z" fill="#FFFFFF" />
                  <rect x="18" y="11" width="12" height="10" rx="2" fill="#0F2952" />
                  <rect x="34" y="11" width="12" height="10" rx="2" fill="#0F2952" />
                  <circle cx="16" cy="48" r="8" fill="#1E293B" />
                  <circle cx="48" cy="48" r="8" fill="#1E293B" />
                  <circle cx="16" cy="48" r="3.5" fill="#94A3B8" />
                  <circle cx="48" cy="48" r="3.5" fill="#94A3B8" />
                  <circle cx="9" cy="32" r="3" fill="#FEF08A" />
                  <circle cx="55" cy="32" r="3" fill="#FEF08A" />
                </svg>
              </div>

              {/* Exact Mockup Title */}
              <h3 className="pending-parking-slots-card-s29">
                Flats with Pending Parking Slot Details
              </h3>
            </div>

            {/* Signature Red Underline Accent under "Flats with" */}
            <div className="pending-parking-slots-card-s30" />
          </div>

          {/* ── Right Zone: Live Status KPI Pill ── */}
          <div className="pending-parking-slots-card-s31">
            <div className="pending-parking-slots-card-s32">
              <span className="pending-parking-slots-card-s33">⚠️</span>
              <span>{items.length} Flats Pending</span>
            </div>
            <span className="pending-parking-slots-card-s34">
              Covered Parking Scope
            </span>
          </div>
        </div>

        {/* ── 3 Columns Tables Container ── */}
        {items.length === 0 ? (
          <div className="pending-parking-slots-card-s35">
            <div className="pending-parking-slots-card-s36">🎉</div>
            <div className="pending-parking-slots-card-s37">
              All Covered Parking Slots are Confirmed!
            </div>
            <div className="pending-parking-slots-card-s38">
              There are currently no covered parking flats with pending allocation details in the society records.
            </div>
          </div>
        ) : (
          <div className="pending-parking-slots-card-s39">
            {columns.map((col, colIndex) => (
              <div
                key={`col-${colIndex}`}
                className="pending-parking-slots-card-s40"
              >
                {/* Table Column Header */}
                <div className="pending-parking-slots-card-s41">
                  <div className="pending-parking-slots-card-s42">
                    Sr. No.
                  </div>
                  <div className="pending-parking-slots-card-s43">
                    Flat Number
                  </div>
                </div>

                {/* Table Rows */}
                <div>
                  {col.items.map((flat, rowIndex) => {
                    const srNo = col.startIdx + rowIndex;
                    const isEven = rowIndex % 2 === 1;

                    return (
                      <div
                        key={flat}
                        onClick={() => onSelectFlat && onSelectFlat(flat)}
                        className="pending-parking-slots-card-s44" style={{ borderBottom: rowIndex < col.items.length - 1 ? '1px solid #e2e8f0' : 'none', background: isEven ? '#f8fafc' : '#ffffff', cursor: onSelectFlat ? 'pointer' : 'default' }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#eff6ff';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = isEven ? '#f8fafc' : '#ffffff';
                        }}
                      >
                        {/* Sr. No. */}
                        <div className="pending-parking-slots-card-s45">
                          {srNo}
                        </div>

                        {/* Flat Number + Notice Action */}
                        <div className="pending-parking-slots-card-s46">
                          <span className="pending-parking-slots-card-s47">
                            {flat}
                          </span>
                          <button
                            type="button"
                            title={`Make individual notice for Flat ${flat}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNoticeFlat(flat);
                              setActiveView('notice');
                            }}
                            className="pending-parking-slots-card-s48"
                          >
                            <span>📄</span>
                            <span>Notice</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Subtle Bottom Society Tagline */}
        <div className="pending-parking-slots-card-s49">
          <span>Majestique Euriska 'A' Building Co-Op Housing Society Ltd.</span>
          <span>Dynamic Covered Parking Register • {items.length} Pending Units</span>
        </div>
      </div>
      )}
    </div>
  );
}
