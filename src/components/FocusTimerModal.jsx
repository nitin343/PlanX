import React, { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, Zap, Volume2, ShieldAlert } from 'lucide-react';

export default function FocusTimerModal({ isOpen, onClose, taskTitle = 'Deep Work Focus Block' }) {
  const [selectedDuration, setSelectedDuration] = useState(45); // minutes
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [isActive, setIsActive] = useState(false);
  const [wakeLock, setWakeLock] = useState(null);

  useEffect(() => {
    setTimeLeft(selectedDuration * 60);
    setIsActive(false);
  }, [selectedDuration]);

  // Timer countdown
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      // Play alert chime
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 587.33; // D5
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
        setTimeout(() => osc.stop(), 1200);
      } catch (e) {}
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Screen Wake Lock
  useEffect(() => {
    async function requestWakeLock() {
      if ('wakeLock' in navigator && isActive) {
        try {
          const lock = await navigator.wakeLock.request('screen');
          setWakeLock(lock);
        } catch (err) {
          console.warn('Wake Lock error:', err);
        }
      }
    }

    if (isActive) {
      requestWakeLock();
    } else if (wakeLock) {
      wakeLock.release().catch(() => {});
      setWakeLock(null);
    }

    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, [isActive]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPercent = ((selectedDuration * 60 - timeLeft) / (selectedDuration * 60)) * 100;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{
          padding: '28px',
          textAlign: 'center',
          background: 'linear-gradient(180deg, #0e1320 0%, #07090e 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={20} color="#00f2fe" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>Deep Work War Room</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Task Title */}
        <div 
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '13px',
            color: 'var(--text-primary)',
            fontWeight: 600,
            marginBottom: '24px',
          }}
        >
          Target: {taskTitle}
        </div>

        {/* Duration Selectors */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '28px' }}>
          {[25, 45, 90].map((dur) => (
            <button
              key={dur}
              onClick={() => {
                setSelectedDuration(dur);
                setIsActive(false);
              }}
              className={`btn ${selectedDuration === dur ? 'btn-crimson' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              {dur} Min {dur === 90 ? 'Block' : ''}
            </button>
          ))}
        </div>

        {/* Giant Timer Display */}
        <div 
          style={{
            position: 'relative',
            width: '220px',
            height: '220px',
            margin: '0 auto 28px',
            borderRadius: '50%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(255, 42, 95, 0.08) 0%, rgba(13, 17, 26, 0.95) 70%)',
            border: '2px solid rgba(255, 42, 95, 0.3)',
            boxShadow: isActive ? '0 0 35px rgba(255, 42, 95, 0.4)' : 'none',
            transition: 'box-shadow 0.3s ease',
          }}
        >
          <div className="mono" style={{ fontSize: '46px', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--crimson-core)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {isActive ? 'EXECUTION IN PROGRESS' : 'STANDBY'}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginBottom: '16px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setIsActive(false);
              setTimeLeft(selectedDuration * 60);
            }}
            style={{ width: '48px', height: '48px', padding: 0, borderRadius: '50%' }}
            title="Reset"
          >
            <RotateCcw size={18} />
          </button>

          <button
            className={`btn ${isActive ? 'btn-secondary' : 'btn-crimson'}`}
            onClick={() => setIsActive(!isActive)}
            style={{ padding: '0 28px', height: '48px', borderRadius: '24px', fontSize: '15px' }}
            id="btn-toggle-focus-timer"
          >
            {isActive ? (
              <>
                <Pause size={18} />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={18} fill="#fff" />
                <span>Engage Target</span>
              </>
            )}
          </button>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {wakeLock ? '⚡ Screen WakeLock active: Display will not turn off.' : '💡 Screen keeps active while running.'}
        </div>
      </div>
    </div>
  );
}
