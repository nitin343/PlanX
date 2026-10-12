import React, { useState } from 'react';
import { 
  Flame, CheckCircle2, Circle, Clock, Swords, 
  Moon, Plus, Zap, AlertCircle, Trash2, ArrowUpRight 
} from 'lucide-react';
import { storage } from '../services/storage';

export default function TodayPage({ 
  onOpenMorningPlan, 
  onOpenNightReview, 
  onOpenFocusTimer 
}) {
  const [plan, setPlan] = useState(() => storage.getDailyPlan());
  const [tasks, setTasks] = useState(() => storage.getTasks());
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('should_do');
  const [isAdding, setIsAdding] = useState(false);

  const toggleTask = (id) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        return { 
          ...t, 
          completed: !t.completed,
          completedAt: !t.completed ? new Date().toISOString() : null,
        };
      }
      return t;
    });
    setTasks(updated);
    storage.saveTasks(updated);
  };

  const deleteTask = (id) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    storage.saveTasks(updated);
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask = {
      id: `t-${Date.now()}`,
      title: newTitle.trim(),
      priority: newPriority,
      category: 'work',
      completed: false,
      estimatedMinutes: 45,
      actualMinutes: 0,
    };

    const updated = [newTask, ...tasks];
    setTasks(updated);
    storage.saveTasks(updated);
    setNewTitle('');
    setIsAdding(false);
  };

  const mustWinTask = tasks.find(t => t.priority === 'must_win') || {
    id: 'must-win-default',
    title: plan.mustWin || 'Define your non-negotiable target',
    priority: 'must_win',
    completed: false,
    estimatedMinutes: 90,
  };

  const shouldDoTasks = tasks.filter(t => t.priority === 'should_do');
  const couldDoTasks = tasks.filter(t => t.priority === 'could_do');

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = Math.round((completedCount / Math.max(1, tasks.length)) * 100);

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* War Room Action Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button 
          className="btn btn-crimson" 
          onClick={onOpenMorningPlan}
          id="btn-open-morning-war-room"
          style={{ padding: '12px', fontSize: '13px' }}
        >
          <Swords size={16} />
          <span>Morning Plan</span>
        </button>

        <button 
          className="btn btn-secondary" 
          onClick={onOpenNightReview}
          id="btn-open-night-review"
          style={{ padding: '12px', fontSize: '13px' }}
        >
          <Moon size={16} color="#ffd000" />
          <span>Night Review</span>
        </button>
      </div>

      {/* Progress & War Banner */}
      <div className="card-glass" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Execution Completion
            </div>
            <div style={{ fontSize: '19px', fontWeight: 900, color: '#fff' }}>
              {completedCount} of {tasks.length} Missions Done
            </div>
          </div>
          <div className="mono" style={{ fontSize: '24px', fontWeight: 900, color: progressPercent >= 75 ? '#00f5a0' : 'var(--crimson-core)' }}>
            {progressPercent}%
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: '7px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
          <div 
            style={{ 
              width: `${progressPercent}%`, 
              height: '100%', 
              background: 'var(--crimson-gradient)',
              borderRadius: '4px',
              transition: 'width 0.4s ease',
            }} 
          />
        </div>
      </div>

      {/* KRATOS Motivational Directive */}
      {plan.aiMotivation && (
        <div className="coach-bubble">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span 
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--crimson-core)',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '11px', color: 'var(--crimson-core)', fontWeight: 800, textTransform: 'uppercase' }}>
              KRATOS Directive
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.5 }}>
            "{plan.aiMotivation}"
          </p>
        </div>
      )}

      {/* Must-Win Priority Target */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={15} color="#ff2a5f" />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#ff2a5f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Priority 1 — Non-Negotiable Must-Win
            </span>
          </div>
          <span className="badge badge-crimson">MANDATORY</span>
        </div>

        <div className="card-glass card-must-win" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <button 
              onClick={() => toggleTask(mustWinTask.id)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginTop: '2px' }}
            >
              {mustWinTask.completed ? (
                <CheckCircle2 size={22} color="#00f5a0" />
              ) : (
                <Circle size={22} color="var(--crimson-core)" />
              )}
            </button>

            <div style={{ flex: 1 }}>
              <div 
                style={{ 
                  fontSize: '15px', 
                  fontWeight: 700, 
                  color: mustWinTask.completed ? 'var(--text-muted)' : '#ffffff',
                  textDecoration: mustWinTask.completed ? 'line-through' : 'none',
                  lineHeight: 1.4,
                  marginBottom: '8px',
                }}
              >
                {mustWinTask.title}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} />
                  <span>{mustWinTask.estimatedMinutes || 90}m Allocated</span>
                </span>

                <button 
                  className="btn btn-crimson" 
                  style={{ padding: '6px 12px', fontSize: '11.5px', gap: '5px' }}
                  onClick={() => onOpenFocusTimer(mustWinTask.title)}
                  id="btn-engage-must-win-focus"
                >
                  <Zap size={13} />
                  <span>Engage Focus</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Should Do Objectives */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#38e1ff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Priority 2 — Should-Do Objectives
          </span>
          <span className="badge badge-cyan">HIGH VALUE</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {shouldDoTasks.length === 0 ? (
            <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              No Priority 2 objectives deployed yet. Tap "+ Add Mission Target" below.
            </div>
          ) : (
            shouldDoTasks.map((t) => (
              <div key={t.id} className="card-glass" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <button 
                      onClick={() => toggleTask(t.id)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      {t.completed ? (
                        <CheckCircle2 size={19} color="#00f5a0" />
                      ) : (
                        <Circle size={19} color="var(--text-muted)" />
                      )}
                    </button>
                    <span 
                      style={{ 
                        fontSize: '13.5px', 
                        color: t.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: t.completed ? 'line-through' : 'none',
                      }}
                    >
                      {t.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button 
                      className="btn-icon" 
                      style={{ width: '28px', height: '28px' }}
                      onClick={() => onOpenFocusTimer(t.title)}
                      title="Focus on this"
                    >
                      <Zap size={14} color="#00f2fe" />
                    </button>
                    <button 
                      className="btn-icon" 
                      style={{ width: '28px', height: '28px' }}
                      onClick={() => deleteTask(t.id)}
                    >
                      <Trash2 size={13} color="var(--text-muted)" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Could Do Bonus */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Priority 3 — Could-Do Bonus & Habits
          </span>
          <span className="badge badge-gold">BONUS XP</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {couldDoTasks.length === 0 ? (
            <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              No Priority 3 bonus tasks deployed yet.
            </div>
          ) : (
            couldDoTasks.map((t) => (
              <div key={t.id} className="card-glass" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <button 
                      onClick={() => toggleTask(t.id)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      {t.completed ? (
                        <CheckCircle2 size={19} color="#00f5a0" />
                      ) : (
                        <Circle size={19} color="var(--text-muted)" />
                      )}
                    </button>
                    <span 
                      style={{ 
                        fontSize: '13.5px', 
                        color: t.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: t.completed ? 'line-through' : 'none',
                      }}
                    >
                      {t.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button 
                      className="btn-icon" 
                      style={{ width: '28px', height: '28px' }}
                      onClick={() => onOpenFocusTimer(t.title)}
                      title="Focus on this"
                    >
                      <Zap size={14} color="#ffd000" />
                    </button>
                    <button 
                      className="btn-icon" 
                      style={{ width: '28px', height: '28px' }}
                      onClick={() => deleteTask(t.id)}
                    >
                      <Trash2 size={13} color="var(--text-muted)" />
                    </button>
                  </div>
                </div>
              </div>
            )))
          }
        </div>
      </div>

      {/* Quick Add Mission button / form */}
      {!isAdding ? (
        <button 
          className="btn btn-secondary" 
          style={{ width: '100%', borderStyle: 'dashed' }}
          onClick={() => setIsAdding(true)}
          id="btn-show-add-task"
        >
          <Plus size={16} />
          <span>Add Tactical Mission</span>
        </button>
      ) : (
        <form onSubmit={handleAddTask} className="card-glass" style={{ padding: '14px' }}>
          <input 
            type="text"
            className="input-field"
            placeholder="Mission objective..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
            style={{ marginBottom: '10px' }}
          />
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {['must_win', 'should_do', 'could_do'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setNewPriority(p)}
                className={`btn ${newPriority === p ? 'btn-crimson' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '6px', fontSize: '11px', textTransform: 'uppercase' }}
              >
                {p.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ flex: 1 }} 
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-crimson" 
              style={{ flex: 1 }}
              id="btn-confirm-add-task"
            >
              Add Mission
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
