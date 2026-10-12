import React from 'react';
import { Bell, Flame, Shield, Volume2, VolumeX, CheckCircle, Clock } from 'lucide-react';
import { stopActiveAlarmSiren, startAlarmSiren } from '../services/alarms';

export default function AlarmOverlayModal({ alarmData, onClose, onSnooze }) {
  if (!alarmData) return null;

  const handleDismiss = () => {
    stopActiveAlarmSiren();
    onClose();
  };

  const handleSnooze = () => {
    stopActiveAlarmSiren();
    if (onSnooze) onSnooze(alarmData);
    onClose();
  };

  return (
    <div 
      className="modal-overlay" 
      style={{ 
        zIndex: 2500, 
        background: 'rgba(5, 7, 12, 0.92)',
        backdropFilter: 'blur(30px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div 
        className="modal-content card-glass" 
        style={{ 
          maxWidth: '440px', 
          width: '100%',
          border: '1px solid rgba(0, 245, 160, 0.5)',
          boxShadow: '0 0 50px rgba(0, 245, 160, 0.25), 0 0 80px rgba(0, 242, 254, 0.15)',
          padding: '30px 24px',
          textAlign: 'center',
          animation: 'fadeIn 0.4s ease-out',
        }}
      >
        {/* Morning Flute / Awakening Icon */}
        <div 
          style={{ 
            width: '72px', 
            height: '72px', 
            borderRadius: '24px', 
            background: 'linear-gradient(135deg, #00f5a0 0%, #00f2fe 100%)', 
            margin: '0 auto 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 35px rgba(0, 245, 160, 0.45)',
          }}
        >
          <span style={{ fontSize: '34px', lineHeight: 1 }}>🪈</span>
        </div>

        {/* Time Stamp */}
        <div className="mono" style={{ fontSize: '36px', fontWeight: 900, color: '#fff', letterSpacing: '0.05em' }}>
          {alarmData.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* Alarm Title */}
        <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#00f5a0', margin: '12px 0 6px', letterSpacing: '0.04em' }}>
          {alarmData.title || '🪈 MORNING AWAKENING // BANSURI CALL'}
        </h2>

        {/* Alarm Body / Motivation */}
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 auto 24px', maxWidth: '340px' }}>
          {alarmData.body || 'Rise with calm strength, deep focus, and clear purpose. The day is yours to shape.'}
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleDismiss}
            className="btn btn-emerald"
            style={{ width: '100%', padding: '14px', fontSize: '13px', fontWeight: 900, letterSpacing: '0.03em', background: 'linear-gradient(135deg, #00f5a0 0%, #00c982 100%)', color: '#05070c' }}
            id="btn-dismiss-alarm"
          >
            AWAKEN & BEGIN DAY
          </button>

          <button
            onClick={handleSnooze}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '12px', fontSize: '12px', gap: '6px' }}
            id="btn-snooze-alarm"
          >
            <Clock size={14} />
            <span>Snooze (5 Minutes)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
