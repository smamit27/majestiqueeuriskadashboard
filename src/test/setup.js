import '@testing-library/jest-dom';

// ── Suppress GSAP / canvas-confetti console noise in tests ──
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// canvas-confetti tries to use HTMLCanvasElement – stub it
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => ({
    clearRect: () => {},
    fillRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
  }),
  writable: true,
});

// GSAP uses requestAnimationFrame – ensure it's defined in jsdom
if (!global.requestAnimationFrame) {
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}
