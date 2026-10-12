import React, { useState } from 'react';
import { 
  Bell, Volume2, Sparkles, Plus, Trash2, Edit3, Check, 
  Clock, Shield, Bot, RefreshCw, Sun, Moon, Music, AlertCircle, Info
} from 'lucide-react';
import { storage } from '../services/storage';
import { 
  startAlarmSiren, 
  previewAlarmTone, 
  getNotificationPermissionStatus, 
  requestNotificationPermission, 
  sendTacticalNotification 
} from '../services/alarms';
import { aiManageAlarms } from '../services/ai';

export default function AlarmsManager({ onSettingsChange }) {
  const [alarmConfig, setAlarmConfig] = useState(() => storage.getAlarmSettings());
  const [notifPermission, setNotifPermission] = useState(() => getNotificationPermissionStatus());
  const [notifStatusMsg, setNotifStatusMsg] = useState(null);

  // Manual Creation Form State
  const [manualTime, setManualTime] = useState('06:00');
  const [manualTitle, setManualTitle] = useState('Morning Awakening');
  const [manualTone, setManualTone] = useState(alarmConfig.alarmTone || 'bansuri-morning');
  const [manualSavedMsg, setManualSavedMsg] = useState(false);

  // AI Copilot state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);

  const persistConfig = (updated) => {
    setAlarmConfig(updated);
    storage.saveAlarmSettings(updated);
    if (onSettingsChange) onSettingsChange(updated);
  };

  const handleRequestNotifications = async () => {
    setNotifStatusMsg(null);
    try {
      const granted = await requestNotificationPermission();
      setNotifPermission(granted ? 'granted' : 'denied');
      if (granted) {
        await sendTacticalNotification({
          title: '🪈 PLANX ALARM ENGINE',
          body: 'Native notifications active. Task reminders will be sent quietly.',
        });
        setNotifStatusMsg('✓ Device push notifications enabled.');
      } else {
        setNotifStatusMsg('Permission blocked. Enable notifications in browser settings.');
      }
    } catch (err) {
      setNotifStatusMsg(`Error: ${err.message}`);
    }
  };

  const handlePreviewTone = (tone) => {
    previewAlarmTone(tone || alarmConfig.alarmTone || 'bansuri-morning', alarmConfig.alarmVolume || 0.8);
  };

  // Manual Alarm Creation
  const handleCreateManualAlarm = (e) => {
    e.preventDefault();
    if (!manualTime) return;

    const newAlarm = {
      id: `alm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: manualTitle.trim() || 'Custom Alarm',
      time: manualTime,
      enabled: true,
      tone: manualTone || 'bansuri-morning',
      body: 'Rise peacefully with clear purpose.',
      createdAt: new Date().toISOString(),
    };

    const updatedList = [...(alarmConfig.customAlarms || []), newAlarm];
    persistConfig({
      ...alarmConfig,
      customAlarms: updatedList,
    });

    setManualSavedMsg(true);
    setTimeout(() => setManualSavedMsg(false), 2200);
    setManualTitle('');
  };

  const handleDeleteCustomAlarm = (id) => {
    const updated = (alarmConfig.customAlarms || []).filter(a => a.id !== id);
    persistConfig({ ...alarmConfig, customAlarms: updated });
  };

  const handleUpdateTimeCustomAlarm = (id, newTime) => {
    if (!newTime) return;
    const updated = (alarmConfig.customAlarms || []).map(a => 
      a.id === id ? { ...a, time: newTime } : a
    );
    persistConfig({ ...alarmConfig, customAlarms: updated });
  };

  // Auto-heal duplicate 02:00 night review if a sleep alarm is already at 02:00
  React.useEffect(() => {
    const hasSleepAlarmAt2 = (alarmConfig.customAlarms || []).some(
      a => a.time === '02:00' && a.title?.toLowerCase().includes('sleep')
    );
    if (hasSleepAlarmAt2 && alarmConfig.nightReviewTime === '02:00') {
      persistConfig({ ...alarmConfig, nightReviewTime: '21:30' });
    }
  }, []);

  // AI Copilot Execution
  const handleAiExecute = async (overridePrompt) => {
    const text = overridePrompt || aiPrompt;
    if (!text || !text.trim()) return;

    setIsAiProcessing(true);
    setAiFeedback(null);
    try {
      const result = await aiManageAlarms(text, alarmConfig);
      persistConfig(result);
      setAiFeedback({
        success: true,
        message: result.explanation || 'Alarm configuration updated.',
      });
      if (!overridePrompt) setAiPrompt('');
    } catch (err) {
      setAiFeedback({
        success: false,
        message: err.message || 'AI calibration failed.',
      });
    } finally {
      setIsAiProcessing(false);
    }
  };

  const getToneLabel = (tone) => {
    if (tone === 'santoor-sunrise') return '🪕 Kashmiri Santoor Strings';
    if (tone === 'temple-bell-om') return '🔔 Sacred 432Hz Temple Bell';
    return '🪈 Indian Bansuri Bamboo Flute';
  };

  const customAlarmsList = alarmConfig.customAlarms || [];
  const activeCount = 
    (alarmConfig.wakeAlarmEnabled ? 1 : 0) +
    (alarmConfig.nightReviewAlarmEnabled ? 1 : 0) +
    customAlarmsList.filter(a => a.enabled).length;

  return (
    <div className="card-glass" style={{ padding: '20px', border: '1px solid rgba(0, 245, 160, 0.35)' }}>
      {/* Title & Core Philosophy */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, #00f5a0 0%, #00f2fe 100%)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(0, 245, 160, 0.35)'
            }}
          >
            <Bell size={20} color="#05070c" />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#fff', letterSpacing: '0.02em' }}>
              Alarms Manager
            </h3>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Sustained Indian Instrument Audio • {activeCount} Active Alarm{activeCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRequestNotifications}
          className={`badge ${notifPermission === 'granted' ? 'badge-emerald' : 'badge-gold'}`}
          style={{ fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer', padding: '6px 10px' }}
        >
          {notifPermission === 'granted' ? '✓ Push Active' : 'Enable Push Notifications'}
        </button>
      </div>

      {/* Reminder vs Alarm Info Banner */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '8px', 
          padding: '10px 12px', 
          background: 'rgba(0, 242, 254, 0.05)', 
          border: '1px solid rgba(0, 242, 254, 0.2)', 
          borderRadius: '10px', 
          fontSize: '11.5px', 
          color: '#cbd5e1', 
          marginBottom: '18px',
          lineHeight: 1.45,
        }}
      >
        <Info size={16} color="#00f2fe" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: '#00f2fe' }}>Alarms vs. Task Reminders:</strong>
          {' '}Alarms ring continuously with chosen flute/santoor sounds until you dismiss them (for waking up or specific alarms). Your everyday tasks, habits, and goals are sent as <em>quiet notification reminders</em>, never ringing audio alarms.
        </div>
      </div>

      {notifStatusMsg && (
        <div style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '11px', marginBottom: '14px', background: 'rgba(0, 245, 160, 0.1)', border: '1px solid rgba(0, 245, 160, 0.3)', color: '#00f5a0' }}>
          {notifStatusMsg}
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. DEDICATED MANUAL ALARM CREATION SPACE */}
      {/* ======================================================== */}
      <div 
        style={{ 
          background: 'rgba(0, 0, 0, 0.4)', 
          border: '1px solid rgba(0, 245, 160, 0.3)', 
          borderRadius: '12px', 
          padding: '16px', 
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} color="#00f5a0" />
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#00f5a0', letterSpacing: '0.03em' }}>
              SET NEW ALARM MANUALLY
            </h4>
          </div>
          {manualSavedMsg && (
            <span style={{ fontSize: '11px', color: '#00f5a0', fontWeight: 700 }}>
              ✓ Alarm Added Successfully!
            </span>
          )}
        </div>

        <form onSubmit={handleCreateManualAlarm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Row 1: Time (Left) + Label/Title (Right, expands) */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ width: '140px', flexShrink: 0 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Alarm Time *
              </label>
              <input
                type="time"
                className="input-field mono"
                value={manualTime}
                onChange={e => setManualTime(e.target.value)}
                required
                style={{ fontSize: '13px', padding: '9px 12px', fontWeight: 700, width: '100%', background: 'rgba(0,0,0,0.5)', borderRadius: '8px' }}
              />
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Alarm Label / Purpose *
              </label>
              <input
                type="text"
                className="input-field"
                value={manualTitle}
                onChange={e => setManualTitle(e.target.value)}
                placeholder="e.g. Deep Work Sprint, Yoga Awakening..."
                style={{ fontSize: '13px', padding: '9px 12px', width: '100%', background: 'rgba(0,0,0,0.5)', borderRadius: '8px' }}
              />
            </div>
          </div>

          {/* Row 2: Instrument Sound Selector + Sound Preview Test Button + Add Alarm Button */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Instrument Sound Profile
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={manualTone}
                  onChange={e => setManualTone(e.target.value)}
                  className="input-field"
                  style={{ fontSize: '12.5px', padding: '9px 12px', flex: 1, background: 'rgba(0,0,0,0.5)', borderRadius: '8px' }}
                >
                  <option value="bansuri-morning">🪈 Indian Bansuri Bamboo Flute</option>
                  <option value="santoor-sunrise">🪕 Kashmiri Santoor Strings</option>
                  <option value="temple-bell-om">🔔 Sacred 432Hz Temple Bell</option>
                </select>

                <button
                  type="button"
                  onClick={() => handlePreviewTone(manualTone)}
                  className="btn btn-secondary"
                  style={{ padding: '9px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', borderRadius: '8px' }}
                  title="Preview selected sound"
                >
                  <Volume2 size={15} color="#00f5a0" />
                  <span>Test</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-emerald"
              style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', height: '40px', whiteSpace: 'nowrap', borderRadius: '8px' }}
              id="btn-save-manual-alarm"
            >
              <Plus size={16} />
              <span>Add Alarm</span>
            </button>
          </div>
        </form>
      </div>

      {/* ======================================================== */}
      {/* 2. KRATOS AI ALARM COPILOT (Explicit Alarm Requests Only) */}
      {/* ======================================================== */}
      <div 
        style={{ 
          background: 'rgba(0, 0, 0, 0.25)', 
          border: '1px solid var(--border-glass)', 
          borderRadius: '12px', 
          padding: '12px 14px', 
          marginBottom: '18px' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Bot size={15} color="#00f2fe" />
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#00f2fe', letterSpacing: '0.02em' }}>
            KRATOS ALARM COPILOT
          </span>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
            (Explicit alarm requests only)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            type="text"
            className="input-field"
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAiExecute(); }}
            placeholder="e.g. 'Set wake up alarm for 6:00 AM with Indian flute' or 'Delete all custom alarms'..."
            style={{ fontSize: '12px', padding: '8px 12px' }}
          />
          <button
            type="button"
            onClick={() => handleAiExecute()}
            disabled={isAiProcessing || !aiPrompt.trim()}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '11.5px', fontWeight: 800, whiteSpace: 'nowrap' }}
            id="btn-ai-alarm-command"
          >
            {isAiProcessing ? <RefreshCw size={13} className="pulse-crimson" /> : <Sparkles size={13} color="#00f2fe" />}
            <span>Configure</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <button
            type="button"
            onClick={() => handleAiExecute('Set morning wake up alarm for 05:00 AM with Bansuri flute')}
            className="badge badge-emerald"
            style={{ cursor: 'pointer', padding: '4px 8px', fontSize: '10px' }}
          >
            🪈 Set 5:00 AM Wake Alarm
          </button>
          <button
            type="button"
            onClick={() => handleAiExecute('Set morning wake up alarm for 06:00 AM with Bansuri flute')}
            className="badge badge-cyan"
            style={{ cursor: 'pointer', padding: '4px 8px', fontSize: '10px' }}
          >
            🪈 Set 6:00 AM Wake Alarm
          </button>
          <button
            type="button"
            onClick={() => handleAiExecute('Set night debrief alarm for 10:00 PM with Temple Bell')}
            className="badge badge-gold"
            style={{ cursor: 'pointer', padding: '4px 8px', fontSize: '10px' }}
          >
            🔔 Set 10:00 PM Night Alarm
          </button>
          {customAlarmsList.length > 0 && (
            <button
              type="button"
              onClick={() => handleAiExecute('Delete all custom alarms')}
              className="badge badge-crimson"
              style={{ cursor: 'pointer', padding: '4px 8px', fontSize: '10px' }}
            >
              🗑️ Clear All Custom Alarms
            </button>
          )}
        </div>

        {aiFeedback && (
          <div 
            style={{ 
              marginTop: '8px', 
              padding: '6px 10px', 
              borderRadius: '6px', 
              fontSize: '11px', 
              background: aiFeedback.success ? 'rgba(0, 245, 160, 0.1)' : 'rgba(255, 42, 95, 0.1)',
              border: `1px solid ${aiFeedback.success ? '#00f5a0' : '#ff2a5f'}`,
              color: aiFeedback.success ? '#00f5a0' : '#ff527b',
            }}
          >
            {aiFeedback.success ? '✅ ' : '❌ '}
            {aiFeedback.message}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. ACTIVE ALARMS LIST */}
      {/* ======================================================== */}
      <div style={{ marginBottom: '10px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '0.03em', marginBottom: '10px' }}>
          ACTIVE ALARM SCHEDULE
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Morning Wake Alarm */}
          <div 
            style={{ 
              background: alarmConfig.wakeAlarmEnabled ? 'linear-gradient(135deg, rgba(0, 245, 160, 0.06) 0%, rgba(13, 17, 26, 0.98) 100%)' : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${alarmConfig.wakeAlarmEnabled ? 'rgba(0, 245, 160, 0.35)' : 'var(--border-glass)'}`,
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: alarmConfig.wakeAlarmEnabled ? '0 4px 20px rgba(0, 245, 160, 0.07)' : 'none',
            }}
          >
            {/* Header: Time + Title (Left) | Controls & Timer (Right) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div 
                  className="mono" 
                  style={{ 
                    fontSize: '24px', 
                    fontWeight: 900, 
                    color: alarmConfig.wakeAlarmEnabled ? '#00f5a0' : 'var(--text-muted)',
                    letterSpacing: '0.02em',
                    lineHeight: 1,
                  }}
                >
                  {alarmConfig.wakeAlarmTime || '05:30'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                    🌅 Morning Wake-Up Alarm
                  </span>
                  <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '2px 7px', fontWeight: 700 }}>
                    WAKE
                  </span>
                </div>
              </div>

              {/* Right: Sound Preview, Timer Setter, Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                <button
                  type="button"
                  onClick={() => handlePreviewTone(alarmConfig.alarmTone)}
                  className="btn-icon"
                  title="Test Sound"
                  style={{ width: '32px', height: '32px', background: 'rgba(0, 245, 160, 0.08)', borderRadius: '8px' }}
                >
                  <Volume2 size={15} color="#00f5a0" />
                </button>

                <input
                  type="time"
                  value={alarmConfig.wakeAlarmTime || '05:30'}
                  onChange={e => persistConfig({ ...alarmConfig, wakeAlarmTime: e.target.value })}
                  className="input-field mono"
                  style={{ width: '115px', padding: '6px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', color: '#fff', background: 'rgba(0,0,0,0.5)' }}
                />

                <input
                  type="checkbox"
                  checked={alarmConfig.wakeAlarmEnabled !== false}
                  onChange={e => persistConfig({ ...alarmConfig, wakeAlarmEnabled: e.target.checked })}
                  style={{ width: '20px', height: '20px', accentColor: '#00f5a0', cursor: 'pointer', margin: 0 }}
                  title="Toggle Morning Wake Alarm"
                />
              </div>
            </div>

            {/* Bottom Bullets Description */}
            <div 
              style={{ 
                borderTop: '1px solid rgba(255, 255, 255, 0.06)', 
                paddingTop: '8px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#00f5a0', fontSize: '9px' }}>◆</span>
                <span style={{ color: '#cbd5e1' }}>
                  <strong style={{ color: '#fff' }}>Tone:</strong> {getToneLabel(alarmConfig.alarmTone)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#00f5a0', fontSize: '9px' }}>◆</span>
                <span style={{ color: '#94a3b8' }}>
                  Primary circadian wake-up call to rise without hesitation and initiate morning focus ritual.
                </span>
              </div>
            </div>
          </div>

          {/* Custom Alarms */}
          {customAlarmsList.map(alarm => {
            const isSleep = (alarm.title || '').toLowerCase().includes('sleep');
            const accent = isSleep ? '#ffd000' : '#00f2fe';
            const accentBorder = isSleep ? 'rgba(255, 208, 0, 0.35)' : 'rgba(0, 242, 254, 0.35)';
            const accentBg = isSleep ? 'rgba(255, 208, 0, 0.06)' : 'rgba(0, 242, 254, 0.06)';

            return (
              <div 
                key={alarm.id}
                style={{ 
                  background: alarm.enabled ? `linear-gradient(135deg, ${accentBg} 0%, rgba(13, 17, 26, 0.98) 100%)` : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${alarm.enabled ? accentBorder : 'var(--border-glass)'}`,
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: alarm.enabled ? `0 4px 20px ${accentBg}` : 'none',
                }}
              >
                {/* Header: Time + Title (Left) | Controls & Timer (Right) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div 
                      className="mono" 
                      style={{ 
                        fontSize: '24px', 
                        fontWeight: 900, 
                        color: alarm.enabled ? accent : 'var(--text-muted)',
                        letterSpacing: '0.02em',
                        lineHeight: 1,
                      }}
                    >
                      {alarm.time}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                        {alarm.title}
                      </span>
                      <span className={isSleep ? "badge badge-gold" : "badge badge-cyan"} style={{ fontSize: '10px', padding: '2px 7px', fontWeight: 700 }}>
                        {isSleep ? 'SLEEP' : 'ALARM'}
                      </span>
                    </div>
                  </div>

                  {/* Right: Sound Preview, Timer Setter, Delete, Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => handlePreviewTone(alarm.tone)}
                      className="btn-icon"
                      title="Test Sound"
                      style={{ width: '32px', height: '32px', background: `${accent}15`, borderRadius: '8px' }}
                    >
                      <Volume2 size={15} color={accent} />
                    </button>

                    <input
                      type="time"
                      value={alarm.time}
                      onChange={e => handleUpdateTimeCustomAlarm(alarm.id, e.target.value)}
                      className="input-field mono"
                      style={{ width: '115px', padding: '6px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', color: '#fff', background: 'rgba(0,0,0,0.5)' }}
                    />

                    <button
                      type="button"
                      onClick={() => handleDeleteCustomAlarm(alarm.id)}
                      className="btn-icon"
                      title="Delete this Alarm"
                      style={{ width: '32px', height: '32px', color: '#ff527b', background: 'rgba(255, 42, 95, 0.08)', borderRadius: '8px' }}
                    >
                      <Trash2 size={15} />
                    </button>

                    <input
                      type="checkbox"
                      checked={alarm.enabled}
                      onChange={() => handleToggleCustomAlarm(alarm.id)}
                      style={{ width: '20px', height: '20px', accentColor: accent, cursor: 'pointer', margin: 0 }}
                      title="Toggle Alarm On / Off"
                    />
                  </div>
                </div>

                {/* Bottom Bullets Description */}
                <div 
                  style={{ 
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)', 
                    paddingTop: '8px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '4px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: accent, fontSize: '9px' }}>◆</span>
                    <span style={{ color: '#cbd5e1' }}>
                      <strong style={{ color: '#fff' }}>Tone:</strong> {getToneLabel(alarm.tone)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: accent, fontSize: '9px' }}>◆</span>
                    <span style={{ color: '#94a3b8' }}>
                      {alarm.body || (isSleep ? 'Dedicated recovery checkpoint to protect deep sleep and restore cognitive stamina.' : 'Configured custom alarm checkpoint.')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Night Review Alarm */}
          <div 
            style={{ 
              background: alarmConfig.nightReviewAlarmEnabled ? 'linear-gradient(135deg, rgba(255, 208, 0, 0.06) 0%, rgba(13, 17, 26, 0.98) 100%)' : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${alarmConfig.nightReviewAlarmEnabled ? 'rgba(255, 208, 0, 0.35)' : 'var(--border-glass)'}`,
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: alarmConfig.nightReviewAlarmEnabled ? '0 4px 20px rgba(255, 208, 0, 0.07)' : 'none',
            }}
          >
            {/* Header: Time + Title (Left) | Controls & Timer (Right) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div 
                  className="mono" 
                  style={{ 
                    fontSize: '24px', 
                    fontWeight: 900, 
                    color: alarmConfig.nightReviewAlarmEnabled ? '#ffd000' : 'var(--text-muted)',
                    letterSpacing: '0.02em',
                    lineHeight: 1,
                  }}
                >
                  {alarmConfig.nightReviewTime || '21:30'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                    🌙 Daily Night Review Call
                  </span>
                  <span className="badge badge-gold" style={{ fontSize: '10px', padding: '2px 7px', fontWeight: 700 }}>
                    REVIEW
                  </span>
                </div>
              </div>

              {/* Right: Sound Preview, Timer Setter, Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                <button
                  type="button"
                  onClick={() => handlePreviewTone('temple-bell-om')}
                  className="btn-icon"
                  title="Test Sound"
                  style={{ width: '32px', height: '32px', background: 'rgba(255, 208, 0, 0.08)', borderRadius: '8px' }}
                >
                  <Volume2 size={15} color="#ffd000" />
                </button>

                <input
                  type="time"
                  value={alarmConfig.nightReviewTime || '21:30'}
                  onChange={e => persistConfig({ ...alarmConfig, nightReviewTime: e.target.value })}
                  className="input-field mono"
                  style={{ width: '115px', padding: '6px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', color: '#fff', background: 'rgba(0,0,0,0.5)' }}
                />

                <input
                  type="checkbox"
                  checked={alarmConfig.nightReviewAlarmEnabled !== false}
                  onChange={e => persistConfig({ ...alarmConfig, nightReviewAlarmEnabled: e.target.checked })}
                  style={{ width: '20px', height: '20px', accentColor: '#ffd000', cursor: 'pointer', margin: 0 }}
                  title="Toggle Night Review Alarm"
                />
              </div>
            </div>

            {/* Bottom Bullets Description */}
            <div 
              style={{ 
                borderTop: '1px solid rgba(255, 255, 255, 0.06)', 
                paddingTop: '8px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#ffd000', fontSize: '9px' }}>◆</span>
                <span style={{ color: '#cbd5e1' }}>
                  <strong style={{ color: '#fff' }}>Tone:</strong> 🔔 Sacred Temple Bell (432Hz)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#ffd000', fontSize: '9px' }}>◆</span>
                <span style={{ color: '#94a3b8' }}>
                  Evening reflection call. Debrief daily habit completions, calibrate tomorrow's goals, and initiate digital sundown.
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
