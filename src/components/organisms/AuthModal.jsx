import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut,
  signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import './AuthModal.css';


const ADMIN_EMAILS = ['majestiqueeuriska.a@gmail.com', 'smamit27@gmail.com'];

export default function AuthModal({ isOpen, onClose, user }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const userEmail = cred.user?.email;
      if (!userEmail || !ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
        await signOut(auth);
        setError('Unauthorized: Only the official admin emails can edit.');
        return;
      }
      onClose();
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect password. Please try again or use Google Login.');
      } else if (err.code === 'auth/user-not-found') {
        setError('Account not found. Please create it in Firebase Console first.');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email. Please use Google Login.');
      } else {
        setError('Login failed. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const userEmail = cred.user?.email;
      if (!userEmail || !ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
        await signOut(auth);
        setError('Unauthorized: Only majestiqueeuriska.a@gmail.com or smamit27@gmail.com is allowed.');
        return;
      }
      onClose();
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('This email is already registered with a password. Please use your password to login.');
      } else {
        setError('Google Sign-In failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset link sent to your email.');
      setTimeout(() => setIsResetMode(false), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to send reset link. Check your email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="modal-overlay auth-modal-s1"
      data-testid="auth-modal">
      <div className="section-card auth-modal-s2">
        <button 
          onClick={onClose}
          className="auth-modal-s3"
        >
          &times;
        </button>

        {user ? (
          <div className="auth-modal-s4">
            <div className="auth-modal-s5">👤</div>
            <h3>Administrator Session</h3>
            <p className="auth-modal-s6">Logged in as {user.email}</p>
            <button className="button-primary auth-modal-s7" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <div>
            <h2 className="auth-modal-s8">{isResetMode ? 'Reset Password' : 'Admin Login'}</h2>
            <p className="auth-modal-s9">
              {isResetMode ? 'Enter your email to receive a reset link.' : 'Enter your credentials to enable edit mode.'}
            </p>

            <form onSubmit={isResetMode ? handleReset : handleLogin} className="auth-modal-s10">
              <div className="field-group">
                <label htmlFor="admin-email" className="eyebrow auth-modal-s11">Email Address</label>
                <input 
                  id="admin-email"
                  type="email" 
                  className="attendance-register-input auth-modal-s12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </div>

              {!isResetMode && (
                <div className="field-group">
                  <label htmlFor="admin-password" className="eyebrow auth-modal-s11">Password</label>
                  <input 
                    id="admin-password"
                    type="password" 
                    className="attendance-register-input auth-modal-s12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}

              {error && <p className="auth-modal-s13">{error}</p>}
              {message && <p className="auth-modal-s14">{message}</p>}

              <button className="button-primary auth-modal-s15" type="submit" disabled={loading}>
                {loading ? 'Processing...' : isResetMode ? 'Send Reset Link' : 'Login'}
              </button>

              {!isResetMode && (
                <>
                  <div className="auth-modal-s16">
                    <div className="auth-modal-s17" />
                    <span className="auth-modal-s18">OR</span>
                    <div className="auth-modal-s17" />
                  </div>

                  <button 
                    type="button" 
                    className="button-secondary auth-modal-s19" 
                    onClick={handleGoogleLogin} 
                    disabled={loading}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M24 12.27c0-.85-.07-1.68-.21-2.48H12v4.69h6.73c-.29 1.57-1.18 2.9-2.52 3.79v3.15h4.08c2.39-2.2 3.77-5.44 3.77-9.15z"/><path fill="#4285F4" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-4.08-3.15c-1.13.76-2.57 1.21-3.87 1.21-2.97 0-5.49-2.01-6.39-4.7H1.54v3.25C3.51 21.64 7.47 24 12 24z"/><path fill="#FBBC05" d="M5.61 14.45c-.24-.71-.37-1.46-.37-2.24s.13-1.53.37-2.24V6.72H1.54C.56 8.68 0 10.28 0 12.21s.56 3.53 1.54 5.49l4.07-3.25z"/><path fill="#34A853" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.96 1.08 15.24 0 12 0 7.47 0 3.51 2.36 1.54 6.72l4.07 3.25c.9-2.69 3.42-4.7 6.39-4.7z"/></svg>
                    <span>Sign in with Google</span>
                  </button>
                </>
              )}

              <button 
                type="button"
                className="button-secondary auth-modal-s20" 
                onClick={() => setIsResetMode(!isResetMode)}
              >
                {isResetMode ? 'Back to Login' : 'Forgot Password?'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
