import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import './IntroAnimation.css';


export default function IntroAnimation({ onFinish }) {
  const overlayRef = useRef(null);
  const leftDoorRef = useRef(null);
  const rightDoorRef = useRef(null);
  const bunnyRef = useRef(null);
  const armRef = useRef(null);
  const welcomeRef = useRef(null);
  const brandRef = useRef(null);
  const doneRef = useRef(false);           // prevent double-finish
  const [visible, setVisible] = useState(true);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    setVisible(false);
    if (onFinish) onFinish();
  }

  useEffect(() => {
    // ── Hard safety: page ALWAYS loads within 12 s ──────────
    const safety = setTimeout(finish, 12000);

    // ── Initial state ────────────────────────────────────────
    gsap.set(bunnyRef.current, { x: -300, opacity: 0 });
    gsap.set(armRef.current, { rotation: 0, transformOrigin: '50% 100%' });
    gsap.set(welcomeRef.current, { opacity: 0, y: 30 });
    gsap.set(brandRef.current, { opacity: 0, y: 30 });

    const tl = gsap.timeline({ onComplete: () => { clearTimeout(safety); finish(); } });

    // 1. Bunny walks in
    tl.to(bunnyRef.current, { x: 100, opacity: 1, duration: 1.2, ease: 'power2.out' });

    // 2. Wave arm
    tl.to(armRef.current, { rotation: -40, duration: 0.35 })
      .to(armRef.current, { rotation: 5, duration: 0.35 })
      .to(armRef.current, { rotation: -40, duration: 0.35 })
      .to(armRef.current, { rotation: 0, duration: 0.35 });

    // 3. Open doors – release pointer-events so dashboard is usable immediately
    tl.add(() => { if (overlayRef.current) overlayRef.current.style.pointerEvents = 'none'; })
      .to(leftDoorRef.current, { xPercent: -100, duration: 1.3, ease: 'power3.inOut' })
      .to(rightDoorRef.current, { xPercent: 100, duration: 1.3, ease: 'power3.inOut' }, '<')
      .to(bunnyRef.current, { x: 500, opacity: 0, duration: 0.8, ease: 'power2.in' }, '<');

    // 4. Welcome text
    tl.to(welcomeRef.current, {
      opacity: 1, y: 0, duration: 0.7, ease: 'back.out(1.7)',
      onStart: () => confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, zIndex: 999999 })
    })
      .to(brandRef.current, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, '-=0.3');

    // 5. Hold 3 s then fade and finish
    tl.to([welcomeRef.current, brandRef.current], { opacity: 0, duration: 0.6 }, '+=3');

    return () => { clearTimeout(safety); tl.kill(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      data-testid="intro-overlay"
      className="intro-animation-s1"
    >
      {/* Doors */}
      <div ref={leftDoorRef} className="intro-animation-s2" />
      <div ref={rightDoorRef} className="intro-animation-s3" />

      {/* Bunny */}
      <div
        ref={bunnyRef}
        className="intro-animation-s4"
      >
        <svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Ears */}
          <rect x="68" y="8" width="22" height="78" rx="11" fill="#fff" stroke="#60a5fa" strokeWidth="2" />
          <rect x="73" y="16" width="12" height="58" rx="6" fill="#fecdd3" />
          <rect x="110" y="8" width="22" height="78" rx="11" fill="#fff" stroke="#60a5fa" strokeWidth="2" />
          <rect x="115" y="16" width="12" height="58" rx="6" fill="#fecdd3" />
          {/* Head */}
          <circle cx="100" cy="103" r="47" fill="#fff" stroke="#60a5fa" strokeWidth="2" />
          {/* Eyes */}
          <circle cx="83" cy="97" r="4.5" fill="#1e3a8a" />
          <circle cx="117" cy="97" r="4.5" fill="#1e3a8a" />
          <circle cx="85" cy="95" r="1.5" fill="#fff" />
          <circle cx="119" cy="95" r="1.5" fill="#fff" />
          {/* Nose + mouth */}
          <ellipse cx="100" cy="113" rx="4" ry="3" fill="#f9a8d4" />
          <path d="M94 118 Q100 125 106 118" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* Body */}
          <path d="M60 150 C60 135 140 135 140 150 L140 200 C140 214 60 214 60 200 Z"
            fill="#dbeafe" stroke="#60a5fa" strokeWidth="2" />
          <circle cx="100" cy="164" r="3.5" fill="#93c5fd" />
          <circle cx="100" cy="179" r="3.5" fill="#93c5fd" />
          {/* Left arm (static) */}
          <path d="M60 154 C48 162 44 174 46 183" stroke="#60a5fa" strokeWidth="12" strokeLinecap="round" />
          <circle cx="44" cy="184" r="9" fill="#fff" stroke="#60a5fa" strokeWidth="2" />
          {/* Right arm (waving) */}
          <g ref={armRef}>
            <path d="M140 154 C152 144 162 130 163 117" stroke="#60a5fa" strokeWidth="12" strokeLinecap="round" />
            <circle cx="164" cy="113" r="9" fill="#fff" stroke="#60a5fa" strokeWidth="2" />
          </g>
          {/* Feet */}
          <ellipse cx="82" cy="215" rx="17" ry="8" fill="#bfdbfe" />
          <ellipse cx="118" cy="215" rx="17" ry="8" fill="#bfdbfe" />
        </svg>
      </div>

      {/* Welcome text – centred over the doors */}
      <div className="intro-animation-s5">
        <h1 ref={welcomeRef} className="intro-animation-s6">
          Welcome to
        </h1>
        <h2 ref={brandRef} className="intro-animation-s7">
          Majestique Euriska
        </h2>
      </div>
    </div>
  );
}
