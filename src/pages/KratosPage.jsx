import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, AlertCircle, Shield, RotateCcw, Zap, Bell, Volume2, ArrowUpRight, Target, CheckCircle2, BookOpen } from 'lucide-react';
import { chatWithKratos } from '../services/ai';
import { storage } from '../services/storage';
import { previewAlarmTone } from '../services/alarms';
import VoiceMicButton from '../components/VoiceMicButton';

function renderInlineFormatting(text) {
  if (!text) return null;
  const parts = [];
  let lastIndex = 0;
  // Match:
  // 1. ***bold italic*** or ___bold italic___
  // 2. **bold** or __bold__
  // 3. *italic* or _italic_
  // 4. `code`
  const regex = /(\*\*\*(.+?)\*\*\*|___(.+?)___|\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_|`(.+?)`)/g;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    if (match[2] !== undefined || match[3] !== undefined) {
      // Bold + Italic
      const val = match[2] || match[3];
      parts.push(
        <strong key={`bi-${key++}`} style={{ color: '#ffffff', fontWeight: 800, fontStyle: 'italic' }}>
          {val}
        </strong>
      );
    } else if (match[4] !== undefined || match[5] !== undefined) {
      // Bold
      const val = match[4] || match[5];
      parts.push(
        <strong key={`b-${key++}`} style={{ color: '#ffffff', fontWeight: 800 }}>
          {val}
        </strong>
      );
    } else if (match[6] !== undefined || match[7] !== undefined) {
      // Italic
      const val = match[6] || match[7];
      parts.push(
        <em key={`i-${key++}`} style={{ color: '#cbd5e1', fontStyle: 'italic' }}>
          {val}
        </em>
      );
    } else if (match[8] !== undefined) {
      // Inline code
      parts.push(
        <code key={`c-${key++}`} style={{ background: 'rgba(0, 242, 254, 0.12)', color: '#00f2fe', padding: '1px 6px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}>
          {match[8]}
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

function CodeBlockItem({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div 
      style={{
        margin: '10px 0',
        borderRadius: '8px',
        background: '#070b14',
        border: '1px solid rgba(0, 242, 254, 0.25)',
        overflow: 'hidden',
        fontSize: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      }}
    >
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '5px 12px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#00f2fe',
        }}
      >
        <span>{lang ? lang.toUpperCase() : 'SNIPPET'}</span>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            background: 'none',
            border: 'none',
            color: copied ? '#00f5a0' : 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '10.5px',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre 
        style={{
          margin: 0,
          padding: '10px 12px',
          overflowX: 'auto',
          color: '#e2e8f0',
          fontFamily: 'Consolas, Monaco, monospace',
          lineHeight: 1.5,
          fontSize: '12px',
        }}
      >
        {code}
      </pre>
    </div>
  );
}

function FormattedKratosMessage({ content }) {
  if (!content) return null;

  // Safe-guard: Check if content is a JSON object with dailyPlan or mustWin
  const trimmedAll = content.trim();
  if (trimmedAll.startsWith('{') && trimmedAll.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmedAll);
      if (parsed.mustWin || parsed.dailyPlan) {
        const plan = parsed.dailyPlan || parsed;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#ff0055', letterSpacing: '0.04em' }}>
              ⚔️ KRATOS DAY BATTLE PLAN
            </div>
            {plan.motivation && (
              <div style={{ fontStyle: 'italic', color: '#cbd5e1', borderLeft: '2px solid #ff0055', paddingLeft: '8px', fontSize: '12px' }}>
                "{plan.motivation}"
              </div>
            )}
            <div style={{ padding: '8px 10px', background: 'rgba(255, 0, 85, 0.12)', borderRadius: '6px', border: '1px solid rgba(255, 0, 85, 0.3)' }}>
              <div style={{ fontSize: '10.5px', color: '#ff4d79', fontWeight: 800 }}>MUST-WIN OBJECTIVE</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{plan.mustWin}</div>
            </div>
            {Array.isArray(plan.shouldDo) && plan.shouldDo.length > 0 && (
              <div>
                <div style={{ fontSize: '10.5px', color: '#00f2fe', fontWeight: 800, marginBottom: '4px' }}>CORE PRIORITIES</div>
                {plan.shouldDo.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#e2e8f0', margin: '2px 0' }}>
                    <span style={{ color: '#00f2fe' }}>◆</span> {s}
                  </div>
                ))}
              </div>
            )}
            {Array.isArray(plan.couldDo) && plan.couldDo.length > 0 && (
              <div>
                <div style={{ fontSize: '10.5px', color: '#00f5a0', fontWeight: 800, marginBottom: '4px' }}>BONUS TARGETS</div>
                {plan.couldDo.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1', margin: '2px 0' }}>
                    <span style={{ color: '#00f5a0' }}>◆</span> {c}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
    } catch (e) {
      // Continue to markdown rendering
    }
  }

  const rawLines = content.split('\n');
  const elements = [];
  let currentList = [];
  let inCode = false;
  let codeLang = '';
  let codeBuffer = [];

  const flushList = (keyPrefix) => {
    if (currentList.length > 0) {
      elements.push(
        <div key={`${keyPrefix}-list`} style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0' }}>
          {currentList.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              {item.type === 'ordered' ? (
                <span 
                  style={{
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'rgba(0, 242, 254, 0.15)',
                    border: '1px solid rgba(0, 242, 254, 0.4)',
                    color: '#00f2fe',
                    fontSize: '10px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '2px',
                    flexShrink: 0,
                  }}
                >
                  {item.num}
                </span>
              ) : (
                <span style={{ color: '#00f5a0', fontSize: '9px', marginTop: '6px', flexShrink: 0 }}>
                  ◆
                </span>
              )}
              <div style={{ flex: 1, lineHeight: '1.6', color: '#f1f5f9' }}>
                {renderInlineFormatting(item.text)}
              </div>
            </div>
          ))}
        </div>
      );
      currentList = [];
    }
  };

  rawLines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Check code block fence
    if (trimmed.startsWith('```')) {
      flushList(idx);
      if (inCode) {
        // Closing code fence
        elements.push(
          <CodeBlockItem 
            key={`code-${idx}`} 
            lang={codeLang} 
            code={codeBuffer.join('\n')} 
          />
        );
        inCode = false;
        codeLang = '';
        codeBuffer = [];
      } else {
        // Opening code fence
        inCode = true;
        codeLang = trimmed.substring(3).trim();
        codeBuffer = [];
      }
      return;
    }

    if (inCode) {
      codeBuffer.push(line);
      return;
    }

    // Horizontal Rule / Divider (***, ---, ___)
    if (/^[\*\-_]{3,}$/.test(trimmed)) {
      flushList(idx);
      elements.push(
        <div 
          key={`hr-${idx}`} 
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
            margin: '12px 0',
          }} 
        />
      );
      return;
    }

    // Headings
    if (trimmed.startsWith('#')) {
      flushList(idx);
      if (trimmed.startsWith('###')) {
        elements.push(
          <div 
            key={`h3-${idx}`} 
            style={{
              fontSize: '13.5px',
              fontWeight: 800,
              color: '#00f5a0',
              margin: '10px 0 4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.02em',
            }}
          >
            <span style={{ fontSize: '10px' }}>▲</span>
            <span>{renderInlineFormatting(trimmed.replace(/^###+\s*/, ''))}</span>
          </div>
        );
      } else if (trimmed.startsWith('##')) {
        elements.push(
          <div 
            key={`h2-${idx}`} 
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: '#ffffff',
              margin: '12px 0 6px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ color: '#00f2fe' }}>■</span>
            <span>{renderInlineFormatting(trimmed.replace(/^##\s*/, ''))}</span>
          </div>
        );
      } else {
        elements.push(
          <div 
            key={`h1-${idx}`} 
            style={{
              fontSize: '16.5px',
              fontWeight: 900,
              color: '#ffffff',
              margin: '14px 0 6px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ color: '#ff0055' }}>▌</span>
            <span>{renderInlineFormatting(trimmed.replace(/^#\s*/, ''))}</span>
          </div>
        );
      }
      return;
    }

    // Blockquote (> Directive)
    if (trimmed.startsWith('>')) {
      flushList(idx);
      elements.push(
        <div 
          key={`bq-${idx}`} 
          style={{
            margin: '8px 0',
            padding: '8px 12px',
            background: 'rgba(255, 0, 85, 0.08)',
            borderLeft: '3px solid #ff0055',
            borderRadius: '0 8px 8px 0',
            fontStyle: 'italic',
            color: '#e2e8f0',
            fontSize: '13px',
            lineHeight: 1.5,
          }}
        >
          {renderInlineFormatting(trimmed.replace(/^>\s*/, ''))}
        </div>
      );
      return;
    }

    // Ordered List (1. Item, 2) Item)
    const orderedMatch = trimmed.match(/^(\d+)[\.\)]\s+(.+)$/);
    if (orderedMatch) {
      currentList.push({
        type: 'ordered',
        num: orderedMatch[1],
        text: orderedMatch[2],
      });
      return;
    }

    // Bullet List (•, -, *, +)
    const bulletMatch = trimmed.match(/^([•\-\*\+])\s+(.+)$/);
    if (bulletMatch) {
      currentList.push({
        type: 'bullet',
        text: bulletMatch[2],
      });
      return;
    }

    // Standard text or empty space
    flushList(idx);
    if (trimmed === '') {
      elements.push(<div key={`sp-${idx}`} style={{ height: '6px' }} />);
    } else {
      elements.push(
        <div key={`p-${idx}`} style={{ lineHeight: '1.6', margin: '3px 0', color: '#f8fafc' }}>
          {renderInlineFormatting(trimmed)}
        </div>
      );
    }
  });

  // Flush any remaining list or code
  flushList('end');
  if (inCode && codeBuffer.length > 0) {
    elements.push(
      <CodeBlockItem 
        key="code-end" 
        lang={codeLang} 
        code={codeBuffer.join('\n')} 
      />
    );
  }

  return <div>{elements}</div>;
}

export default function KratosPage({ onNavigateTab, onRefresh }) {
  const [messages, setMessages] = useState(() => storage.getChatHistory());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState(() => storage.getAiMetrics());
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const aiSettings = storage.getAiSettings();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(Math.max(scrollHeight, 46), 130) + 'px';
    }
  }, [input]);

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
        executedActions: response.executedActions,
      };
      const finalMessages = [...nextMessages, assistantMsg];
      setMessages(finalMessages);
      storage.saveChatHistory(finalMessages);
      setMetrics(storage.getAiMetrics());
      if (onRefresh && response.executedActions) {
        onRefresh();
      }
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
    'Frontend with 5y exp: build AI Engineer roadmap, flashcards & day plan',
    'Plan my day with 1 Must-Win, 2 Should-Do, and 2 Could-Do bonus tasks',
    'set alaram at 2 am to sleep and sleep for 6 hours',
    'wake me up at 6:00 AM with Indian flute',
    'Evaluate my excuses & test my resolve',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 58px - var(--bottom-bar-height, 72px) - env(safe-area-inset-bottom, 0px))' }}>
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

                {/* Interactive Tactical Ops Execution Receipt */}
                {m.executedActions && (
                  <div 
                    style={{ 
                      marginTop: '12px', 
                      padding: '12px 14px', 
                      background: 'rgba(10, 16, 28, 0.95)', 
                      border: '1px solid rgba(0, 245, 160, 0.45)', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 900, color: '#00f5a0', letterSpacing: '0.04em' }}>
                        <Shield size={14} />
                        <span>WAR ROOM COMMANDS EXECUTED</span>
                      </div>
                      <span className="badge badge-emerald" style={{ fontSize: '9px', padding: '2px 6px' }}>SYNCED TO APP</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Strategic Roadmap */}
                      {m.executedActions.goal && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '15px' }}>🎯</span>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>
                                Roadmap: {m.executedActions.goal.title}
                              </div>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                {m.executedActions.goal.dayTotal}-Day Sprint forged in Goals Page
                              </div>
                            </div>
                          </div>
                          {onNavigateTab && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab('goals')}
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '10.5px', gap: '4px', whiteSpace: 'nowrap' }}
                            >
                              <span>View Goals</span>
                              <ArrowUpRight size={12} />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Daily Battle Plan & Interactive Tasks */}
                      {(m.executedActions.dailyPlan || m.executedActions.tasks) && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '15px' }}>⚔️</span>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>
                                Day Battle Plan & Interactive Tasks
                              </div>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                Must-Win + Should-Do + Could-Do deployed to Today Page
                              </div>
                            </div>
                          </div>
                          {onNavigateTab && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab('today')}
                              className="btn btn-crimson"
                              style={{ padding: '4px 10px', fontSize: '10.5px', gap: '4px', whiteSpace: 'nowrap' }}
                            >
                              <span>Inspect Today</span>
                              <ArrowUpRight size={12} />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Skill Flashcards */}
                      {m.executedActions.skillCards && m.executedActions.skillCards.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '15px' }}>🧠</span>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>
                                {m.executedActions.skillCards.length} Skill Memory Flashcards
                              </div>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                Active recall & code drills forged in Learn Page
                              </div>
                            </div>
                          </div>
                          {onNavigateTab && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab('learn')}
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '10.5px', gap: '4px', borderColor: '#00f5a0', color: '#00f5a0', whiteSpace: 'nowrap' }}
                            >
                              <span>Drill Skills</span>
                              <ArrowUpRight size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

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

      {/* Input Box with Voice & Type */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        style={{
          padding: '12px 14px',
          background: 'rgba(10, 14, 22, 0.98)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '8px',
        }}
      >
        <textarea
          ref={textareaRef}
          className="input-field"
          rows={1}
          placeholder="Speak to KRATOS or type command... (Enter sends, Shift+Enter for newline)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isLoading}
          id="input-kratos-chat"
          style={{ 
            flex: 1,
            minHeight: '46px',
            maxHeight: '130px',
            resize: 'none',
            fontSize: '14.5px',
            lineHeight: '1.45',
            padding: '11px 14px',
            borderRadius: '16px',
            background: 'rgba(18, 24, 38, 0.9)',
          }}
        />
        
        {/* ChatGPT-style Voice Dictation Mic Button */}
        <VoiceMicButton
          onTranscript={(transcribedText, isFinal) => {
            setInput((prev) => {
              if (isFinal) {
                return prev && !prev.includes(transcribedText) ? `${prev} ${transcribedText}`.trim() : transcribedText;
              }
              return transcribedText;
            });
          }}
          size={18}
          id="btn-voice-kratos-chat"
          style={{ width: '42px', height: '42px', marginBottom: '2px' }}
        />

        <button 
          type="submit" 
          className="btn btn-crimson"
          disabled={isLoading || !input.trim()}
          style={{ 
            width: '42px', 
            height: '42px', 
            padding: 0, 
            borderRadius: '50%', 
            flexShrink: 0,
            marginBottom: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          id="btn-send-kratos-chat"
          title="Send Command"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
