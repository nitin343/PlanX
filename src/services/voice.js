// ========================================================
// PLANX — VOICE & SPEECH-TO-TEXT ENGINE
// Real-time live dictation + Gemini Multimodal Audio STT
// ========================================================

import { storage } from './storage';

/**
 * Converts a Blob to a base64 encoded string (without data URL prefix).
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Transcribes an audio blob directly via Google Gemini multimodal Speech-to-Text.
 * Uses the user's free Gemini API key configured in PlanX settings.
 */
export async function transcribeWithGemini(audioBlob) {
  const settings = storage.getAiSettings();
  const apiKey = settings.geminiKey?.trim();

  if (!apiKey || apiKey === 'YOUR_GEMINI_KEY_HERE') {
    throw new Error('Please configure your Gemini API Key in Settings for audio transcription.');
  }

  const base64Data = await blobToBase64(audioBlob);
  let mimeType = audioBlob.type?.split(';')[0] || 'audio/webm';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
    mimeType = 'audio/mp4';
  } else if (mimeType.includes('ogg')) {
    mimeType = 'audio/ogg';
  } else if (mimeType.includes('wav')) {
    mimeType = 'audio/wav';
  } else {
    mimeType = 'audio/webm';
  }

  // Use official multimodal audio model on Google AI Studio
  let modelName = 'gemini-1.5-flash';
  if (settings.preferredModel && !settings.preferredModel.includes('3.')) {
    modelName = settings.preferredModel;
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: 'Transcribe this voice speech verbatim into natural, accurate text. If technical programming terms like PyTorch, LeetCode, Transformers, or JavaScript are mentioned, transcribe them accurately. Output ONLY the transcribed text. Do NOT add commentary, explanations, or quotes.',
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 500,
    },
  };

  const candidateModels = [
    modelName,
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-flash',
  ].filter((m, idx, self) => self.indexOf(m) === idx);

  let lastError = null;
  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        let transcript = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (transcript) {
          // Strip unnecessary quotes wrapped by LLM
          transcript = transcript.replace(/^["']|["']$/g, '').trim();
          storage.incrementAiMetrics(150, false);
          return transcript;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = new Error(errJson?.error?.message || `Model ${model} returned status ${res.status}`);
      }
    } catch (netErr) {
      lastError = netErr;
    }
  }

  throw lastError || new Error('Audio transcription failed across all candidate models.');
}

/**
 * Manages hybrid voice dictation:
 * 1. Attempts instant live browser SpeechRecognition (zero latency stream)
 * 2. Simultaneously captures MediaRecorder audio stream
 * 3. If SpeechRecognition fails or is unsupported (e.g. Firefox/PWA constraints),
 *    sends audio to Gemini multimodal STT for state-of-the-art transcription.
 */
export class VoiceTranscriber {
  constructor({ onInterim, onFinal, onError, onStateChange, onProcessing }) {
    this.onInterim = onInterim || (() => {});
    this.onFinal = onFinal || (() => {});
    this.onError = onError || (() => {});
    this.onStateChange = onStateChange || (() => {});
    this.onProcessing = onProcessing || (() => {});

    this.isRecording = false;
    this.engine = null; // 'speechRecognition' | 'mediaRecorder'
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.speechRecognition = null;
    this.stream = null;
    this.latestText = '';
  }

  async start() {
    if (this.isRecording) return;
    this.latestText = '';
    this.audioChunks = [];

    // 1. HIGH-END FREE NEURAL ENGINE: Web Speech API (Chrome Android, Desktop, Safari iOS, Edge)
    // 100% FREE, Zero Sign-in, Zero API key required!
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          this.isRecording = true;
          this.engine = 'speechRecognition';
          this.onStateChange(true);
        };

        recognition.onresult = (event) => {
          let interimText = '';
          let finalText = '';

          for (let i = 0; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              finalText += res[0].transcript;
            } else {
              interimText += res[0].transcript;
            }
          }

          const current = (finalText + ' ' + interimText).trim();
          if (current) {
            this.latestText = current;
            this.onInterim(current);
          }
        };

        recognition.onerror = (e) => {
          console.warn('SpeechRecognition event note:', e.error);
          if (e.error === 'not-allowed' || e.error === 'permission-denied') {
            this.isRecording = false;
            this.onStateChange(false);
            this.onError(new Error('Microphone permission denied. Allow mic access in browser.'));
          } else if (e.error !== 'no-speech') {
            // Keep going unless fatal
          }
        };

        recognition.onend = () => {
          if (this.isRecording && this.engine === 'speechRecognition') {
            // Mobile Chrome can sometimes pause on silence; cleanly restart while recording is active
            try {
              recognition.start();
            } catch {
              // Ignore if already active
            }
          }
        };

        this.speechRecognition = recognition;
        recognition.start();
        this.isRecording = true;
        this.engine = 'speechRecognition';
        this.onStateChange(true);
        return;
      } catch (nativeErr) {
        console.warn('SpeechRecognition direct start exception, trying MediaRecorder fallback:', nativeErr);
      }
    }

    // 2. FALLBACK ENGINE: Only for browsers lacking Web Speech API (Firefox)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.onError(new Error('Microphone access is not supported on this browser. Use Chrome or Safari.'));
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.engine = 'mediaRecorder';
      this.isRecording = true;
      this.onStateChange(true);
      this.mediaRecorder.start(250);
    } catch (micErr) {
      this.isRecording = false;
      this.onStateChange(false);
      this.onError(new Error(micErr.message?.includes('Permission') 
        ? 'Microphone permission denied. Allow microphone access in your browser.' 
        : 'Could not access microphone.'));
    }
  }

  async stop() {
    if (!this.isRecording) return;
    this.isRecording = false;
    this.onStateChange(false);

    // 1. Native Web Speech Engine finish (Instant, Free, No Sign-In)
    if (this.engine === 'speechRecognition') {
      if (this.speechRecognition) {
        try {
          this.speechRecognition.onend = null; // Unbind auto-restart
          this.speechRecognition.stop();
        } catch {}
      }

      if (this.latestText.trim()) {
        this.onFinal(this.latestText.trim());
      } else {
        this.onError(new Error('No speech detected. Please speak closer to the microphone.'));
      }
      return;
    }

    // 2. Fallback MediaRecorder finish
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      await new Promise((resolve) => {
        this.mediaRecorder.onstop = resolve;
        try { this.mediaRecorder.stop(); } catch { resolve(); }
      });

      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
      }

      if (this.audioChunks.length > 0) {
        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        if (audioBlob.size > 1500) {
          try {
            this.onProcessing(true);
            const geminiTranscript = await transcribeWithGemini(audioBlob);
            this.onProcessing(false);
            this.onFinal(geminiTranscript);
            return;
          } catch (geminiErr) {
            this.onProcessing(false);
            this.onError(geminiErr);
            return;
          }
        }
      }
    }

    this.onError(new Error('No speech captured. Speak closer to the microphone.'));
  }

  toggle() {
    if (this.isRecording) {
      this.stop();
    } else {
      this.start();
    }
  }
}
