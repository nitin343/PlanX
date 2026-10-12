// ========================================================
// PLANX — TACTICAL ALARM & NOTIFICATION ENGINE
// Universal cross-platform support: macOS, Windows, Linux, Android, iOS (PWA)
// Synthesized Web Audio sirens, native notifications, and vibration API
// ========================================================

import { storage } from './storage';

let audioCtx = null;
let activeLoopController = null;

// Initialize or resume Web Audio Context on user gesture
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// ========================================================
// 1. SYNTHESIZED BATTLE ALARMS (100% Offline, Zero Assets)
// ========================================================

/**
 * Synthesizes a gentle, motivational Indian Bamboo Flute (Bansuri) morning raga melody
 * with soft Tanpura drone and authentic bamboo breath vibrato
 */
function playBansuriFlute(ctx, masterGain) {
  let isPlaying = true;
  const activeNodes = [];

  // 1. Soft Warm Tanpura Drone (Sa - Pa: C3=130.81Hz, G3=196Hz)
  const droneOsc1 = ctx.createOscillator();
  const droneOsc2 = ctx.createOscillator();
  const droneGain = ctx.createGain();

  droneOsc1.type = 'sine';
  droneOsc2.type = 'triangle';
  droneOsc1.frequency.setValueAtTime(130.81, ctx.currentTime); // Sa (C3)
  droneOsc2.frequency.setValueAtTime(196.00, ctx.currentTime); // Pa (G3)

  droneGain.gain.setValueAtTime(0.08, ctx.currentTime); // Very gentle background warmth
  droneOsc1.connect(droneGain);
  droneOsc2.connect(droneGain);
  droneGain.connect(masterGain);

  droneOsc1.start();
  droneOsc2.start();
  activeNodes.push(droneOsc1, droneOsc2, droneGain);

  // 2. Uplifting Morning Bansuri Scale (Raga Bhupali / Desh: C4, D4, E4, G4, A4, C5)
  // Meditative, motivational, peaceful awakening
  const melody = [
    { freq: 261.63, dur: 1.2 }, // Sa (C4)
    { freq: 293.66, dur: 0.9 }, // Re (D4)
    { freq: 329.63, dur: 1.4 }, // Ga (E4)
    { freq: 392.00, dur: 1.2 }, // Pa (G4)
    { freq: 440.00, dur: 1.6 }, // Dha (A4)
    { freq: 523.25, dur: 2.2 }, // Taar Sa (C5)
    { freq: 440.00, dur: 1.1 }, // Dha
    { freq: 392.00, dur: 1.3 }, // Pa
    { freq: 329.63, dur: 1.5 }, // Ga
    { freq: 293.66, dur: 1.2 }, // Re
    { freq: 261.63, dur: 2.8 }, // Sa (Restful root)
  ];

  let melodyTimeout = null;

  function playMelodyLoop() {
    if (!isPlaying) return;

    let timeOffset = ctx.currentTime + 0.3;

    melody.forEach((note) => {
      // Flute Fundamental (Sine)
      const fluteOsc = ctx.createOscillator();
      fluteOsc.type = 'sine';
      fluteOsc.frequency.setValueAtTime(note.freq, timeOffset);

      // Flute Bamboo Overtone (Soft harmonic)
      const harmOsc = ctx.createOscillator();
      harmOsc.type = 'triangle';
      harmOsc.frequency.setValueAtTime(note.freq * 2, timeOffset);

      // Natural Vibrato (5Hz LFO for smooth breath flutter)
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibrato.frequency.setValueAtTime(5.2, timeOffset);
      vibratoGain.gain.setValueAtTime(3.8, timeOffset); // Subtle pitch modulation
      vibrato.connect(vibratoGain);
      vibratoGain.connect(fluteOsc.frequency);
      vibratoGain.connect(harmOsc.frequency);

      // Smooth Breath Envelope (Gentle fade in & out, zero clicks or startles)
      const noteGain = ctx.createGain();
      const attackTime = 0.25;
      const releaseTime = 0.35;

      noteGain.gain.setValueAtTime(0.0001, timeOffset);
      noteGain.gain.linearRampToValueAtTime(0.45, timeOffset + attackTime);
      noteGain.gain.setValueAtTime(0.42, timeOffset + note.dur - releaseTime);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, timeOffset + note.dur);

      const harmGain = ctx.createGain();
      harmGain.gain.setValueAtTime(0.06, timeOffset);

      fluteOsc.connect(noteGain);
      harmOsc.connect(harmGain);
      harmGain.connect(noteGain);
      noteGain.connect(masterGain);

      fluteOsc.start(timeOffset);
      harmOsc.start(timeOffset);
      vibrato.start(timeOffset);

      fluteOsc.stop(timeOffset + note.dur + 0.05);
      harmOsc.stop(timeOffset + note.dur + 0.05);
      vibrato.stop(timeOffset + note.dur + 0.05);

      timeOffset += note.dur + 0.15; // Smooth breath pause between notes
    });

    const totalMelodyDuration = (timeOffset - ctx.currentTime) * 1000;
    melodyTimeout = setTimeout(() => {
      if (isPlaying) playMelodyLoop();
    }, totalMelodyDuration + 1500); // 1.5s gentle silence between cycles
  }

  playMelodyLoop();

  return {
    stop: () => {
      isPlaying = false;
      if (melodyTimeout) clearTimeout(melodyTimeout);
      activeNodes.forEach(node => {
        try { if (node.stop) node.stop(); } catch {}
        try { if (node.disconnect) node.disconnect(); } catch {}
      });
    }
  };
}

