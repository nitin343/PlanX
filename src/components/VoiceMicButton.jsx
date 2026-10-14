import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { VoiceTranscriber } from '../services/voice';

export default function VoiceMicButton({
  onTranscript,
  size = 18,
  className = '',
  style = {},
  title = 'Voice Typing (Speak to KRATOS)',
  id = 'btn-voice-mic',
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorToast, setErrorToast] = useState(null);
  const transcriberRef = useRef(null);

  useEffect(() => {
    transcriberRef.current = new VoiceTranscriber({
      onInterim: (text) => {
        if (onTranscript && text) {
          onTranscript(text, false);
        }
      },
      onFinal: (text) => {
        setIsTranscribing(false);
        if (onTranscript && text) {
          onTranscript(text, true);
        }
      },
      onProcessing: (processing) => {
        setIsTranscribing(processing);
      },
      onStateChange: (active) => {
        setIsRecording(active);
        if (!active) {
          setIsTranscribing(false);
        }
      },
      onError: (err) => {
        setIsTranscribing(false);
        setIsRecording(false);
        setErrorToast(err.message || 'Voice recognition error');
        setTimeout(() => setErrorToast(null), 3500);
      },
    });

    return () => {
      if (transcriberRef.current) {
        transcriberRef.current.stop();
      }
    };
  }, [onTranscript]);

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!transcriberRef.current) return;

    if (isRecording) {
      setIsTranscribing(true);
      transcriberRef.current.stop();
    } else {
      setErrorToast(null);
      transcriberRef.current.start();
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        id={id}
        onClick={handleToggle}
        className={`btn-icon ${className}`}
        title={isRecording ? 'Tap to finish voice input' : title}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: isRecording ? '1.5px solid #ff2a5f' : '1px solid rgba(255, 255, 255, 0.15)',
          background: isRecording 
            ? 'radial-gradient(circle, rgba(255, 42, 95, 0.35) 0%, rgba(13, 17, 26, 0.95) 100%)' 
            : 'rgba(255, 255, 255, 0.05)',
          boxShadow: isRecording ? '0 0 16px rgba(255, 42, 95, 0.6), inset 0 0 8px rgba(255, 42, 95, 0.3)' : 'none',
          color: isRecording ? '#ff2a5f' : 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          flexShrink: 0,
          ...style,
        }}
      >
        {isTranscribing ? (
          <Loader2 size={size} className="pulse-crimson" style={{ animation: 'spin 1s linear infinite' }} />
        ) : isRecording ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <span 
              style={{
                position: 'absolute',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1.5px solid #ff2a5f',
                animation: 'pulse 1.2s infinite ease-out',
                opacity: 0.7,
              }}
            />
            <Square size={size - 4} fill="#ff2a5f" color="#ff2a5f" />
          </div>
        ) : (
          <Mic size={size} />
        )}
      </button>

      {/* Floating Listening Indicator Banner */}
      {isRecording && (
        <div
          style={{
            position: 'absolute',
            bottom: '46px',
            right: '0',
            background: 'rgba(10, 14, 24, 0.95)',
            border: '1px solid rgba(255, 42, 95, 0.5)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
            borderRadius: '20px',
            padding: '5px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 800,
            color: '#fff',
            whiteSpace: 'nowrap',
            zIndex: 100,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <span 
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#ff2a5f',
              boxShadow: '0 0 8px #ff2a5f',
              display: 'inline-block',
            }}
          />
          <span style={{ color: '#ff2a5f' }}>Listening...</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tap to finish</span>
        </div>
      )}

      {/* Floating Transcribing Indicator Banner */}
      {isTranscribing && (
        <div
          style={{
            position: 'absolute',
            bottom: '46px',
            right: '0',
            background: 'rgba(10, 14, 24, 0.95)',
            border: '1px solid rgba(0, 242, 254, 0.5)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
            borderRadius: '20px',
            padding: '5px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 800,
            color: '#fff',
            whiteSpace: 'nowrap',
            zIndex: 100,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <Loader2 size={12} style={{ color: '#00f2fe', animation: 'spin 1s linear infinite' }} />
          <span style={{ color: '#00f2fe' }}>Transcribing speech...</span>
        </div>
      )}

      {/* Error Toast Notification */}
      {errorToast && (
        <div
          style={{
            position: 'absolute',
            bottom: '46px',
            right: '0',
            background: 'rgba(239, 68, 68, 0.95)',
            color: '#fff',
            borderRadius: '10px',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <AlertCircle size={13} />
          <span>{errorToast}</span>
        </div>
      )}
    </div>
  );
}
