import React, { useState } from 'react';
import { Shield, LogIn, UserPlus, Mail, Lock, User, Key, AlertCircle, Check, Sparkles, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { testGeminiApiKey } from '../services/ai';

export default function AuthPage({ onAuthSuccess }) {
  const { signIn, signUp, resendConfirmationEmail, isSupabaseConfigured } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'

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

  const handleTestKey = async () => {
    if (!geminiKey || !geminiKey.trim()) {
      setKeyStatus('invalid');
      setKeyStatusMsg('Please paste your Gemini API key first.');
      return false;
    }

    setKeyStatus('testing');
    setKeyStatusMsg('Pinging Google Gemini API...');
    try {
      const res = await testGeminiApiKey(geminiKey);
      setKeyStatus('valid');
      setKeyStatusMsg(res.message || 'Gemini 3.5 connection verified and online!');
      return true;
    } catch (err) {
      setKeyStatus('invalid');
      setKeyStatusMsg(err.message || 'Connection test failed. Verify your key from Google AI Studio.');
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
        setSuccessMsg('Session authenticated. Initializing War Room...');
        setTimeout(() => {
          if (onAuthSuccess) onAuthSuccess();
        }, 500);
      } else {
        // Enforce Gemini API Key Validation & Connection Test
        if (!geminiKey || !geminiKey.trim()) {
          setKeyStatus('invalid');
          setKeyStatusMsg('Gemini API Key is required to activate KRATOS.');
          throw new Error('A valid Gemini API key is mandatory. Obtain your free key from Google AI Studio and test connection.');
        }

        // If not already verified as valid, test connection right now
        if (keyStatus !== 'valid') {
          setKeyStatus('testing');
          setKeyStatusMsg('Testing connection with Google Gemini before creating account...');
          try {
            await testGeminiApiKey(geminiKey);
            setKeyStatus('valid');
            setKeyStatusMsg('Gemini connection verified!');
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
        }, 500);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestDemo = () => {
    // Allows instant guest preview mode with a local guest ID
    const guestUser = {
      id: 'guest_operator',
      email: 'guest@planx.local',
      user_metadata: { full_name: 'Guest Operator' },
    };
    storage.setAuthUser(guestUser);
    if (onAuthSuccess) onAuthSuccess();
  };

  return (
    <div 
      className="app-shell" 
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px 16px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Atmosphere */}
      <div className="app-atmosphere">
        <div className="atmosphere-orb-1" style={{ top: '15%', left: '20%' }} />
        <div className="atmosphere-orb-2" style={{ bottom: '20%', right: '15%' }} />
        <div className="atmosphere-grid" />
      </div>

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 10 }}>
        {/* Brand Banner */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div 
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ff2a5f 0%, #ff6b35 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(255, 42, 95, 0.55)',
              margin: '0 auto 14px',
            }}
          >
            <Shield size={30} color="#fff" strokeWidth={2.5} />
          </div>

          <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#fff', letterSpacing: '0.04em', margin: 0 }}>
            PLAN<span style={{ color: 'var(--crimson-core)' }}>X</span>
          </h1>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00f5a0', boxShadow: '0 0 6px #00f5a0' }} />
            <span className="mono" style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.06em' }}>
              POWERED BY KRATOS
            </span>
          </div>

          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
            Tactical Personal Transformation Engine. Zero Excuses. Absolute Execution.
          </p>
        </div>

        {/* Auth Glass Card */}
        <div 
          className="card-glass" 
          style={{ 
            padding: '24px', 
            borderRadius: '16px',
            border: '1px solid rgba(255, 42, 95, 0.4)',
            boxShadow: '0 0 40px rgba(255, 42, 95, 0.25)',
          }}
        >
          {/* Mode Switcher */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', padding: '4px', borderRadius: '10px', gap: '6px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => { setMode('signin'); setErrorMsg(null); }}
              className={`btn ${mode === 'signin' ? 'btn-crimson' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '9px', fontSize: '12px', fontWeight: 800 }}
              id="btn-auth-mode-signin"
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(null); }}
              className={`btn ${mode === 'signup' ? 'btn-crimson' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '9px', fontSize: '12px', fontWeight: 800 }}
              id="btn-auth-mode-signup"
            >
              <UserPlus size={14} />
              <span>Create Account</span>
            </button>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ff6b6b', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
              {errorMsg.toLowerCase().includes('rate limit') && (
                <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
                  Supabase free tier restricts built-in verification emails to 3–4 per hour.
                  <br />
                  <strong style={{ color: '#00f5a0' }}>Solution:</strong> In your Supabase Dashboard &rarr; <em>Auth &rarr; Providers &rarr; Email</em>, turn off <strong>"Confirm email"</strong>, or click below to enter directly:
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const localUser = {
                          id: `local-${Date.now()}`,
                          email: email || 'nitinphulekar33@gmail.com',
                          user_metadata: { full_name: fullName || 'Nitin' },
                        };
                        storage.setAuthUser(localUser);
                        if (geminiKey && geminiKey.trim()) {
                          const cur = storage.getAiSettings();
                          storage.saveAiSettings({ ...cur, geminiKey: geminiKey.trim() });
                        }
                        if (onAuthSuccess) onAuthSuccess();
                      }}
                      className="btn btn-crimson"
                      style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 800 }}
                    >
                      Enter Immediately as Operator ({email || 'Nitin'})
                    </button>
                  </div>
                </div>
              )}

              {errorMsg.toLowerCase().includes('confirm') && (
                <div style={{ fontSize: '11.5px', color: '#cbd5e1', lineHeight: '1.45', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                  Supabase email confirmation is pending for <strong>{email || 'your email'}</strong>.
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
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
                        setSuccessMsg(`Session authenticated as ${targetEmail}! Entering War Room...`);
                        setTimeout(() => {
                          if (onAuthSuccess) onAuthSuccess();
                        }, 500);
                      }}
                      className="btn btn-crimson"
                      style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 800, width: '100%', justifyContent: 'center' }}
                      id="btn-bypass-unconfirmed"
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
                      style={{ padding: '6px 12px', fontSize: '11px', width: '100%', justifyContent: 'center' }}
                      id="btn-resend-confirmation"
                    >
                      ✉️ Resend Confirmation Link to {email || 'nitinphulekar33@gmail.com'}
                    </button>
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    💡 <strong style={{ color: '#00f5a0' }}>Permanent Fix:</strong> In your Supabase Dashboard &rarr; <em>Authentication &rarr; Providers &rarr; Email</em>, turn off <strong>"Confirm email"</strong> so any user signs in immediately without email confirmation.
                  </div>
                </div>
              )}
            </div>
          )}

          {successMsg && (
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(0, 245, 160, 0.15)', border: '1px solid #00f5a0', color: '#00f5a0', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Check size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Full Name / Callsign *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Hunter"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '34px' }}
                    id="input-auth-fullname"
                  />
                  <User size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '11px', top: '13px' }} />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Email Address *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  placeholder="operator@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '34px' }}
                  id="input-auth-email"
                />
                <Mail size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '11px', top: '13px' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Password *
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
                  style={{ paddingLeft: '34px' }}
                  id="input-auth-password"
                />
                <Lock size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '11px', top: '13px' }} />
              </div>
            </div>

            {mode === 'signup' && (
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
                      paddingLeft: '34px',
                      paddingRight: '100px',
                      borderColor: keyStatus === 'valid' ? '#00f5a0' : keyStatus === 'invalid' ? '#ef4444' : undefined,
                      boxShadow: keyStatus === 'valid' ? '0 0 10px rgba(0, 245, 160, 0.2)' : undefined,
                    }}
                    id="input-auth-gemini-key"
                  />
                  <Key size={14} color={keyStatus === 'valid' ? '#00f5a0' : "var(--text-muted)"} style={{ position: 'absolute', left: '11px', top: '13px' }} />
                  
                  {/* In-field Test Button */}
                  <button
                    type="button"
                    onClick={handleTestKey}
                    disabled={keyStatus === 'testing' || !geminiKey.trim()}
                    className={`btn ${keyStatus === 'valid' ? 'btn-secondary' : 'btn-crimson'}`}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '6px',
                      padding: '5px 10px',
                      fontSize: '10px',
                      fontWeight: 800,
                      borderRadius: '6px',
                      height: '30px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    id="btn-test-gemini-key"
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

                {/* Connection Status Banner */}
                {keyStatusMsg && (
                  <div 
                    style={{ 
                      marginTop: '7px', 
                      padding: '7px 10px', 
                      borderRadius: '6px', 
                      fontSize: '11px',
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '7px',
                      background: keyStatus === 'valid' ? 'rgba(0, 245, 160, 0.12)' : keyStatus === 'invalid' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 208, 0, 0.12)',
                      border: `1px solid ${keyStatus === 'valid' ? '#00f5a0' : keyStatus === 'invalid' ? '#ef4444' : '#ffd000'}`,
                      color: keyStatus === 'valid' ? '#00f5a0' : keyStatus === 'invalid' ? '#ff6b6b' : '#ffd000',
                    }}
                  >
                    {keyStatus === 'valid' && <CheckCircle2 size={13} />}
                    {keyStatus === 'invalid' && <XCircle size={13} />}
                    {keyStatus === 'testing' && <RefreshCw size={13} className="spin" />}
                    <span style={{ flex: 1, lineHeight: 1.3 }}>{keyStatusMsg}</span>
                  </div>
                )}

                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '5px' }}>
                  🛡️ Strict BYOK: Account creation will test and verify this key directly with Google before proceeding.
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-crimson"
              style={{ width: '100%', padding: '13px', fontSize: '13px', fontWeight: 900, marginTop: '8px' }}
              id="btn-auth-submit"
            >
              {loading ? (
                'AUTHENTICATING...'
              ) : mode === 'signin' ? (
                'SIGN IN TO WAR ROOM'
              ) : (
                'CREATE ACCOUNT & START FRESH'
              )}
            </button>
          </form>

          {/* Quick Guest Preview Button */}
          <div style={{ marginTop: '16px', textAlign: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
            <button
              type="button"
              onClick={handleGuestDemo}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
              id="btn-guest-mode"
            >
              Quick Test: Continue as Local Guest Operator
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
