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

  it('renders only Visualization Work and Society Rules in sidebar for non-login users', () => {
    render(<App />);

    const visualizationTab = screen.getByRole('tab', { name: /Visualization Work/i });
    const rulesTab = screen.getByRole('tab', { name: /Society Rules/i });

    expect(visualizationTab).toBeInTheDocument();
    expect(rulesTab).toBeInTheDocument();
    // Private tabs hidden from unauthenticated guests
    expect(screen.queryByRole('tab', { name: /Water Tank Management/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Emergency/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Society Overview/i })).not.toBeInTheDocument();
  });

  it('loads Society Rules by default for non-admin visitors and displays bylaws and circulars', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Society Rules, Bylaws & Community Guidelines/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Applicable to A, B & C Buildings/i)).toBeInTheDocument();
  });

  it('allows non-admin user to switch to Visualization Work tab and view visuals and rules banner', async () => {
    render(<App />);

    const visualizationTab = screen.getByRole('tab', { name: /Visualization Work/i });
    fireEvent.click(visualizationTab);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search plans, rules & visuals/i)).toBeInTheDocument();
    }, { timeout: 1000 });

    expect(screen.getByText(/Water Flow Diagram/i)).toBeInTheDocument();
  });

  it('displays login required screen when unauthenticated visitor navigates to private Water Tank tab', async () => {
    window.history.pushState({}, 'Test', '/?tab=water_tanks');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Admin Login \/ Sign In Required/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/Only/i)).toHaveTextContent(/Visualization Work/i);
    expect(screen.getByText(/Only/i)).toHaveTextContent(/Society Rules/i);
  });

  it('loads Water Tank Management when admin=true parameter is provided', async () => {
    window.history.pushState({}, 'Test', '/?tab=water_tanks&admin=true');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Water Tank Management/i })).toBeInTheDocument();
    });
  });
});
