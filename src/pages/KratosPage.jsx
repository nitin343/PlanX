import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, AlertCircle, Shield, RotateCcw, Zap, Bell, Volume2 } from 'lucide-react';
import { chatWithKratos } from '../services/ai';
import { storage } from '../services/storage';
import { previewAlarmTone } from '../services/alarms';

function renderInlineFormatting(text) {
  if (!text) return null;
  const parts = [];
  let lastIndex = 0;
  // Match bold **text**, italic *text*, code `text`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    if (match[2] !== undefined) {
      // Bold
      parts.push(
        <strong key={`b-${key++}`} style={{ color: '#ffffff', fontWeight: 800 }}>
          {match[2]}
        </strong>
      );
    } else if (match[3] !== undefined) {
      // Italic
      parts.push(
        <em key={`i-${key++}`} style={{ color: '#cbd5e1', fontStyle: 'italic' }}>
          {match[3]}
        </em>
      );
    } else if (match[4] !== undefined) {
      // Inline code
      parts.push(
        <code key={`c-${key++}`} style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#00f2fe', padding: '1px 5px', borderRadius: '4px', fontSize: '12px' }}>
          {match[4]}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function FormattedKratosMessage({ content }) {
  if (!content) return null;
  const lines = content.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = (keyPrefix) => {
    if (currentList.length > 0) {
      elements.push(
        <div key={`${keyPrefix}-list`} style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0' }}>
          {currentList.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#00f5a0', fontSize: '8px', marginTop: '6px', flexShrink: 0 }}>◆</span>
              <div style={{ flex: 1, lineHeight: '1.55', color: '#f1f5f9' }}>
                {renderInlineFormatting(item)}
              </div>
            </div>
          ))}
        </div>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    // Check if line is a bullet item starting with •, -, *, or number like 1.
    const bulletMatch = trimmed.match(/^([•\-\*]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      currentList.push(bulletMatch[2]);
    } else {
      flushList(idx);
      if (trimmed === '') {
        elements.push(<div key={`sp-${idx}`} style={{ height: '6px' }} />);
      } else {
        elements.push(
          <div key={`p-${idx}`} style={{ lineHeight: '1.55', margin: '2px 0', color: '#f8fafc' }}>
            {renderInlineFormatting(trimmed)}
          </div>
        );
      }
    }
  });

  flushList('end');

  return <div>{elements}</div>;
}

export default function KratosPage() {
  const [messages, setMessages] = useState(() => storage.getChatHistory());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState(() => storage.getAiMetrics());
  const messagesEndRef = useRef(null);
  const aiSettings = storage.getAiSettings();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend) => {
    const text = typeof textToSend === 'string' ? textToSend : input;
    if (!text.trim() || isLoading) return;

    const userMsg = {
      id: `usr-${Date.now()}`,
      role: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: text.trim(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    storage.saveChatHistory(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithKratos(text.trim());
      const assistantMsg = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: response.content,
        alarmData: response.alarmData,
      };
      const finalMessages = [...nextMessages, assistantMsg];
      setMessages(finalMessages);
      storage.saveChatHistory(finalMessages);
      setMetrics(storage.getAiMetrics());
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `⚠️ Tactical Alert: ${err.message || 'Connection interrupted. Check API key in Config.'}`,
      };
      setMessages([...nextMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    const initial = [
      {
        id: 'msg-init',
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `KRATOS online. Stand by for tactical commands. What is your objective?`,
      },
    ];
    setMessages(initial);
    storage.saveChatHistory(initial);
  };

  const quickCommands = [
    'set alaram at 2 am to sleep and sleep for 6 hours',
    'wake me up at 6:00 AM with Indian flute',
    'Evaluate my excuses & test my resolve',
    'Plan my next 2 hours of laser focus',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 145px)' }}>
      {/* Top AI Metrics Bar */}
      <div 
        style={{
          padding: '10px 16px',
          background: 'rgba(13, 17, 26, 0.7)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-crimson" style={{ fontSize: '10px' }}>
            CAP: ${metrics.estimatedCostUsd.toFixed(4)} / ${aiSettings.spendingCapDollars.toFixed(2)}
          </span>
          <span className="mono" style={{ color: 'var(--text-muted)' }}>
            Tokens: {metrics.tokensToday.toLocaleString()}
          </span>
        </div>

        <button 
          onClick={clearChat}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
          title="Clear Chat"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      </div>

      {/* Missing API Key Warning */}
      {!aiSettings.geminiKey && (
        <div style={{ padding: '8px 16px', background: 'rgba(255, 208, 0, 0.12)', borderBottom: '1px solid rgba(255, 208, 0, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#ffd000' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} />
            <span>No personal Gemini key configured. Add your key in Settings.</span>
          </div>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'underline', fontWeight: 700 }}>
            Get Key ↗
          </a>
        </div>
      )}

      {/* Messages Stream */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div 
              key={m.id}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px', padding: '0 4px' }}>
                {isUser ? 'You' : 'KRATOS'} • {m.timestamp}
              </div>

              <div 
                className={isUser ? 'card-glass' : 'coach-bubble'}
                style={{
                  padding: '12px 14px',
                  background: isUser ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.15) 0%, rgba(13, 17, 26, 0.95) 100%)' : undefined,
                  borderColor: isUser ? 'rgba(0, 242, 254, 0.3)' : undefined,
                }}
              >
                <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: '#f8fafc' }}>
                  {isUser ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  ) : (
                    <FormattedKratosMessage content={m.content} />
                  )}
                </div>

                {/* Interactive Alarm Confirmation Card */}
                {m.alarmData && (
                  <div 
                    style={{ 
                      marginTop: '10px', 
                      padding: '10px 12px', 
                      background: 'rgba(0, 245, 160, 0.08)', 
                      border: '1px solid rgba(0, 245, 160, 0.35)', 
                      borderRadius: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: '#00f5a0' }}>
                        <Bell size={13} />
                        <span>ALARMS CALIBRATED & SAVED</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => previewAlarmTone('bansuri-morning', 0.8)}
                        className="badge badge-emerald"
                        style={{ cursor: 'pointer', padding: '3px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Preview alarm flute"
                      >
                        <Volume2 size={11} />
                        <span>Test Tone</span>
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {m.alarmData.sleepAlarm && (
                        <span className="badge badge-gold" style={{ fontSize: '10.5px', padding: '4px 8px' }}>
                          🌙 Sleep: {m.alarmData.sleepAlarm}
                        </span>
                      )}
                      {m.alarmData.wakeAlarm && (
                        <span className="badge badge-emerald" style={{ fontSize: '10.5px', padding: '4px 8px' }}>
                          🌅 Wake Up: {m.alarmData.wakeAlarm}
                        </span>
                      )}
                      {m.alarmData.customAlarm && (
                        <span className="badge badge-cyan" style={{ fontSize: '10.5px', padding: '4px 8px' }}>
                          ⏰ Checkpoint: {m.alarmData.customAlarm}
                        </span>
                      )}
                      {m.alarmData.duration && (
                        <span className="badge badge-crimson" style={{ fontSize: '10.5px', padding: '4px 8px' }}>
                          ⏱️ {m.alarmData.duration} Recovery
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}>
            <span 
              className="pulse-crimson" 
              style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--crimson-core)', display: 'inline-block' }} 
            />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              KRATOS formulating battle strategy...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Tactical Command Pills */}
      <div 
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          padding: '8px 16px',
          background: 'rgba(7, 9, 14, 0.6)',
          scrollbarWidth: 'none',
        }}
      >
        {quickCommands.map((cmd, idx) => (
          <button
            key={idx}
            className="btn btn-secondary"
            onClick={() => handleSend(cmd)}
            style={{ 
              whiteSpace: 'nowrap', 
              fontSize: '11px', 
              padding: '5px 10px', 
              borderRadius: '16px',
              flexShrink: 0,
            }}
          >
            <Zap size={11} color="var(--crimson-core)" />
            <span>{cmd}</span>
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        style={{
          padding: '12px 16px',
          background: 'rgba(10, 14, 22, 0.95)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '8px',
        }}
      >
        <input
          type="text"
          className="input-field"
          placeholder="Speak to KRATOS..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          id="input-kratos-chat"
        />
        <button 
          type="submit" 
          className="btn btn-crimson"
          disabled={isLoading || !input.trim()}
          style={{ width: '44px', height: '44px', padding: 0 }}
          id="btn-send-kratos-chat"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
