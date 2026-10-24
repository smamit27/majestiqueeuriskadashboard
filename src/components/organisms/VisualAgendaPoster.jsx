import React, { useRef, useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Megaphone, 
  Printer, 
  Download, 
  Palette, 
  Check, 
  Share2, 
  Sparkles, 
  Flame, 
  Waves, 
  Droplet, 
  FileText, 
  Database, 
  Gift, 
  ClipboardList, 
  ShieldCheck, 
  Landmark,
  Layers,
  Wrench,
  Bot
} from 'lucide-react';
import html2canvas from 'html2canvas';

/**
 * Maps agenda item title/category to a thematic Lucide icon
 */
export function getAgendaIcon(title = '', category = '') {
  const text = `${title} ${category}`.toLowerCase();
  if (text.includes('statue') || text.includes('beautification') || text.includes('shivaji') || text.includes('garden')) {
    return Landmark;
  }
  if (text.includes('fire') || text.includes('safety') || text.includes('hydrant') || text.includes('extinguisher')) {
    return Flame;
  }
  if (text.includes('pool') || text.includes('swimming') || text.includes('filter')) {
    return Waves;
  }
  if (text.includes('water') || text.includes('conservation') || text.includes('tanker') || text.includes('supply')) {
    return Droplet;
  }
  if (text.includes('account') || text.includes('conveyance') || text.includes('audit') || text.includes('handover') || text.includes('deed')) {
    return FileText;
  }
  if (text.includes('tank') || text.includes('cleaning') || text.includes('reservoir')) {
    return Database;
  }
  if (text.includes('diwali') || text.includes('bonus') || text.includes('staff') || text.includes('festival')) {
    return Gift;
  }
  if (text.includes('rule') || text.includes('activity') || text.includes('guideline') || text.includes('permission')) {
    return ClipboardList;
  }
  if (text.includes('fencing') || text.includes('security') || text.includes('gate') || text.includes('pragati') || text.includes('boundary')) {
    return ShieldCheck;
  }
  if (text.includes('lift') || text.includes('dg') || text.includes('pump') || text.includes('repair')) {
    return Wrench;
  }
  return Layers;
}

/**
 * Standard Sample Agenda Items matching user's reference image
 */
export const DEFAULT_AGENDA_ITEMS = [
  {
    id: 1,
    title: 'Beautification of Existing Area',
    description: 'Discuss the proposed installation of a statue of Chhatrapati Shivaji Maharaj within the society premises.'
  },
  {
    id: 2,
    title: 'Fire Safety System',
    description: 'Finalise the decision and discuss the vendor, if required.'
  },
  {
    id: 3,
    title: 'Swimming Pool Filter System',
    description: 'Review the issue of three rusted bolts that remain stuck despite WD-40 treatment. Discuss the feasibility of repair versus replacement, with an estimated cost of ₹40,000 – ₹45,000, subject to technical assessment and committee approval.'
  },
  {
    id: 4,
    title: 'Water Conservation and Management',
    description: 'Discuss measures to address drought conditions and the anticipated 20% reduction in water supply, including immediate water-saving initiatives.'
  },
  {
    id: 5,
    title: 'A Building Accounts Takeover and Conveyance Deed',
    description: 'Finalise the tentative date for the accounts handover and discuss the next steps towards the conveyance deed.'
  },
  {
    id: 6,
    title: 'Water Tank Cleaning',
    description: 'Finalise the cleaning schedule for overhead and underground water tanks in coordination with the security team.'
  },
  {
    id: 7,
    title: 'Diwali Bonus',
    description: 'Discuss and finalise the Diwali bonus for society staff.'
  },
  {
    id: 8,
    title: 'Society Activity Rules',
    description: "Establish clear guidelines for organising society activities, including the manager's authority to approve and coordinate routine activities without requiring prior committee approval for every instance."
  },
  {
    id: 9,
    title: 'Fencing Near Pragati',
    description: 'Discuss the proposed fencing location, safety requirements, estimated cost, and implementation plan.'
  }
];