/**
 * Synthesizes a soothing Kashmiri Santoor & Sitar hammer string melody
 */
function playSantoorSunrise(ctx, masterGain) {
  let isPlaying = true;
  let santoorTimeout = null;

  // Gentle morning raga arpeggio on acoustic strings
  const santoorNotes = [261.63, 329.63, 392.00, 493.88, 523.25, 659.25, 783.99];

  function playSantoorCycle() {
    if (!isPlaying) return;
    let t = ctx.currentTime + 0.2;

    santoorNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      // Acoustic string pluck decay
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(t);
      osc.stop(t + 1.3);

      t += 0.35 + (idx % 2 === 0 ? 0.1 : 0.25);
    });

    santoorTimeout = setTimeout(() => {
      if (isPlaying) playSantoorCycle();
    }, 4500);
  }

  playSantoorCycle();

  return {
    stop: () => {
      isPlaying = false;
      if (santoorTimeout) clearTimeout(santoorTimeout);
    }
  };
}

/**
 * Synthesizes a sacred morning Temple Bell with harmonic Om resonance
 */
function playTempleBell(ctx, masterGain) {
  let isPlaying = true;
  let bellInterval = null;

  function strikeBell() {
    if (!isPlaying) return;
    const t = ctx.currentTime;
    const freqs = [432, 864, 1296]; // Pure 432Hz harmonic series

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      const amp = i === 0 ? 0.6 : 0.18;
      gain.gain.setValueAtTime(amp, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(t);
      osc.stop(t + 3.9);
    });
  }

  strikeBell();
  bellInterval = setInterval(() => {
    if (!isPlaying) { clearInterval(bellInterval); return; }
    strikeBell();
  }, 4200);

  return {
    stop: () => {
      isPlaying = false;
      if (bellInterval) clearInterval(bellInterval);
    }
  };
}

/**
 * Plays a smooth, motivational morning alarm (loops continuously until stopped)
 * @param {'bansuri-morning' | 'santoor-sunrise' | 'temple-bell-om'} tone 
 * @param {number} volume (0.0 to 1.0)
 * @returns {{ stop: () => void }}
 */
export function startAlarmSiren(tone = 'bansuri-morning', volume = 0.8) {
  stopActiveAlarmSiren();

  const ctx = getAudioContext();
  if (!ctx) return { stop: () => {} };

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(Math.max(0.1, Math.min(1.0, volume)), ctx.currentTime);
  masterGain.connect(ctx.destination);

  // Gentle haptic pulse on mobile devices (Android)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 300, 200, 300, 500]);
    } catch {}
  }

  let controller = null;

  if (tone === 'santoor-sunrise') {
    controller = playSantoorSunrise(ctx, masterGain);
  } else if (tone === 'temple-bell-om') {
    controller = playTempleBell(ctx, masterGain);
  } else {
    // Default: 'bansuri-morning' (Soothing Indian Classical Bamboo Flute)
    controller = playBansuriFlute(ctx, masterGain);
  }

  activeLoopController = {
    stop: () => {
      try { controller.stop(); } catch {}
      try { masterGain.disconnect(); } catch {}
    }
  };

  return activeLoopController;
}

export function stopActiveAlarmSiren() {
  if (activeLoopController) {
    try {
      activeLoopController.stop();
    } catch {}
    activeLoopController = null;
  }
}

/**
 * Quick 3-second preview of chosen tone
 */
export function previewAlarmTone(tone = 'bansuri-morning', volume = 0.8) {
  const ctrl = startAlarmSiren(tone, volume);
  setTimeout(() => {
    ctrl.stop();
  }, 3200);
}

// ========================================================
// 2. CROSS-PLATFORM SYSTEM NOTIFICATIONS (Mac, Windows, Linux, Android, iOS PWA)
// ========================================================

