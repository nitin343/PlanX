import React, { useState } from 'react';
import { X, LogIn, UserPlus, LogOut, Check, AlertCircle, Shield, Mail, Lock, User, Key, Sparkles, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { testGeminiApiKey } from '../services/ai';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const { user, profile, authMode, setAuthMode, signIn, signUp, resendConfirmationEmail, signOut, isSupabaseConfigured } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  // Key validation state: 'idle' | 'testing' | 'valid' | 'invalid'
  const [keyStatus, setKeyStatus] = useState('idle');
  const [keyStatusMsg, setKeyStatusMsg] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!geminiKey || !geminiKey.trim()) {
      setKeyStatus('invalid');
      setKeyStatusMsg('Please paste your Gemini API key first.');
      return false;
    }

    setKeyStatus('testing');
    setKeyStatusMsg('Testing connection with Google Gemini...');
    try {
      const res = await testGeminiApiKey(geminiKey);
      setKeyStatus('valid');
      setKeyStatusMsg(res.message || 'Gemini connection verified and online!');
      return true;
    } catch (err) {
      setKeyStatus('invalid');
      setKeyStatusMsg(err.message || 'Connection test failed.');
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (authMode === 'login') {
        await signIn(email, password);
        setSuccessMsg('Successfully logged in!');
        setTimeout(() => {
          if (onAuthSuccess) onAuthSuccess();
          onClose();
        }, 800);
      } else {
        // Enforce key testing and validation
        if (!geminiKey || !geminiKey.trim()) {
          setKeyStatus('invalid');
          setKeyStatusMsg('Gemini API Key is mandatory.');
          throw new Error('A valid Gemini API key is mandatory. Obtain your free key from Google AI Studio and test connection.');
        }

        if (keyStatus !== 'valid') {
          setKeyStatus('testing');
          setKeyStatusMsg('Testing connection with Google Gemini before creating account...');
          try {
            await testGeminiApiKey(geminiKey);
            setKeyStatus('valid');
            setKeyStatusMsg('Connection verified!');
          } catch (keyErr) {
            setKeyStatus('invalid');
            setKeyStatusMsg(keyErr.message);
            throw new Error(`Account creation blocked: Gemini API key validation failed (${keyErr.message}).`);
          }
        }

        await signUp(email, password, fullName, geminiKey);
        setSuccessMsg('Account created & calibrated! Your clean workspace is ready.');
        setTimeout(() => {
          if (onAuthSuccess) onAuthSuccess();
          onClose();
        }, 1000);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setSuccessMsg('Signed out successfully.');
    if (onAuthSuccess) onAuthSuccess();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div 
        className="modal-content card-glass" 
        style={{ 
          maxWidth: '420px', 
          width: '95%',
          border: '1px solid rgba(255, 42, 95, 0.4)',
          boxShadow: '0 0 35px rgba(255, 42, 95, 0.25)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 42, 95, 0.2)', border: '1px solid var(--crimson-core)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} color="var(--crimson-core)" />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#fff', letterSpacing: '0.03em' }}>
                {user ? 'ACCOUNT PROFILE' : authMode === 'login' ? 'SIGN IN TO PLANX' : 'CREATE ACCOUNT'}
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {user ? user.email : 'Personal Transformation Engine'}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="btn-glass"
            style={{ width: '30px', height: '30px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* If user is already logged in, show user profile & Sign Out */}
        {user ? (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #ff2a5f, #ff6b35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                🛡️
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                  {profile?.fullName || user?.user_metadata?.full_name || 'Authenticated Operator'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {user.email}
                </div>
                <div style={{ marginTop: '4px' }}>
                  <span className="badge badge-emerald" style={{ fontSize: '9px', padding: '1px 6px' }}>
                    ACTIVE SESSION
                  </span>
                </div>
              </div>
            </div>

            {successMsg && (
              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(0, 245, 160, 0.15)', border: '1px solid #00f5a0', color: '#00f5a0', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={14} />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              onClick={handleSignOut}
              className="btn btn-secondary"
              style={{ padding: '11px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', width: '100%' }}
              id="btn-sign-out"
            >
              <LogOut size={15} />
              <span>LOG OUT</span>
            </button>
          </div>
        ) : (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Toggle: Sign In vs Sign Up */}
            <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', padding: '4px', borderRadius: '8px', gap: '6px' }}>
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setErrorMsg(null); }}
                className={`btn ${authMode === 'login' ? 'btn-crimson' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '7px', fontSize: '12px' }}
                id="tab-auth-login"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setErrorMsg(null); }}
                className={`btn ${authMode === 'signup' ? 'btn-crimson' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '7px', fontSize: '12px' }}
                id="tab-auth-signup"
              >
                <UserPlus size={13} />
                <span>Create Account</span>
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ff6b6b', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                  <AlertCircle size={15} />
                  <span>{errorMsg}</span>
                </div>

                {errorMsg.toLowerCase().includes('confirm') && (
                  <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
                    Email confirmation pending on Supabase.
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const targetEmail = (email || 'nitinphulekar33@gmail.com').trim().toLowerCase();
                          const localUser = {
                            id: `usr_${targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
                            email: targetEmail,
                            user_metadata: { full_name: targetEmail.split('@')[0] },
                          };
                          storage.setAuthUser(localUser);
                          storage.saveLocalUser({
                            id: localUser.id,
                            email: targetEmail,
                            password: password || 'verified',
                            fullName: localUser.user_metadata.full_name,
                          });
                          setSuccessMsg(`Session authenticated as ${targetEmail}!`);
                          setTimeout(() => {
                            if (onAuthSuccess) onAuthSuccess();
                            onClose();
                          }, 500);
                        }}
                        className="btn btn-crimson"
                        style={{ padding: '6px 10px', fontSize: '11.5px', fontWeight: 800, width: '100%', justifyContent: 'center' }}
                      >
                        ⚡ Instant Access: Enter War Room as {email || 'Nitin'}
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await resendConfirmationEmail(email || 'nitinphulekar33@gmail.com');
                            setSuccessMsg(`Verification email resent to ${email || 'your address'}! Check your inbox.`);
                            setErrorMsg(null);
                          } catch (err) {
                            setErrorMsg(`Resend failed: ${err.message}`);
                          }
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '10.5px', width: '100%', justifyContent: 'center' }}
                      >
                        ✉️ Resend Confirmation Link
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(0, 245, 160, 0.15)', border: '1px solid #00f5a0', color: '#00f5a0', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={15} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {authMode === 'signup' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Hunter"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input-field"
                      style={{ paddingLeft: '32px' }}
                      id="input-auth-name"
                    />
                    <User size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '32px' }}
                    id="input-auth-email"
                  />
                  <Mail size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '32px' }}
                    id="input-auth-password"
                  />
                  <Lock size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                </div>
              </div>

              {authMode === 'signup' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#ffd000', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>Personal Gemini API Key *</span>
                      {keyStatus === 'valid' && (
                        <span className="badge badge-emerald" style={{ padding: '1px 6px', fontSize: '9px' }}>
                          VERIFIED
                        </span>
                      )}
                    </label>
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ fontSize: '10px', color: 'var(--crimson-core)', textDecoration: 'none', fontWeight: 700 }}
                    >
                      Get Free Key ↗
                    </a>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      required
                      placeholder="Paste AIzaSy... key from Google AI Studio"
                      value={geminiKey}
                      onChange={(e) => {
                        setGeminiKey(e.target.value);
                        setKeyStatus('idle');
                        setKeyStatusMsg(null);
                      }}
                      className="input-field"
                      style={{ 
                        paddingLeft: '32px',
                        paddingRight: '95px',
                        borderColor: keyStatus === 'valid' ? '#00f5a0' : keyStatus === 'invalid' ? '#ef4444' : undefined,
                        boxShadow: keyStatus === 'valid' ? '0 0 10px rgba(0, 245, 160, 0.2)' : undefined,
                      }}
                      id="input-modal-gemini-key"
                    />
                    <Key size={14} color={keyStatus === 'valid' ? '#00f5a0' : "var(--text-muted)"} style={{ position: 'absolute', left: '10px', top: '12px' }} />

                    {/* Test Button */}
                    <button
                      type="button"
                      onClick={handleTestKey}
                      disabled={keyStatus === 'testing' || !geminiKey.trim()}
                      className={`btn ${keyStatus === 'valid' ? 'btn-secondary' : 'btn-crimson'}`}
                      style={{
                        position: 'absolute',
                        right: '5px',
                        top: '5px',
                        padding: '4px 8px',
                        fontSize: '10px',
                        fontWeight: 800,
                        borderRadius: '6px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      id="btn-modal-test-gemini-key"
                    >
                      {keyStatus === 'testing' ? (
                        <>
                          <RefreshCw size={11} className="spin" />
                          <span>Testing...</span>
                        </>
                      ) : keyStatus === 'valid' ? (
                        <>
                          <CheckCircle2 size={11} color="#00f5a0" />
                          <span style={{ color: '#00f5a0' }}>Verified</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={11} />
                          <span>Test Key</span>
                        </>
                      )}
                    </button>
                  </div>

                  {keyStatusMsg && (
                    <div 
                      style={{ 
                        marginTop: '6px', 
                        padding: '6px 9px', 
                        borderRadius: '6px', 
                        fontSize: '11px',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        background: keyStatus === 'valid' ? 'rgba(0, 245, 160, 0.12)' : keyStatus === 'invalid' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 208, 0, 0.12)',
                        border: `1px solid ${keyStatus === 'valid' ? '#00f5a0' : keyStatus === 'invalid' ? '#ef4444' : '#ffd000'}`,
                        color: keyStatus === 'valid' ? '#00f5a0' : keyStatus === 'invalid' ? '#ff6b6b' : '#ffd000',
                      }}
                    >
                      {keyStatus === 'valid' && <CheckCircle2 size={12} />}
                      {keyStatus === 'invalid' && <XCircle size={12} />}
                      {keyStatus === 'testing' && <RefreshCw size={12} className="spin" />}
                      <span style={{ flex: 1, lineHeight: 1.3 }}>{keyStatusMsg}</span>
                    </div>
                  )}

                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    🛡️ Strict BYOK: Connection must be verified before account creation.
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-crimson"
                style={{ width: '100%', padding: '12px', marginTop: '6px', fontSize: '13px' }}
                id="btn-auth-submit"
              >
                {loading ? 'AUTHENTICATING...' : authMode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
