import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mock firebase/auth (what AuthModal actually imports from) ────
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockSendReset = vi.fn();
const mockGoogleSignIn = vi.fn();

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args) => mockSignIn(...args),
  sendPasswordResetEmail: (...args) => mockSendReset(...args),
  signOut: (...args) => mockSignOut(...args),
  signInWithPopup: (...args) => mockGoogleSignIn(...args),
}));

// ── Mock ../firebase (auth instance + googleProvider) ────────────
vi.mock('../../firebase', () => ({
  auth: { currentUser: null },
  googleProvider: {},
}));

import AuthModal from './AuthModal';

// ── Helpers ────────────────────────────────────────────────────
const baseProps = { isOpen: true, onClose: vi.fn(), user: null };

function setup(props = {}) {
  const merged = { ...baseProps, onClose: vi.fn(), ...props };
  const user = userEvent.setup();
  render(<AuthModal {...merged} />);
  return { user, onClose: merged.onClose };
}

// ── Tests ──────────────────────────────────────────────────────
describe('AuthModal – rendering', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when isOpen is false', () => {
    const { container } = render(<AuthModal isOpen={false} onClose={vi.fn()} user={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the Admin Login heading when no user is logged in', () => {
    setup();
    expect(screen.getByRole('heading', { name: /admin login/i })).toBeInTheDocument();
  });

  it('renders email and password inputs', () => {
    setup();
    expect(screen.getByPlaceholderText(/admin@example\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/)).toBeInTheDocument();
  });

  it('renders the Login submit button', () => {
    setup();
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
  });

  it('renders the Sign in with Google button', () => {
    setup();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('renders the Forgot Password toggle button', () => {
    setup();
    expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument();
  });

  it('calls onClose when the × close button is clicked', async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole('button', { name: /×/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('AuthModal – logged-in view', () => {
  beforeEach(() => vi.clearAllMocks());
  const fakeUser = { email: 'admin@example.com' };

  it('shows the administrator session heading when user prop is set', () => {
    setup({ user: fakeUser });
    expect(screen.getByRole('heading', { name: /administrator session/i })).toBeInTheDocument();
  });

  it('shows the user email', () => {
    setup({ user: fakeUser });
    expect(screen.getByText(/admin@example\.com/)).toBeInTheDocument();
  });

  it('renders a Logout button', () => {
    setup({ user: fakeUser });
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('calls signOut and onClose when Logout is clicked', async () => {
    mockSignOut.mockResolvedValue();
    const { user, onClose } = setup({ user: fakeUser });
    await user.click(screen.getByRole('button', { name: /logout/i }));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

describe('AuthModal – Reset Password mode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('switches to Reset Password heading after clicking Forgot Password', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /forgot password/i }));
    expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
  });

  it('hides the password input in reset mode', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /forgot password/i }));
    expect(screen.queryByPlaceholderText(/••••••••/)).not.toBeInTheDocument();
  });

  it('shows Send Reset Link button in reset mode', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /forgot password/i }));
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('shows a success message after a successful reset request', async () => {
    mockSendReset.mockResolvedValue();
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /forgot password/i }));
    await user.type(screen.getByPlaceholderText(/admin@example\.com/i), 'test@test.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    await waitFor(() =>
      expect(screen.getByText(/password reset link sent/i)).toBeInTheDocument()
    );
  });

  it('shows an error message when reset fails', async () => {
    mockSendReset.mockRejectedValue(new Error('fail'));
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /forgot password/i }));
    await user.type(screen.getByPlaceholderText(/admin@example\.com/i), 'test@test.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    await waitFor(() =>
      expect(screen.getByText(/failed to send reset link/i)).toBeInTheDocument()
    );
  });
});

describe('AuthModal – Email/Password login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows "Processing…" on the submit button while loading', async () => {
    // Keep the promise pending to observe the loading state
    mockSignIn.mockReturnValue(new Promise(() => {}));
    const { user } = setup();
    await user.type(screen.getByPlaceholderText(/admin@example\.com/i), 'a@b.com');
    await user.type(screen.getByPlaceholderText(/••••••••/), 'secret');
    await user.click(screen.getByRole('button', { name: /^login$/i }));
    expect(await screen.findByText(/processing/i)).toBeInTheDocument();
  });

  it('shows an error for wrong-password error code', async () => {
    const err = Object.assign(new Error(), { code: 'auth/wrong-password' });
    mockSignIn.mockRejectedValue(err);
    const { user } = setup();
    await user.type(screen.getByPlaceholderText(/admin@example\.com/i), 'a@b.com');
    await user.type(screen.getByPlaceholderText(/••••••••/), 'wrong');
    await user.click(screen.getByRole('button', { name: /^login$/i }));
    await waitFor(() =>
      expect(screen.getByText(/incorrect password/i)).toBeInTheDocument()
    );
  });

  it('calls onClose after successful authorised login', async () => {
    mockSignIn.mockResolvedValue({
      user: { email: 'majestiqueeuriska.a@gmail.com' },
    });
    const { user, onClose } = setup();
    await user.type(screen.getByPlaceholderText(/admin@example\.com/i), 'majestiqueeuriska.a@gmail.com');
    await user.type(screen.getByPlaceholderText(/••••••••/), 'correctpass');
    await user.click(screen.getByRole('button', { name: /^login$/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('blocks login for an unauthorised email and shows an error', async () => {
    mockSignOut.mockResolvedValue();
    mockSignIn.mockResolvedValue({ user: { email: 'notadmin@gmail.com' } });
    const { user, onClose } = setup();
    await user.type(screen.getByPlaceholderText(/admin@example\.com/i), 'notadmin@gmail.com');
    await user.type(screen.getByPlaceholderText(/••••••••/), 'pass');
    await user.click(screen.getByRole('button', { name: /^login$/i }));
    await waitFor(() =>
      expect(screen.getByText(/unauthorized/i)).toBeInTheDocument()
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});

