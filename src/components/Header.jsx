import React from 'react';
import { Flame, Shield, Cpu, SlidersHorizontal, LogIn, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';

export default function Header({ onOpenSettings, onOpenAuth }) {
  const { user, profile } = useAuth();
  const aiSettings = storage.getAiSettings();
  const metrics = storage.getAiMetrics();

  const modelBadge = aiSettings.preferredModel === 'siemens-gpt-oss-120b'
    ? 'SIEMENS 120B'
    : aiSettings.preferredModel === 'gemini-3.5-flash-lite'
    ? 'GEMINI 3.5 LITE'
    : 'GEMINI 3.5 FLASH';

  return (
    <header className="top-header" id="planx-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div 
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ff2a5f 0%, #ff6b35 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(255, 42, 95, 0.45)',
          }}
        >
          <Shield size={20} color="#fff" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 900, fontSize: '17px', letterSpacing: '0.04em', color: '#fff' }}>
              PLAN<span style={{ color: 'var(--crimson-core)' }}>X</span>
            </span>
            <span className="badge badge-crimson" style={{ padding: '1px 6px', fontSize: '9.5px' }}>
              PRO
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span 
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#00f5a0',
                boxShadow: '0 0 8px #00f5a0',
                display: 'inline-block',
              }}
            />
            <span className="mono" style={{ fontSize: '10px', letterSpacing: '0.02em', color: '#cbd5e1' }}>
              KRATOS // {modelBadge}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Auth / Account Button */}
        {user ? (
          <button
            onClick={onOpenAuth}
            className="btn-glass"
            title="Account Profile & Sign Out"
            id="btn-header-account"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 9px',
              borderRadius: '9px',
              border: '1px solid rgba(0, 245, 160, 0.4)',
              background: 'rgba(0, 245, 160, 0.08)',
              cursor: 'pointer',
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00f5a0', boxShadow: '0 0 6px #00f5a0' }} />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff', maxWidth: '85px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.fullName || user.email?.split('@')[0]}
            </span>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="btn btn-crimson"
            title="Sign In or Create Account"
            id="btn-header-login"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            <LogIn size={13} />
            <span>Sign In</span>
          </button>
        )}

        {/* Streak Counter */}
        <div 
          className="badge badge-gold"
          title="Current Daily Streak"
          style={{
            padding: '6px 9px',
            fontSize: '11px',
            borderRadius: '9px',
            background: 'rgba(255, 208, 0, 0.1)',
            border: '1px solid rgba(255, 208, 0, 0.3)',
          }}
        >
          <Flame size={13} color="#ffd000" fill="#ffd000" />
          <span className="mono" style={{ fontWeight: 800 }}>{profile?.streakCount || 1}D</span>
        </div>

        {/* Alarms Quick Launcher */}
        <button 
          className="btn-icon" 
          onClick={onOpenSettings}
          title="Alarms & Routine Command Center"
          id="btn-header-alarms"
          style={{ position: 'relative' }}
        >
          <Bell size={16} color="#00f5a0" />
          <span style={{ position: 'absolute', top: '5px', right: '5px', width: '5px', height: '5px', borderRadius: '50%', background: '#00f5a0', boxShadow: '0 0 6px #00f5a0' }} />
        </button>

        {/* Settings button */}
        <button 
          className="btn-icon" 
          onClick={onOpenSettings}
          title="Settings & API Keys"
          id="btn-header-settings"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>
    </header>
  );
}
