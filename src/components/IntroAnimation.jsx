import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import confetti from 'canvas-confetti';

/**
 * High-Fidelity Easter Bunny IntroAnimation with Animated Text Reveal
 */
export default function IntroAnimation({ onFinish }) {
  const containerRef = useRef(null);
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
    gsap.set([welcomeTextRef.current, brandTextRef.current], { opacity: 0, y: 50, scale: 0.5, filter: 'blur(10px)' });
    gsap.set([leftDoorRef.current, rightDoorRef.current], { x: 0 });

    const tl = gsap.timeline({
      onComplete: () => {
        setTimeout(() => {
          setIsVisible(false);
          if (onFinish) onFinish();
        }, 800);
      }
    });

    // 1. Bunny Walks in
    tl.to(bunnyRef.current, {
      duration: 1.2,
      x: "15vw",
      opacity: 1,
      ease: "power2.out",
      onStart: () => {
        gsap.to(bunnyRef.current, { y: "-=15", duration: 0.25, repeat: 5, yoyo: true });
      }
    })
    
    // 2. The Waving Hand Animation
    .to(wavingArmRef.current, {
      duration: 0.3,
      rotation: -35,
      repeat: 7,
      yoyo: true,
      ease: "sine.inOut"
    })

    // 3. The Pushing Reveal
    .to(bunnyRef.current, {
      duration: 1,
      x: "45vw",
      scale: 1.1,
      ease: "power2.inOut"
    }, "+=0.2")
    .to(leftDoorRef.current, {
      duration: 1.5,
      x: "-100%",
      ease: "power4.inOut"
    }, "-=0.5")
    .to(rightDoorRef.current, {
      duration: 1.5,
      x: "100%",
      ease: "power4.inOut"
    }, "<")

    .to(bunnyRef.current, {
      duration: 0.8,
      opacity: 0,
      scale: 0.5,
      ease: "power2.in"
    }, "-=1")

    // 4. ANIMATED WELCOME TEXT REVEAL
    .to(welcomeTextRef.current, {
      duration: 0.8,
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      ease: "back.out(1.7)",
      onStart: () => {
        // Massive multi-corner boom!
        const duration = 4 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100100 };
        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function() {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) return clearInterval(interval);
          const particleCount = 50 * (timeLeft / duration);
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
      }
    }, "-=0.8")
    .to(brandTextRef.current, {
      duration: 1,
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      ease: "elastic.out(1, 0.5)"
    }, "-=0.4")
    
    // Float animation while visible
    .to([welcomeTextRef.current, brandTextRef.current], {
      y: "-=10",
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    })

    // Final exit
    .to([welcomeTextRef.current, brandTextRef.current], {
      duration: 0.8,
      opacity: 0,
      scale: 1.5,
      delay: 3
    });

    return () => tl.kill();
  }, [onFinish]);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      overflow: 'hidden'
    }}>
      <div ref={leftDoorRef} style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '50.5vw',
        height: '100%',
        backgroundColor: '#f0f9ff',
        zIndex: 1,
        borderRight: '1px solid rgba(0,0,0,0.05)'
      }} />
      <div ref={rightDoorRef} style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: '50.5vw',
        height: '100%',
        backgroundColor: '#f0f9ff',
        zIndex: 1
      }} />

      <div ref={containerRef} style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        
        {/* High-Fidelity SVG Bunny */}
        <div ref={bunnyRef} style={{
          position: 'absolute',
          bottom: '15%',
          left: '0%',
          width: '280px',
          zIndex: 20,
          filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.1))'
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
            fontSize: 'clamp(2.5rem, 8vw, 5rem)', 
            fontWeight: 900, 
            margin: 0, 
            color: '#fbbf24', // Gold to match website
            textTransform: 'uppercase',
            letterSpacing: '4px',
            textShadow: '0 10px 40px rgba(0,0,0,0.5)'
          }}>
            Welcome to
          </h1>
          <h1 ref={brandTextRef} style={{ 
            fontSize: 'clamp(2rem, 6vw, 4.5rem)', 
            fontWeight: 900, 
            margin: 0, 
            color: '#ffffff', // White to match website
            textTransform: 'uppercase',
            letterSpacing: '2px',
            textShadow: '0 10px 40px rgba(0,0,0,0.5)'
          }}>
            Majestique Euriska World
          </h1>
        </div>
      </div>
    </div>
  );
}