/**
 * Checks if browser has notification permissions
 */
export function getNotificationPermissionStatus() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

/**
 * Requests native system notification permission
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    throw new Error('System Notifications are not supported in this browser.');
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Dispatches an instant native push/system notification
 */
export async function sendTacticalNotification({
  title = '⚔️ KRATOS TACTICAL ALERT',
  body = 'Time to execute your Priority 1 target. Zero negotiations.',
  tag = 'planx-alert',
  badge = '/icons/icon-192.png',
  icon = '/icons/icon-192.png',
} = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  if (Notification.permission !== 'granted') {
    const granted = await requestNotificationPermission().catch(() => false);
    if (!granted) return false;
  }

  // 1. Try Service Worker showNotification (Best for Android & iOS 16.4+ standalone PWAs)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, {
          body,
          icon,
          badge,
          tag,
          renotify: true,
          vibrate: [300, 150, 300, 150, 600],
          data: { url: window.location.origin },
        });
        return true;
      }
    } catch (e) {
      console.warn('ServiceWorker notification error, falling back to window Notification:', e);
    }
  }

  // 2. Standard Window Notification API (macOS, Windows, Linux)
  try {
    const notification = new Notification(title, {
      body,
      icon,
      tag,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch (err) {
    console.warn('Window Notification failed:', err);
    return false;
  }
}

// ========================================================
// 3. SCHEDULED ALARM BACKGROUND TICKER
// ========================================================

let alarmCheckInterval = null;
let lastTriggeredMinute = '';

/**
 * Starts the background clock listener to trigger scheduled alarms
 * @param {(alarmData: { type: string, time: string, title: string }) => void} onAlarmTriggered
 */
export function startAlarmScheduler(onAlarmTriggered) {
  if (alarmCheckInterval) clearInterval(alarmCheckInterval);

  alarmCheckInterval = setInterval(() => {
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    if (currentTimeStr === lastTriggeredMinute) return; // Prevent double-firing within the same minute

    const settings = storage.getAlarmSettings();
    const profile = storage.getProfile();

    // Check 1: Morning Wake-Up Call
    const wakeTime = settings.wakeAlarmTime || profile.wakeTime || '05:30';
    if (settings.wakeAlarmEnabled && currentTimeStr === wakeTime) {
      lastTriggeredMinute = currentTimeStr;
      triggerAlarm(
        {
          type: 'wake',
          time: wakeTime,
          title: '🪈 MORNING AWAKENING // BANSURI CALL',
          body: 'Rise with calm strength, deep focus, and clear purpose. The day is yours to conquer.',
          tone: settings.alarmTone || 'bansuri-morning',
        },
        settings,
        onAlarmTriggered
      );
      return;
    }

    // Check 2: Night Review & Debrief
    const nightTime = settings.nightReviewTime || '21:30';
    if (settings.nightReviewAlarmEnabled && currentTimeStr === nightTime) {
      lastTriggeredMinute = currentTimeStr;
      triggerAlarm(
        {
          type: 'night',
          time: nightTime,
          title: '🌙 NIGHT DEBRIEF // KRATOS CALLS',
          body: 'Day concluded. Grade your performance, lock your lessons, and prepare for tomorrow.',
          tone: 'temple-bell-om',
        },
        settings,
        onAlarmTriggered
      );
      return;
    }

    // Check 3: Custom Operator / AI Alarms
    const customList = settings.customAlarms || [];
    for (const alarm of customList) {
      if (alarm.enabled && currentTimeStr === alarm.time) {
        lastTriggeredMinute = currentTimeStr;
        triggerAlarm(
          {
            id: alarm.id,
            type: 'custom',
            time: alarm.time,
            title: alarm.title || 'Focus Checkpoint',
            body: alarm.body || 'Execute with discipline and focus. Stay relentless.',
            tone: alarm.tone || settings.alarmTone || 'bansuri-morning',
            tag: alarm.tag || 'Focus',
          },
          settings,
          onAlarmTriggered
        );
        return;
      }
    }
  }, 10000); // Check every 10 seconds
}

function triggerAlarm(alarmInfo, settings, callback) {
  // 1. Play synthesized melody with the alarm's specific instrument tone
  const toneToPlay = alarmInfo.tone || settings.alarmTone || 'bansuri-morning';
  startAlarmSiren(toneToPlay, settings.alarmVolume || 0.8);

  // 2. Send cross-platform notification
  if (settings.notificationsEnabled) {
    sendTacticalNotification({
      title: alarmInfo.title,
      body: alarmInfo.body,
    });
  }

  // 3. Invoke UI popup overlay
  if (typeof callback === 'function') {
    callback(alarmInfo);
  }
}