export default function VisualAgendaPoster({
  agendaData = null,
  meetingDate = 'Sunday, 25 October 2026',
  meetingTime = '11:00 AM',
  meetingType = 'Management Committee Meeting',
  scope = 'COMMON', // 'COMMON' | 'A_BUILDING'
  onBack
}) {
  const [colorMode, setColorMode] = useState('colorful'); // 'colorful' | 'monochrome'
  const [isExporting, setIsExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState(null);
  const posterRef = useRef(null);

  // Normalize agenda items from props or default
  const items = useMemo(() => {
    if (agendaData && Array.isArray(agendaData) && agendaData.length > 0) {
      return agendaData.map((item, idx) => ({
        id: item.itemNo || item.id || idx + 1,
        title: item.title || item.subject || `Agenda Item ${idx + 1}`,
        description: item.description || item.discussion || item.decision || ''
      }));
    }
    return DEFAULT_AGENDA_ITEMS;
  }, [agendaData]);

  const isColor = colorMode === 'colorful';

  // Palette definitions
  const theme = {
    bg: '#ffffff',
    textMain: isColor ? '#0e1f3d' : '#000000',
    textMuted: isColor ? '#334155' : '#222222',
    accentColor: isColor ? '#d90429' : '#000000',
    accentBg: isColor ? '#d90429' : '#000000',
    numberCircleBg: isColor ? '#d90429' : '#000000',
    numberCircleText: '#ffffff',
    pipeColor: isColor ? '#d90429' : '#000000',
    badgeBg: isColor ? '#d90429' : '#000000',
    badgeText: '#ffffff',
    cardBorder: isColor ? '#e2e8f0' : '#cccccc',
    dividerColor: isColor ? '#eef2f6' : '#e0e0e0',
    footerBg: isColor ? '#fef2f2' : '#ffffff',
    footerBorder: isColor ? '#fca5a5' : '#000000',
    footerText: isColor ? '#991b1b' : '#000000',
    footerIconColor: isColor ? '#dc2626' : '#000000',
    imageFilter: isColor ? 'none' : 'grayscale(100%) contrast(120%)'
  };

  // Export handlers
  const handleExportImage = async (format = 'png') => {
    if (!posterRef.current || isExporting) return;
    setIsExporting(true);
    setExportFeedback(`Generating high-res ${format.toUpperCase()}...`);

    try {
      const canvas = await html2canvas(posterRef.current, {
        scale: 2.5, // 2.5x retina quality for ultra crisp printing
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const mimeType = format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : 'image/png';
      const dataUrl = canvas.toDataURL(mimeType, 0.95);
      const link = document.createElement('a');
      const filename = `Majestique_Euriska_Meeting_Agenda_${colorMode}_${new Date().toISOString().split('T')[0]}.${format}`;
      link.download = filename;
      link.href = dataUrl;
      link.click();

      setExportFeedback(`✅ Downloaded ${filename}!`);
      setTimeout(() => setExportFeedback(null), 3500);
    } catch (err) {
      console.error(`Error exporting ${format}:`, err);
      alert(`Could not generate ${format}. Please try printing as PDF.`);
      setExportFeedback(null);
    } finally {
      setIsExporting(false);
    }
  };

  // High quality PDF / Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="visual-agenda-container" style={{ width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* ── Top Floating Action Control Bar (Hidden during Print) ── */}
      <div 
        className="no-print" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px', 
          padding: '14px 18px', 
          background: '#ffffff', 
          borderRadius: '14px', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)', 
          marginBottom: '20px' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 800, color: '#0b2b26' }}>
            <Sparkles size={16} color="#d90429" />
            Executive Visual Agenda Flyer
          </div>

          {/* Color Mode Switcher */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <button
              type="button"
              data-testid="color-mode-colorful-btn"
              onClick={() => setColorMode('colorful')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: isColor ? '#ffffff' : 'transparent',
                color: isColor ? '#d90429' : '#64748b',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: isColor ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Palette size={13} />
              🌈 Colorful
            </button>
            <button
              type="button"
              data-testid="color-mode-bw-btn"
              onClick={() => setColorMode('monochrome')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: !isColor ? '#000000' : 'transparent',
                color: !isColor ? '#ffffff' : '#64748b',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: !isColor ? '0 2px 4px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              ⬛ Black & White
            </button>
          </div>
        </div>

        {/* Action Export Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {exportFeedback && (
            <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
              {exportFeedback}
            </span>
          )}

          <button
            type="button"
            data-testid="export-png-btn"
            disabled={isExporting}
            onClick={() => handleExportImage('png')}
            className="button-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', padding: '7px 12px' }}
          >
            <Download size={14} />
            Download PNG
          </button>

          <button
            type="button"
            data-testid="export-jpeg-btn"
            disabled={isExporting}
            onClick={() => handleExportImage('jpeg')}
            className="button-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', padding: '7px 12px' }}
          >
            <Download size={14} />
            Download JPEG
          </button>

          <button
            type="button"
            data-testid="export-pdf-btn"
            onClick={handlePrint}
            className="button-primary"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.82rem', 
              padding: '7px 14px',
              background: isColor ? '#d90429' : '#000000',
              borderColor: isColor ? '#d90429' : '#000000'
            }}
          >
            <Printer size={14} />
            Print / PDF
          </button>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="button-secondary"
              style={{ fontSize: '0.8rem', padding: '7px 12px' }}
            >
              Back to Minutes
            </button>
          )}
        </div>
      </div>

      {/* ── THE POSTER CANVAS (PRINTABLE / EXPORTABLE CONTAINER) ── */}
      <div 
        ref={posterRef}
        id="agenda-poster-canvas"
        style={{
          background: theme.bg,
          width: '100%',
          boxSizing: 'border-box',
          padding: '28px 34px',
          borderRadius: '16px',
          border: `1.5px solid ${theme.cardBorder}`,
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}
      >
        {/* ── TOP HEADER: Logo & Majestic Entrance Gate Photo ── */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'stretch', 
            borderRadius: '14px', 
            overflow: 'hidden', 
            border: `1px solid ${theme.cardBorder}`,
            marginBottom: '20px',
            background: '#ffffff',
            minHeight: '135px'
          }}
        >
          {/* Left: Logo container with swooping decorative curve */}
          <div 
            style={{ 
              width: '26%', 
              minWidth: '190px',
              padding: '16px 20px', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center',
              background: '#ffffff',
              position: 'relative'
            }}
          >
            <img 
              src="/euriska_logo.png" 
              alt="Majestique Euriska Logo" 
              style={{ 
                maxHeight: '90px', 
                maxWidth: '100%', 
                objectFit: 'contain',
                filter: theme.imageFilter 
              }} 
            />
            {/* Swooping curved separator in Colorful mode */}
            {isColor && (
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  right: '-1px',
                  bottom: 0,
                  width: '4px',
                  background: 'linear-gradient(180deg, #d90429 0%, #e63946 100%)',
                  borderRadius: '2px'
                }}
              />
            )}
          </div>

          {/* Right: Photograph of Majestique Euriska Entrance Gate */}
          <div 
            style={{ 
              flex: 1, 
              position: 'relative',
              overflow: 'hidden',
              background: '#f8fafc'
            }}
          >
            <img 
              src="/visuals/majestique_euriska_gate.jpg" 
              alt="Majestique Euriska Entrance Gate" 
              style={{ 
                width: '100%', 
                height: '100%', 
                minHeight: '135px',
                maxHeight: '180px',
                objectFit: 'cover',
                display: 'block',
                filter: theme.imageFilter
              }} 
            />
          </div>
        </div>

        {/* ── HEADER TITLE BAR: Meeting Type, AGENDA badge, Date & Time ── */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '12px',
            paddingBottom: '14px',
            borderBottom: `2px solid ${theme.dividerColor}`,
            marginBottom: '18px'
          }}
        >
          {/* Left: Title + Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <h1 
              style={{ 
                margin: 0, 
                fontSize: '1.75rem', 
                fontWeight: 900, 
                color: theme.textMain, 
                letterSpacing: '-0.02em' 
              }}
            >
              {meetingType}
            </h1>
            <span 
              style={{ 
                background: theme.badgeBg, 
                color: theme.badgeText, 
                fontSize: '0.92rem', 
                fontWeight: 900, 
                padding: '4px 18px', 
                borderRadius: '20px', 
                letterSpacing: '3px',
                textTransform: 'uppercase',
                display: 'inline-block'
              }}
            >
              AGENDA
            </span>
          </div>

          {/* Right: Date & Time in clean boxed tags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={22} color={theme.accentColor} strokeWidth={2.2} />
              <div style={{ lineHeight: 1.2 }}>
                <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Date:</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: theme.textMain }}>{meetingDate}</span>
              </div>
            </div>

            <div style={{ height: '24px', width: '1px', background: theme.dividerColor }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={22} color={theme.accentColor} strokeWidth={2.2} />
              <div style={{ lineHeight: 1.2 }}>
                <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Time:</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: theme.textMain }}>{meetingTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── NUMBERED AGENDA ITEMS ROWS ── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map((item, index) => {
            const IconComponent = getAgendaIcon(item.title);
            const isLast = index === items.length - 1;

            return (
              <div 
                key={item.id || index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  padding: '12px 0',
                  borderBottom: isLast ? 'none' : `1px solid ${theme.dividerColor}`
                }}
              >
                {/* 1. Red Numbered Circle */}
                <div 
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: theme.numberCircleBg,
                    color: theme.numberCircleText,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}
                >
                  {index + 1}
                </div>

                {/* 2. Thematic Icon */}
                <div 
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: isColor ? '#0f172a' : '#000000',
                    marginTop: '1px'
                  }}
                >
                  <IconComponent size={22} strokeWidth={1.8} />
                </div>

                {/* 3. Vertical Accent Pipe */}
                <div 
                  style={{
                    width: '2px',
                    minHeight: '28px',
                    background: theme.pipeColor,
                    flexShrink: 0,
                    marginTop: '4px',
                    borderRadius: '1px'
                  }}
                />

                {/* 4. Title & Description Body */}
                <div style={{ flex: 1, paddingLeft: '4px' }}>
                  <h3 
                    style={{ 
                      margin: '0 0 3px 0', 
                      fontSize: '0.96rem', 
                      fontWeight: 800, 
                      color: theme.textMain,
                      letterSpacing: '-0.01em'
                    }}
                  >
                    {item.title}
                  </h3>
                  {item.description && (
                    <p 
                      style={{ 
                        margin: 0, 
                        fontSize: '0.84rem', 
                        lineHeight: '1.45', 
                        color: theme.textMuted 
                      }}
                    >
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── BOTTOM CALLOUT BANNER: Quorum & Participation Directive ── */}
        <div 
          style={{
            marginTop: '20px',
            padding: '12px 18px',
            borderRadius: '12px',
            background: theme.footerBg,
            border: `1.5px solid ${theme.footerBorder}`,
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          {/* Megaphone icon */}
          <div style={{ flexShrink: 0 }}>
            <Megaphone size={26} color={theme.footerIconColor} strokeWidth={2.2} />
          </div>

          {/* Pipe */}
          <div style={{ width: '2px', height: '36px', background: theme.pipeColor, flexShrink: 0 }} />

          {/* Text */}
          <div style={{ fontSize: '0.82rem', lineHeight: '1.4', color: theme.footerText }}>
            <div>
              <strong style={{ fontSize: '0.86rem', color: isColor ? '#b91c1c' : '#000000' }}>
                Important: A minimum of 3 members from each committee must attend the meeting.
              </strong>
            </div>
            <div style={{ color: isColor ? '#4b5563' : '#333333', marginTop: '2px' }}>
              All committee members are requested to participate and contribute to the discussions and collective decision-making.
            </div>
          </div>
        </div>

        {/* Micro legal watermark */}
        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.68rem', color: '#94a3b8' }}>
          Majestique Euriska Co-operative Housing Society Ltd. • Official Management Committee Meeting Notice
        </div>
      </div>
    </div>
  );
}
