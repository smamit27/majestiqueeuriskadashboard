import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut,
  signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const ADMIN_EMAIL = 'majestiqueeuriska.a@gmail.com';

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
      if (cred.user.email.toLowerCase() !== ADMIN_EMAIL) {
        await signOut(auth);
        setError('Unauthorized: Only the official admin email can edit.');
        return;
      }
      onClose();
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/wrong-password') {
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
      if (cred.user.email.toLowerCase() !== ADMIN_EMAIL) {
        await signOut(auth);
        setError('Unauthorized: Only majestiqueeuriska.a@gmail.com is allowed.');
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
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(8px)'
    }}>
      <div className="section-card" style={{ 
        width: 'min(90vw, 400px)', 
        padding: '32px',
        position: 'relative',
        background: 'white',
        borderRadius: '24px'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            border: 'none',
            background: 'rgba(0,0,0,0.05)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--muted)'
          }}
        >
          &times;
        </button>

        {user ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>👤</div>
            <h3>Administrator Session</h3>
            <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>Logged in as {user.email}</p>
            <button className="button-primary" onClick={handleLogout} style={{ width: '100%' }}>
              Logout
            </button>
          </div>
        ) : (
          <div>
            <h2 style={{ marginBottom: '8px' }}>{isResetMode ? 'Reset Password' : 'Admin Login'}</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
              {isResetMode ? 'Enter your email to receive a reset link.' : 'Enter your credentials to enable edit mode.'}
            </p>

            <form onSubmit={isResetMode ? handleReset : handleLogin} style={{ display: 'grid', gap: '16px' }}>
              <div className="field-group">
                <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Email Address</label>
                <input 
                  type="email" 
                  className="attendance-register-input" 
                  style={{ textAlign: 'left' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </div>

              {!isResetMode && (
                <div className="field-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Password</label>
                  <input 
                    type="password" 
                    className="attendance-register-input" 
                    style={{ textAlign: 'left' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}

              {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>{error}</p>}
              {message && <p style={{ color: '#10b981', fontSize: '0.85rem', margin: 0 }}>{message}</p>}

              <button className="button-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '12px' }}>
                {loading ? 'Processing...' : isResetMode ? 'Send Reset Link' : 'Login'}
              </button>

              {!isResetMode && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.1)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.1)' }} />
                  </div>

                  <button 
                    type="button" 
                    className="button-secondary" 
                    onClick={handleGoogleLogin} 
                    disabled={loading}
                    style={{ 
                      width: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '12px',
                      padding: '12px',
                      backgroundColor: 'white',
                      border: '1px solid rgba(0,0,0,0.1)',
                      color: '#475569',
                      fontWeight: 600,
                      borderRadius: '8px'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M24 12.27c0-.85-.07-1.68-.21-2.48H12v4.69h6.73c-.29 1.57-1.18 2.9-2.52 3.79v3.15h4.08c2.39-2.2 3.77-5.44 3.77-9.15z"/><path fill="#4285F4" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-4.08-3.15c-1.13.76-2.57 1.21-3.87 1.21-2.97 0-5.49-2.01-6.39-4.7H1.54v3.25C3.51 21.64 7.47 24 12 24z"/><path fill="#FBBC05" d="M5.61 14.45c-.24-.71-.37-1.46-.37-2.24s.13-1.53.37-2.24V6.72H1.54C.56 8.68 0 10.28 0 12.21s.56 3.53 1.54 5.49l4.07-3.25z"/><path fill="#34A853" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.96 1.08 15.24 0 12 0 7.47 0 3.51 2.36 1.54 6.72l4.07 3.25c.9-2.69 3.42-4.7 6.39-4.7z"/></svg>
                    <span>Sign in with Google</span>
                  </button>
                </>
              )}

              <button 
                type="button"
                className="button-secondary" 
                onClick={() => setIsResetMode(!isResetMode)}
                style={{ width: '100%', fontSize: '0.8rem', border: 'none', background: 'none' }}
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
