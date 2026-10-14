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
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.speechRecognition = null;
    this.stream = null;
    this.hasBrowserTranscript = false;
    this.latestBrowserText = '';
  }

  async start() {
    if (this.isRecording) return;
    this.hasBrowserTranscript = false;
    this.latestBrowserText = '';
    this.audioChunks = [];

    // 1. Check microphone support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.onError(new Error('Microphone access is not supported on this browser.'));
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

      // 2. Setup MediaRecorder for Gemini fallback / audio capture
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }

        try {
          this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
        } catch {
          this.mediaRecorder = new MediaRecorder(this.stream);
        }

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.start(250); // Slice chunks every 250ms
      }

      // 3. Setup Web Speech API for real-time live streaming dictation
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          this.speechRecognition = new SpeechRecognition();
          this.speechRecognition.continuous = true;
          this.speechRecognition.interimResults = true;
          this.speechRecognition.lang = 'en-US';

          this.speechRecognition.onresult = (event) => {
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
              this.hasBrowserTranscript = true;
              this.latestBrowserText = current;
              this.onInterim(current);
            }
          };

          this.speechRecognition.onerror = (e) => {
            // Non-fatal, MediaRecorder Gemini fallback will handle transcription
            console.warn('SpeechRecognition event error (Gemini fallback ready):', e.error);
          };

          this.speechRecognition.start();
        } catch (srErr) {
          console.warn('SpeechRecognition init note:', srErr);
        }
      }

      this.isRecording = true;
      this.onStateChange(true);
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

    // Stop SpeechRecognition if active
    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch {}
    }

    // Stop tracks
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }

    // 1. If browser speech recognition already captured words, deliver immediately!
    if (this.hasBrowserTranscript && this.latestBrowserText.trim()) {
      this.onFinal(this.latestBrowserText.trim());
      return;
    }

    // 2. Otherwise, use Gemini multimodal Speech-to-Text on the recorded audio blob
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      await new Promise((resolve) => {
        this.mediaRecorder.onstop = resolve;
        try { this.mediaRecorder.stop(); } catch { resolve(); }
      });

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
            if (this.latestBrowserText.trim()) {
              this.onFinal(this.latestBrowserText.trim());
              return;
            }
            this.onError(geminiErr);
            return;
          }
        }
      }
    }

    if (!this.latestBrowserText.trim()) {
      this.onError(new Error('No speech captured. Speak closer to the microphone.'));
    }
  }

  toggle() {
    if (this.isRecording) {
      this.stop();
    } else {
      this.start();
    }
  }
}
