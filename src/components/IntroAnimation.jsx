import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import confetti from 'canvas-confetti';

/**
 * Guaranteed Single-Play IntroAnimation (v26: Direct DOM Color & Instant Dismiss)
 */
export default function IntroAnimation({ onFinish }) {
  const overlayRef = useRef(null);
  const leftDoorRef = useRef(null);
  const rightDoorRef = useRef(null);
  const bunnyRef = useRef(null);
  const wavingArmRef = useRef(null);
  const welcomeTextRef = useRef(null);
  const brandTextRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Initial setup
    gsap.set(bunnyRef.current, { x: -250, opacity: 0 });
    gsap.set(wavingArmRef.current, { rotation: 0, transformOrigin: "bottom right" });
    gsap.set([welcomeTextRef.current, brandTextRef.current], { opacity: 0, y: 30 });

    const tl = gsap.timeline({
      onComplete: () => {
        setIsVisible(false);
      }
    });

    // 1. Bunny Walks in
    tl.to(bunnyRef.current, {
      duration: 1,
      x: "15vw",
      opacity: 1,
      ease: "power2.out"
    })
    
    // 2. The Wave
    .to(wavingArmRef.current, {
      duration: 0.3,
      rotation: -30,
      repeat: 2,
      yoyo: true,
      ease: "sine.inOut"
    })

    // 3. The Pushing Reveal
    .to(bunnyRef.current, {
      duration: 0.8,
      x: "45vw",
      ease: "power2.inOut",
      onStart: () => {
        // INSTANTLY RELEASE INTERACTION
        if (overlayRef.current) overlayRef.current.style.pointerEvents = 'none';
        
        // IMMEDIATELY MARK AS SEEN IN PARENT (This prevents re-trigger on tab click)
        if (onFinish) onFinish();
      }
    }, "+=0.1")
    .to(leftDoorRef.current, { duration: 1.2, x: "-100%", ease: "power3.inOut" }, "-=0.5")
    .to(rightDoorRef.current, { duration: 1.2, x: "100%", ease: "power3.inOut" }, "<")
    .to(bunnyRef.current, { duration: 0.4, opacity: 0 }, "-=0.6")

    // 4. Welcome Text Reveal (v26: Forced High-Contrast Colors)
    .to(welcomeTextRef.current, {
      duration: 0.6,
      opacity: 1,
      y: 0,
      ease: "back.out(1.7)",
      onStart: () => {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 }, zIndex: 100100 });
      }
    })
    .to(brandTextRef.current, {
      duration: 0.8,
      opacity: 1,
      y: 0,
      ease: "power2.out"
    }, "-=0.2")
    
    // Final exit
    .to([welcomeTextRef.current, brandTextRef.current], {
      duration: 0.5,
      opacity: 0,
      delay: 1.5 // Snappier delay
    });

    return () => tl.kill();
  }, [onFinish]);

  if (!isVisible) return null;

  return (
    <div ref={overlayRef} style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      overflow: 'hidden',
      pointerEvents: 'auto'
    }}>
      {/* Doors */}
      <div ref={leftDoorRef} style={{
        position: 'absolute', left: 0, top: 0, width: '50.5vw', height: '100%',
        backgroundColor: '#f0f9ff', zIndex: 1, borderRight: '1px solid rgba(0,0,0,0.1)'
      }} />
      <div ref={rightDoorRef} style={{
        position: 'absolute', right: 0, top: 0, width: '50.5vw', height: '100%',
        backgroundColor: '#f0f9ff', zIndex: 1
      }} />

      <div style={{
        position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        
        {/* Bunny */}
        <div ref={bunnyRef} style={{
          position: 'absolute', bottom: '15%', left: '0%', width: '280px',
          zIndex: 20, filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))', opacity: 0
        }}>
          <svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="70" y="20" width="20" height="70" rx="10" fill="white" stroke="#3B82F6" strokeWidth="1.5" />
            <rect x="75" y="30" width="10" height="50" rx="5" fill="#FEE2E2" />
            <rect x="110" y="20" width="20" height="70" rx="10" fill="white" stroke="#3B82F6" strokeWidth="1.5" />
            <rect x="115" y="30" width="10" height="50" rx="5" fill="#FEE2E2" />
            <circle cx="100" cy="100" r="45" fill="white" stroke="#3B82F6" strokeWidth="1.5" />
            <circle cx="85" cy="95" r="3.5" fill="#1E3A8A" />
            <circle cx="115" cy="95" r="3.5" fill="#1E3A8A" />
            <path d="M96 110L104 110L100 115L96 110Z" fill="#F472B6" />
            <path d="M92 120C92 120 96 125 100 125C104 125 108 120 108 120" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" />
            <path d="M65 140C65 130 135 130 135 140V190C135 200 65 200 65 190V140Z" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
            <circle cx="85" cy="165" r="3" fill="white" />
            <circle cx="115" cy="165" r="3" fill="white" />
            <path d="M65 145C65 145 45 155 45 170" stroke="#3B82F6" strokeWidth="12" strokeLinecap="round" />
            <circle cx="45" cy="170" r="7" fill="white" stroke="#3B82F6" strokeWidth="1.5" />
            <g ref={wavingArmRef}>
              <path d="M135 145C135 145 155 135 165 110" stroke="#3B82F6" strokeWidth="12" strokeLinecap="round" />
              <circle cx="165" cy="110" r="10" fill="white" stroke="#3B82F6" strokeWidth="1.5" />
            </g>
          </svg>
        </div>

        <div style={{ textAlign: 'center', zIndex: 100 }}>
          <h1 ref={welcomeTextRef} style={{ 
            fontSize: 'clamp(2rem, 8vw, 4rem)', fontWeight: 900, margin: 0, 
            color: '#9a3412', textTransform: 'uppercase', opacity: 0, // Burnt Orange
            display: 'block'
          }}>
            Welcome to
          </h1>
          <h1 ref={brandTextRef} style={{ 
            fontSize: 'clamp(1.5rem, 6vw, 3.5rem)', fontWeight: 900, margin: 0, 
            color: '#1e1b4b', textTransform: 'uppercase', opacity: 0, // Deep Indigo
            display: 'block'
          }}>
            Majestique Euriska World
          </h1>
        </div>
      </div>
    </div>
  );
}
