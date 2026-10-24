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
import './VisualAgendaPoster.css';


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
  const isCommon = scope === 'COMMON';

  const footerHeadline = isCommon
    ? 'Important: A minimum of 3 members from each committee must attend the meeting.'
    : "Important: All Wing 'A' Committee members are requested to attend the meeting.";

  const footerSubtext = isCommon
    ? 'All committee members are requested to participate and contribute to the discussions and collective decision-making.'
    : "All Wing 'A' committee members are requested to participate and contribute to the discussions and collective decision-making.";

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
    <div className="visual-agenda-container visual-agenda-poster-s1">
      
      {/* ── Top Floating Action Control Bar (Hidden during Print) ── */}
      <div 
        className="no-print visual-agenda-poster-s2"
      >
        <div className="visual-agenda-poster-s3">
          <div className="visual-agenda-poster-s4">
            <Sparkles size={16} color="#d90429" />
            Executive Visual Agenda Flyer
          </div>

          {/* Color Mode Switcher */}
          <div className="visual-agenda-poster-s5">
            <button
              type="button"
              data-testid="color-mode-colorful-btn"
              onClick={() => setColorMode('colorful')}
              className="visual-agenda-poster-s6" style={{ background: isColor ? '#ffffff' : 'transparent', color: isColor ? '#d90429' : '#64748b', boxShadow: isColor ? '0 2px 4px rgba(0,0,0,0.08)' : 'none' }}
            >
              <Palette size={13} />
              🌈 Colorful
            </button>
            <button
              type="button"
              data-testid="color-mode-bw-btn"
              onClick={() => setColorMode('monochrome')}
              className="visual-agenda-poster-s6" style={{ background: !isColor ? '#000000' : 'transparent', color: !isColor ? '#ffffff' : '#64748b', boxShadow: !isColor ? '0 2px 4px rgba(0,0,0,0.15)' : 'none' }}
            >
              ⬛ Black & White
            </button>
          </div>
        </div>

        {/* Action Export Buttons */}
        <div className="visual-agenda-poster-s7">
          {exportFeedback && (
            <span className="visual-agenda-poster-s8">
              {exportFeedback}
            </span>
          )}

          <button
            type="button"
            data-testid="export-png-btn"
            disabled={isExporting}
            onClick={() => handleExportImage('png')}
            className="button-secondary visual-agenda-poster-s9"
          >
            <Download size={14} />
            Download PNG
          </button>

          <button
            type="button"
            data-testid="export-jpeg-btn"
            disabled={isExporting}
            onClick={() => handleExportImage('jpeg')}
            className="button-secondary visual-agenda-poster-s9"
          >
            <Download size={14} />
            Download JPEG
          </button>

          <button
            type="button"
            data-testid="export-pdf-btn"
            onClick={handlePrint}
            className="button-primary visual-agenda-poster-s10"
            style={{ background: isColor ? '#d90429' : '#000000', borderColor: isColor ? '#d90429' : '#000000' }}
          >
            <Printer size={14} />
            Print / PDF
          </button>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="button-secondary visual-agenda-poster-s11"
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
        className="visual-agenda-poster-s12" style={{ background: theme.bg, border: `1.5px solid ${theme.cardBorder}` }}
      >
        {/* ── TOP HEADER: Logo & Majestic Entrance Gate Photo ── */}
        <div 
          className="visual-agenda-poster-s13" style={{ border: `1px solid ${theme.cardBorder}` }}
        >
          {/* Left: Logo container with swooping decorative curve */}
          <div 
            className="visual-agenda-poster-s14"
          >
            <img 
              src="/euriska_logo.png" 
              alt="Majestique Euriska Logo" 
              className="visual-agenda-poster-s15" style={{ filter: theme.imageFilter }} 
            />
            {/* Swooping curved separator in Colorful mode */}
            {isColor && (
              <div 
                className="visual-agenda-poster-s16"
              />
            )}
          </div>

          {/* Right: Photograph of Majestique Euriska Entrance Gate */}
          <div 
            className="visual-agenda-poster-s17"
          >
            <img 
              src="/visuals/majestique_euriska_gate.jpg" 
              alt="Majestique Euriska Entrance Gate" 
              className="visual-agenda-poster-s18" style={{ filter: theme.imageFilter }} 
            />
          </div>
        </div>

        {/* ── HEADER TITLE BAR: Meeting Type, AGENDA badge, Date & Time ── */}
        <div 
          className="visual-agenda-poster-s19" style={{ borderBottom: `2px solid ${theme.dividerColor}` }}
        >
          {/* Left: Title + Pill */}
          <div className="visual-agenda-poster-s20">
            <h1 
              className="visual-agenda-poster-s21" style={{ color: theme.textMain }}
            >
              {meetingType}
            </h1>
            <span 
              className="visual-agenda-poster-s22" style={{ background: theme.badgeBg, color: theme.badgeText }}
            >
              AGENDA
            </span>
          </div>

          {/* Right: Date & Time in clean boxed tags */}
          <div className="visual-agenda-poster-s23">
            <div className="visual-agenda-poster-s24">
              <Calendar size={22} color={theme.accentColor} strokeWidth={2.2} />
              <div className="visual-agenda-poster-s25">
                <span className="visual-agenda-poster-s26">Date:</span>
                <span className="visual-agenda-poster-s27" style={{ color: theme.textMain }}>{meetingDate}</span>
              </div>
            </div>

            <div className="visual-agenda-poster-s28" style={{ background: theme.dividerColor }}></div>

            <div className="visual-agenda-poster-s24">
              <Clock size={22} color={theme.accentColor} strokeWidth={2.2} />
              <div className="visual-agenda-poster-s25">
                <span className="visual-agenda-poster-s26">Time:</span>
                <span className="visual-agenda-poster-s27" style={{ color: theme.textMain }}>{meetingTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── NUMBERED AGENDA ITEMS ROWS ── */}
        <div className="visual-agenda-poster-s29">
          {items.map((item, index) => {
            const IconComponent = getAgendaIcon(item.title);
            const isLast = index === items.length - 1;

            return (
              <div 
                key={item.id || index}
                className="visual-agenda-poster-s30" style={{ borderBottom: isLast ? 'none' : `1px solid ${theme.dividerColor}` }}
              >
                {/* 1. Red Numbered Circle */}
                <div 
                  className="visual-agenda-poster-s31" style={{ background: theme.numberCircleBg, color: theme.numberCircleText }}
                >
                  {index + 1}
                </div>

                {/* 2. Thematic Icon */}
                <div 
                  className="visual-agenda-poster-s32" style={{ color: isColor ? '#0f172a' : '#000000' }}
                >
                  <IconComponent size={22} strokeWidth={1.8} />
                </div>

                {/* 3. Vertical Accent Pipe */}
                <div 
                  className="visual-agenda-poster-s33" style={{ background: theme.pipeColor }}
                />

                {/* 4. Title & Description Body */}
                <div className="visual-agenda-poster-s34">
                  <h3 
                    className="visual-agenda-poster-s35" style={{ color: theme.textMain }}
                  >
                    {item.title}
                  </h3>
                  {item.description && (
                    <p 
                      className="visual-agenda-poster-s36" style={{ color: theme.textMuted }}
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
          className="visual-agenda-poster-s37" style={{ background: theme.footerBg, border: `1.5px solid ${theme.footerBorder}` }}
        >
          {/* Megaphone icon */}
          <div className="visual-agenda-poster-s38">
            <Megaphone size={26} color={theme.footerIconColor} strokeWidth={2.2} />
          </div>

          {/* Pipe */}
          <div className="visual-agenda-poster-s39" style={{ background: theme.pipeColor }} />

          {/* Text */}
          <div className="visual-agenda-poster-s40" style={{ color: theme.footerText }}>
            <div>
              <strong className="visual-agenda-poster-s41" style={{ color: isColor ? '#b91c1c' : '#000000' }}>
                {footerHeadline}
              </strong>
            </div>
            <div className="visual-agenda-poster-s42" style={{ color: isColor ? '#4b5563' : '#333333' }}>
              {footerSubtext}
            </div>
          </div>
        </div>

        {/* Micro legal watermark */}
        <div className="visual-agenda-poster-s43">
          Majestique Euriska Co-operative Housing Society Ltd. • Official Management Committee Meeting Notice
        </div>
      </div>
    </div>
  );
}
