import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import IntroAnimation from './IntroAnimation';

// ── Stub GSAP ────────────────────────────────────────────────────
// We keep onComplete in a ref so each test can trigger it manually,
// which lets us assert BEFORE the overlay is removed.
let capturedOnComplete = null;

const tlStub = {
  to: vi.fn().mockReturnThis(),
  add: vi.fn().mockReturnThis(),
  kill: vi.fn(),
};

vi.mock('gsap', () => ({
  default: {
    timeline: vi.fn((opts = {}) => {
      capturedOnComplete = opts.onComplete ?? null;
      return tlStub;
    }),
    set: vi.fn(),
    to: vi.fn(),
  },
}));

// ── Stub canvas-confetti ─────────────────────────────────────────
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

// ── Helpers ──────────────────────────────────────────────────────
function renderIntro(onFinish = vi.fn()) {
  return { ...render(<IntroAnimation onFinish={onFinish} />), onFinish };
}

describe('IntroAnimation – overlay present (before animation ends)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    capturedOnComplete = null;
    vi.clearAllMocks();
    tlStub.to.mockReturnThis();
    tlStub.add.mockReturnThis();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('renders the overlay with data-testid="intro-overlay"', () => {
    renderIntro();
    expect(screen.getByTestId('intro-overlay')).toBeInTheDocument();
  });

  it('renders "Welcome to" heading text', () => {
    renderIntro();
    expect(screen.getByRole('heading', { name: /welcome to/i })).toBeInTheDocument();
  });

  it('renders "Majestique Euriska World" brand heading', () => {
    renderIntro();
    expect(screen.getByRole('heading', { name: /majestique euriska world/i })).toBeInTheDocument();
  });

  it('registers a 12-second safety timeout on mount', () => {
    const spy = vi.spyOn(global, 'setTimeout');
    renderIntro();
    const hasSafety = spy.mock.calls.some(([, ms]) => ms === 12000);
    expect(hasSafety).toBe(true);
  });

  it('does NOT call onFinish before the timeline completes', () => {
    const { onFinish } = renderIntro();
    expect(onFinish).not.toHaveBeenCalled();
  });
});

describe('IntroAnimation – after animation finishes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    capturedOnComplete = null;
    vi.clearAllMocks();
    tlStub.to.mockReturnThis();
    tlStub.add.mockReturnThis();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('calls onFinish exactly once when timeline onComplete fires', () => {
    const { onFinish } = renderIntro();
    act(() => capturedOnComplete?.());
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('does not call onFinish twice if triggered again (doneRef guard)', () => {
    const { onFinish } = renderIntro();
    act(() => capturedOnComplete?.());
    act(() => capturedOnComplete?.());
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('removes the overlay from the DOM after finish', () => {
    renderIntro();
    act(() => capturedOnComplete?.());
    expect(screen.queryByTestId('intro-overlay')).not.toBeInTheDocument();
  });

  it('calls onFinish via the 12-second safety timeout', () => {
    const { onFinish } = renderIntro();
    act(() => vi.advanceTimersByTime(12000));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('kills the GSAP timeline on unmount', () => {
    const { unmount } = render(<IntroAnimation onFinish={vi.fn()} />);
    unmount();
    expect(tlStub.kill).toHaveBeenCalled();
  });
});

