import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('./firebase.js', () => ({
  auth: { currentUser: null },
  db: null,
  isFirebaseConfigured: false,
  googleProvider: {},
  signInWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signOut: vi.fn(),
  signInWithPopup: vi.fn(),
  ensureFirebaseSession: vi.fn().mockResolvedValue(null)
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, cb) => {
    cb(null);
    return vi.fn();
  }),
  signInAnonymously: vi.fn().mockResolvedValue({ user: null })
}));

vi.mock('./hooks/useCollection.js', () => ({
  useCollection: vi.fn(() => ({
    items: [],
    loading: false,
    error: null
  }))
}));

describe('App Component - Non-admin accessibility', () => {
  beforeEach(() => {
    localStorage.setItem('majestique_intro_seen_v30', 'true');
    window.history.pushState({}, 'Test', '/');
  });

  it('renders Emergency and Water Tank Management in sidebar for non-admin users', () => {
    render(<App />);

    const emergencyTab = screen.getByRole('tab', { name: /Emergency/i });
    const waterTankTab = screen.getByRole('tab', { name: /Water Tank Management/i });

    expect(emergencyTab).toBeInTheDocument();
    expect(waterTankTab).toBeInTheDocument();
  });

  it('allows non-admin user to switch to Water Tank Management tab and stay there', async () => {
    render(<App />);

    const waterTankTab = screen.getByRole('tab', { name: /Water Tank Management/i });
    fireEvent.click(waterTankTab);

    // Wait for transition delay (180ms in handleTabChange)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Water Tank Management/i })).toBeInTheDocument();
    }, { timeout: 1000 });

    // Ensure it does not reset back to emergency
    expect(screen.getByText('5,39,400 L')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3D Diagram & Spatial Model/i })).toBeInTheDocument();
  });

  it('loads Water Tank Management directly when tab query param is set', async () => {
    window.history.pushState({}, 'Test', '/?tab=water_tanks');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Water Tank Management/i })).toBeInTheDocument();
    });
  });
});
