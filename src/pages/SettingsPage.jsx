import React, { useState } from 'react';
import { 
  Key, Shield, Cpu, Database, Bell, Check, 
  AlertTriangle, DollarSign, Sparkles, RefreshCw, Save, LogIn, LogOut, User, Volume2, VolumeX
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { isSupabaseConfigured } from '../services/supabase';
import { callGemini, callSiemensLLM } from '../services/ai';
import { pushToCloud, pullFromCloud } from '../services/cloudSync';
import { 
  getNotificationPermissionStatus, 
  requestNotificationPermission, 
  sendTacticalNotification, 
  previewAlarmTone 
} from '../services/alarms';
import AlarmsManager from '../components/AlarmsManager';

export default function SettingsPage() {
  const { user, profile, setIsAuthModalOpen, signOut, openLogin, syncAiKeyToCloud } = useAuth();
  const [settings, setSettings] = useState(() => storage.getAiSettings());
  const [alarmConfig, setAlarmConfig] = useState(() => storage.getAlarmSettings());
  const [notifPermission, setNotifPermission] = useState(() => getNotificationPermissionStatus());
  const [notifStatusMsg, setNotifStatusMsg] = useState(null);

  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [siemensTestResult, setSiemensTestResult] = useState(null);
  const [isTestingSiemens, setIsTestingSiemens] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);
  const [schemaCopied, setSchemaCopied] = useState(false);

  const handleManualSync = async () => {
    setIsSyncingCloud(true);
    setSyncMsg({ type: 'info', text: 'Connecting to Supabase Cloud & synchronizing progress...' });
    try {
      const pushRes = await pushToCloud();
      if (!pushRes.success) {
        throw new Error(pushRes.error || 'Failed to upload to cloud.');
      }
      const pullRes = await pullFromCloud();
      if (!pullRes.success) {
        throw new Error(pullRes.error || 'Failed to download from cloud.');
      }
      // Re-hydrate settings in component state so user sees transferred key immediately
      setSettings(storage.getAiSettings());
      setSyncMsg({
        type: 'success',
        text: `✓ Verified Sync: ${pushRes.summary} synchronized between Mobile & Laptop.`,
      });
    } catch (e) {
      setSyncMsg({ type: 'error', text: `⚠️ Sync Notice: ${e.message}` });
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setSyncMsg(null), 7000);
    }
  };

  const handleSave = async () => {
    storage.saveAiSettings(settings);
    storage.saveAlarmSettings(alarmConfig);
    if (syncAiKeyToCloud) {
      await syncAiKeyToCloud(settings.geminiKey);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleRequestNotifications = async () => {
    setNotifStatusMsg(null);
    try {
      const granted = await requestNotificationPermission();
      setNotifPermission(granted ? 'granted' : 'denied');
      if (granted) {
        await sendTacticalNotification({
          title: '⚔️ KRATOS COMBAT SYSTEM ONLINE',
          body: 'Native push notifications activated successfully. Zero excuses.',
        });
        setNotifStatusMsg('✓ Native notification sent! Check your device notification center.');
      } else {
        setNotifStatusMsg('Permission was denied. Please allow notifications in your browser settings.');
      }
    } catch (err) {
      setNotifStatusMsg(`Error: ${err.message}`);
    }
  };

  const handlePreviewAlarm = () => {
    previewAlarmTone(alarmConfig.alarmTone || 'bansuri-morning', alarmConfig.alarmVolume || 0.8);
  };

  const handleTestKey = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      storage.saveAiSettings(settings);
      if (syncAiKeyToCloud) {
        await syncAiKeyToCloud(settings.geminiKey);
      }
      const res = await callGemini('Say "KRATOS ONLINE: Systems calibrated." in 5 words.');
      setTestResult({ success: true, message: res });
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Key verification failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestSiemens = async () => {
    setIsTestingSiemens(true);
    setSiemensTestResult(null);
    try {
      storage.saveAiSettings(settings);
      const res = await callSiemensLLM('Confirm you are active as KRATOS in 5 words.');
      setSiemensTestResult({ success: true, message: res });
    } catch (err) {
      setSiemensTestResult({ success: false, message: err.message || 'Siemens connection failed' });
    } finally {
      setIsTestingSiemens(false);
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>Configuration & AI Keys</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Manage Gemini, Siemens LLM fallback, spending caps, and cloud sync
        </p>
      </div>

      {/* Account & Authentication Card */}
      <div className="card-glass" style={{ padding: '16px', border: '1px solid rgba(255, 42, 95, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="var(--crimson-core)" />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>User Account & Sync</h3>
          </div>
          <span className={`badge ${user ? 'badge-emerald' : 'badge-gold'}`} style={{ fontSize: '10px' }}>
            {user ? 'AUTHENTICATED' : 'GUEST MODE'}
          </span>
        </div>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-glass)' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                {profile?.fullName || user.email?.split('@')[0]}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {user.email}
              </div>
              <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', color: '#00f5a0' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00f5a0', boxShadow: '0 0 6px #00f5a0' }} />
                <span>Persistent Session (90-Day Auto-Renew)</span>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '11px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
            >
              <LogOut size={13} />
              <span>Log Out</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Sign in or create an account to persist your battle plans, sprints, and KRATOS history across all devices.
            </p>
            <button
              onClick={() => openLogin()}
              className="btn btn-crimson"
              style={{ padding: '10px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              id="btn-settings-login"
            >
              <LogIn size={14} />
              <span>LOG IN / CREATE ACCOUNT</span>
            </button>
          </div>
        )}
      </div>

      {/* Supabase Status & Cross-Device Sync Banner */}
      <div 
        className="card-glass" 
        style={{ 
          padding: '16px',
          borderColor: isSupabaseConfigured ? 'rgba(0, 245, 160, 0.4)' : 'rgba(255, 208, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={18} color={isSupabaseConfigured ? '#00f5a0' : '#ffd000'} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                Cross-Device Cloud Sync (Mobile &harr; Laptop)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {isSupabaseConfigured ? 'Supabase Project: bdpqjwpxvjseagxlhzho.supabase.co' : 'Local Offline Engine'}
              </div>
            </div>
          </div>
          <span className={`badge ${isSupabaseConfigured ? 'badge-emerald' : 'badge-gold'}`}>
            {isSupabaseConfigured ? 'ONLINE' : 'LOCAL'}
          </span>
        </div>

        <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
          {user?.id ? (
            <>Logged in as <strong>{user.email || 'Operator'}</strong>. Your tactical battle plan, mission checklist, habits, and roadmaps sync automatically between your phone and laptop.</>
          ) : (
            <>Log in to sync your tasks, goals, habits, and daily plans between your mobile and laptop devices seamlessly.</>
          )}
        </p>

        {syncMsg && (
          <div 
            style={{ 
              padding: '10px 14px', 
              background: syncMsg.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0, 245, 160, 0.12)', 
              border: `1px solid ${syncMsg.type === 'error' ? '#ef4444' : '#00f5a0'}`, 
              borderRadius: '8px', 
              color: syncMsg.type === 'error' ? '#ff6b6b' : '#00f5a0', 
              fontSize: '12px', 
              fontWeight: 700, 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>{typeof syncMsg === 'string' ? syncMsg : syncMsg.text}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncingCloud || !user?.id}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '12px', gap: '6px', fontWeight: 800 }}
          >
            <RefreshCw size={14} className={isSyncingCloud ? 'animate-spin' : ''} />
            <span>{isSyncingCloud ? 'Synchronizing...' : 'Sync Across Devices Now'}</span>
          </button>
        </div>
      </div>

      {/* Google Gemini AI Configuration */}
      <div className="card-glass" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Sparkles size={18} color="var(--crimson-core)" />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>Gemini AI Engine (Primary)</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* API Key */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Gemini API Key
              </label>
              {user?.id && (
                <span className="badge badge-emerald" style={{ fontSize: '9.5px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Shield size={10} />
                  <span>Cloud Synchronized</span>
                </span>
              )}
            </div>
            <input
              type="password"
              className="input-field"
              value={settings.geminiKey}
              onChange={(e) => setSettings({ ...settings, geminiKey: e.target.value })}
              placeholder="Paste AIzaSy... key here"
              id="input-gemini-key"
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '5px 0 0 0' }}>
              Transfers automatically between your mobile phone and laptop upon sync.
            </p>
          </div>

          {/* Preferred Model */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Model Architecture
            </label>
            <select
              className="input-field"
              value={settings.preferredModel || 'gemini-2.5-flash'}
              onChange={(e) => setSettings({ ...settings, preferredModel: e.target.value })}
              style={{ cursor: 'pointer' }}
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Official Flagship - Deep Reasoning & Fast)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Multimodal Audio/Vision)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Universal Fallback)</option>
              <option value="siemens-gpt-oss-120b">Siemens GPT-OSS-120B (Enterprise Internal LLM)</option>
            </select>
          </div>

          {/* Spending Cap Adjustment */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#ffd000', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <DollarSign size={14} />
                Safety Spending Cap ($)
              </label>
              <span className="mono" style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                ${Number(settings.spendingCapDollars).toFixed(2)} USD
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={settings.spendingCapDollars}
              onChange={(e) => setSettings({ ...settings, spendingCapDollars: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--crimson-core)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
              <span>$0.50 (Strict Minimum)</span>
              <span>$1.00 (Your Safety Target)</span>
              <span>$10.00 (High Volume)</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              🔒 Hard stop protection: If total token billing exceeds this amount, AI calls freeze automatically.
            </p>
          </div>

          {/* Test Connection Button */}
          <button
            className="btn btn-secondary"
            onClick={handleTestKey}
            disabled={isTesting}
            style={{ width: '100%', gap: '8px', fontSize: '12.5px' }}
            id="btn-test-ai-key"
          >
            <RefreshCw size={14} className={isTesting ? 'pulse-crimson' : ''} />
            <span>{isTesting ? 'Verifying with KRATOS...' : 'Test Connection & Ping Gemini'}</span>
          </button>

          {testResult && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                background: testResult.success ? 'rgba(0, 245, 160, 0.1)' : 'rgba(255, 42, 95, 0.1)',
                border: `1px solid ${testResult.success ? '#00f5a0' : '#ff2a5f'}`,
                color: testResult.success ? '#00f5a0' : '#ff527b',
              }}
            >
              {testResult.success ? '✅ ' : '❌ '}
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Siemens LLM (Fallback Engine) */}
      <div className="card-glass" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Cpu size={18} color="#00f2fe" />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>Siemens LLM (Fallback & Enterprise Engine)</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Siemens API Endpoint URL
            </label>
            <input
              type="text"
              className="input-field"
              value={settings.siemensEndpoint}
              onChange={(e) => setSettings({ ...settings, siemensEndpoint: e.target.value })}
              placeholder="https://api.siemens.com/llm/v1"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Siemens Bearer Token / API Key
            </label>
            <input
              type="password"
              className="input-field"
              value={settings.siemensKey}
              onChange={(e) => setSettings({ ...settings, siemensKey: e.target.value })}
              placeholder="SIAK-..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Model Identifier
            </label>
            <input
              type="text"
              className="input-field"
              value={settings.siemensModel}
              onChange={(e) => setSettings({ ...settings, siemensModel: e.target.value })}
              placeholder="gpt-oss-120b"
            />
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleTestSiemens}
            disabled={isTestingSiemens}
            style={{ width: '100%', gap: '8px', fontSize: '12.5px', marginTop: '4px' }}
            id="btn-test-siemens-llm"
          >
            <RefreshCw size={14} className={isTestingSiemens ? 'pulse-crimson' : ''} />
            <span>{isTestingSiemens ? 'Pinging Siemens LLM...' : 'Test Siemens LLM Connection'}</span>
          </button>

          {siemensTestResult && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                background: siemensTestResult.success ? 'rgba(0, 245, 160, 0.1)' : 'rgba(255, 42, 95, 0.1)',
                border: `1px solid ${siemensTestResult.success ? '#00f5a0' : '#ff2a5f'}`,
                color: siemensTestResult.success ? '#00f5a0' : '#ff527b',
              }}
            >
              {siemensTestResult.success ? '✅ ' : '❌ '}
              {siemensTestResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Alarms & Routines Command Center (Manual + AI Copilot) */}
      <AlarmsManager />

      {/* Save Settings Action Button */}
      <button
        className="btn btn-crimson"
        onClick={handleSave}
        style={{ width: '100%', padding: '14px', gap: '8px', fontSize: '14px' }}
        id="btn-save-settings"
      >
        {saveSuccess ? <Check size={18} /> : <Save size={18} />}
        <span>{saveSuccess ? 'Configuration Saved!' : 'Save & Calibrate Settings'}</span>
      </button>
    </div>
  );
}
