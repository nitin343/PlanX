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
  const mimeType = audioBlob.type?.split(';')[0] || 'audio/webm';
  const modelName = settings.preferredModel || 'gemini-2.5-flash';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

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
            text: 'Transcribe this voice speech verbatim into clear, natural text with correct spelling and punctuation. If technical coding terms like PyTorch, LeetCode, Transformers, or JavaScript are mentioned, transcribe them accurately. Output ONLY the transcribed text. Do NOT add preamble, quotes, explanations, or formatting.',
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 500,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini audio transcription failed (${response.status})`);
  }

  const data = await response.json();
  const transcript = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  
  if (!transcript) {
    throw new Error('No speech detected in audio.');
  }

  storage.incrementAiMetrics(150, false);
  return transcript;
}

/**
 * Manages hybrid voice dictation:
 * 1. Attempts instant live browser SpeechRecognition (zero latency stream)
 * 2. Simultaneously captures MediaRecorder audio stream
 * 3. If SpeechRecognition fails or is unsupported (e.g. Firefox/PWA constraints),
 *    sends audio to Gemini multimodal STT for state-of-the-art transcription.
 */
export class VoiceTranscriber {
  constructor({ onInterim, onFinal, onError, onStateChange }) {
    this.onInterim = onInterim || (() => {});
    this.onFinal = onFinal || (() => {});
    this.onError = onError || (() => {});
    this.onStateChange = onStateChange || (() => {});

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

    // If browser speech recognition already captured words, deliver immediately!
    if (this.hasBrowserTranscript && this.latestBrowserText.trim()) {
      this.onFinal(this.latestBrowserText.trim());
      return;
    }

    // Otherwise, use Gemini multimodal Speech-to-Text on the recorded audio blob
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      await new Promise((resolve) => {
        this.mediaRecorder.onstop = resolve;
        this.mediaRecorder.stop();
      });

      if (this.audioChunks.length > 0) {
        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType || 'audio/webm' });
        if (audioBlob.size > 2000) {
          try {
            this.onInterim('Transcribing speech with Gemini AI...');
            const geminiTranscript = await transcribeWithGemini(audioBlob);
            this.onFinal(geminiTranscript);
            return;
          } catch (geminiErr) {
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
