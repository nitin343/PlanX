import React, { useState } from 'react';
import { 
  Target, Flame, CheckCircle2, Circle, Plus, Trophy, 
  Calendar, Sparkles, Edit2, Trash2, X, ChevronDown, 
  ChevronUp, ShieldCheck, Zap 
} from 'lucide-react';
import { storage } from '../services/storage';
import { forgeStrategicSprint } from '../services/ai';
import VoiceMicButton from '../components/VoiceMicButton';

export default function GoalsPage() {
  const [goals, setGoals] = useState(() => storage.getGoals());
  const [habits, setHabits] = useState(() => storage.getHabits());
  
  // Modals / forms
  const [isAiForgeOpen, setIsAiForgeOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [expandedGoalId, setExpandedGoalId] = useState(null);

  // AI Forge Form State
  const [ambitionInput, setAmbitionInput] = useState('');
  const [aiDuration, setAiDuration] = useState(21);
  const [isForging, setIsForging] = useState(false);
  const [forgedResult, setForgedResult] = useState(null);

  // Manual / Edit Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDaysTotal, setFormDaysTotal] = useState(21);
  const [formDayCurrent, setFormDayCurrent] = useState(1);
  const [formCategory, setFormCategory] = useState('discipline');

  // Habit Form State
  const [newHabitName, setNewHabitName] = useState('');
  const [isAddingHabit, setIsAddingHabit] = useState(false);

  const saveUpdatedGoals = (updated) => {
    setGoals(updated);
    storage.saveGoals(updated);
  };

  // --- SPRINT ACTIONS ---
  const handleAdvanceDay = (id) => {
    const updated = goals.map((g) => {
      if (g.id === id) {
        const nextDay = Math.min(g.dayTotal, g.dayCurrent + 1);
        return { ...g, dayCurrent: nextDay };
      }
      return g;
    });
    saveUpdatedGoals(updated);
  };

  const handleDeleteGoal = (id) => {
    if (confirm('Are you sure you want to retire this Strategic Sprint?')) {
      const updated = goals.filter((g) => g.id !== id);
      saveUpdatedGoals(updated);
    }
  };

  const handleOpenEdit = (goal) => {
    setEditingGoal(goal);
    setFormTitle(goal.title);
    setFormDescription(goal.description);
    setFormDaysTotal(goal.dayTotal);
    setFormDayCurrent(goal.dayCurrent);
    setFormCategory(goal.category || 'discipline');
    setIsManualModalOpen(true);
  };

  const handleOpenNewManual = () => {
    setEditingGoal(null);
    setFormTitle('');
    setFormDescription('');
    setFormDaysTotal(21);
    setFormDayCurrent(1);
    setFormCategory('discipline');
    setIsManualModalOpen(true);
  };

  const handleSaveManualGoal = (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingGoal) {
      const updated = goals.map((g) => {
        if (g.id === editingGoal.id) {
          return {
            ...g,
            title: formTitle.trim(),
            description: formDescription.trim(),
            dayTotal: parseInt(formDaysTotal, 10) || 21,
            dayCurrent: parseInt(formDayCurrent, 10) || 1,
            category: formCategory,
            durationType: `${formDaysTotal}_day`,
          };
        }
        return g;
      });
      saveUpdatedGoals(updated);
    } else {
      const newGoal = {
        id: `g-${Date.now()}`,
        title: formTitle.trim(),
        description: formDescription.trim(),
        dayTotal: parseInt(formDaysTotal, 10) || 21,
        dayCurrent: parseInt(formDayCurrent, 10) || 1,
        startDate: new Date().toISOString().split('T')[0],
        status: 'active',
        category: formCategory,
        durationType: `${formDaysTotal}_day`,
      };
      saveUpdatedGoals([newGoal, ...goals]);
    }

    setIsManualModalOpen(false);
  };

  // --- AI FORGE ACTIONS ---
  const handleRunAiForge = async () => {
    if (!ambitionInput.trim()) return;
    setIsForging(true);
    setForgedResult(null);

    try {
      const result = await forgeStrategicSprint(ambitionInput.trim(), aiDuration);
      setForgedResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsForging(false);
    }
  };

  const handleCommitAiSprint = () => {
    if (!forgedResult) return;

    const newSprint = {
      id: `g-${Date.now()}`,
      title: forgedResult.title,
      description: forgedResult.description,
      dayTotal: forgedResult.durationDays || aiDuration,
      dayCurrent: 1,
      startDate: new Date().toISOString().split('T')[0],
      status: 'active',
      category: forgedResult.category || 'discipline',
      durationType: `${forgedResult.durationDays || aiDuration}_day`,
      milestones: forgedResult.milestones || [],
      doctrine: forgedResult.doctrine || '',
    };

    saveUpdatedGoals([newSprint, ...goals]);
    setIsAiForgeOpen(false);
    setForgedResult(null);
    setAmbitionInput('');
  };

  // --- HABIT ACTIONS ---
  const toggleHabit = (id) => {
    const updated = habits.map((h) => {
      if (h.id === id) {
        const nextCompleted = !h.completedToday;
        return {
          ...h,
          completedToday: nextCompleted,
          streak: nextCompleted ? h.streak + 1 : Math.max(0, h.streak - 1),
        };
      }
      return h;
    });
    setHabits(updated);
    storage.saveHabits(updated);
  };

  const handleAddHabit = (e) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newH = {
      id: `h-${Date.now()}`,
      name: newHabitName.trim(),
      streak: 0,
      completedToday: false,
    };
    const updated = [...habits, newH];
    setHabits(updated);
    storage.saveHabits(updated);
    setNewHabitName('');
    setIsAddingHabit(false);
  };

  // Active View Mode: 'habits' | 'sprints' | 'all'
  const [activeSection, setActiveSection] = useState(() => {
    return localStorage.getItem('planx_sprints_tab_mode') || 'habits';
  });

  const handleSelectSection = (mode) => {
    setActiveSection(mode);
    localStorage.setItem('planx_sprints_tab_mode', mode);
  };

  const completedHabitsCount = habits.filter(h => h.completedToday).length;

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Header & Segmented Switcher */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>
              {activeSection === 'habits' ? 'Daily Non-Negotiable Habits' : activeSection === 'sprints' ? 'Strategic Sprints' : 'Sprints & Habits'}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {activeSection === 'habits' ? 'Zero-excuse daily discipline tracking' : '21-Day & 90-Day transformation campaigns'}
            </p>
          </div>
          <div className="badge badge-gold" style={{ padding: '6px 10px' }}>
            <Flame size={13} fill="#ffd000" color="#ffd000" />
            <span>{completedHabitsCount}/{habits.length} HABITS</span>
          </div>
        </div>

        {/* Sleek Segmented Switcher Bar */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr 0.8fr',
            gap: '6px',
            background: 'rgba(13, 17, 26, 0.9)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            onClick={() => handleSelectSection('habits')}
            className={`btn ${activeSection === 'habits' ? 'btn-crimson' : 'btn-secondary'}`}
            style={{ padding: '8px 10px', fontSize: '11.5px', border: 'none', borderRadius: '8px' }}
            id="tab-toggle-habits"
          >
            <Flame size={13} fill={activeSection === 'habits' ? '#ffd000' : 'none'} color="#ffd000" />
            <span>Habits ({completedHabitsCount}/{habits.length})</span>
          </button>

          <button
            onClick={() => handleSelectSection('sprints')}
            className={`btn ${activeSection === 'sprints' ? 'btn-crimson' : 'btn-secondary'}`}
            style={{ padding: '8px 10px', fontSize: '11.5px', border: 'none', borderRadius: '8px' }}
            id="tab-toggle-sprints"
          >
            <Target size={13} />
            <span>Sprints ({goals.length})</span>
          </button>

          <button
            onClick={() => handleSelectSection('all')}
            className={`btn ${activeSection === 'all' ? 'btn-crimson' : 'btn-secondary'}`}
            style={{ padding: '8px 8px', fontSize: '11.5px', border: 'none', borderRadius: '8px' }}
            id="tab-toggle-all"
          >
            <span>All</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          SECTION 1: DAILY NON-NEGOTIABLE HABITS
          ======================================================== */}
      {(activeSection === 'habits' || activeSection === 'all') && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={16} color="#ffd000" fill="#ffd000" />
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>Daily Execution Checklist</h3>
            </div>
            <button 
              className="btn-icon" 
              onClick={() => setIsAddingHabit(true)}
              title="Add Habit"
              id="btn-show-add-habit"
            >
              <Plus size={16} />
            </button>
          </div>

          {isAddingHabit && (
            <form onSubmit={handleAddHabit} className="card-glass" style={{ padding: '12px', marginBottom: '12px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Habit title (e.g. 5:00 AM Cold Shower)..."
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                autoFocus
                style={{ marginBottom: '8px' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsAddingHabit(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-crimson" style={{ flex: 1 }}>
                  Save Habit
                </button>
              </div>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {habits.length === 0 ? (
              <div className="card-glass" style={{ padding: '24px 16px', textAlign: 'center', border: '1px dashed var(--border-glass)' }}>
                <Flame size={28} color="#ffd000" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>No Daily Habits Configured Yet</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Tap "+ Add Habit" above to forge your daily non-negotiables.
                </div>
              </div>
            ) : (
              habits.map((h) => (
              <div 
                key={h.id} 
                className="card-glass" 
                style={{ 
                  padding: '12px 14px',
                  borderColor: h.completedToday ? 'rgba(0, 245, 160, 0.3)' : 'var(--border-subtle)',
                  background: h.completedToday ? 'linear-gradient(145deg, rgba(0, 245, 160, 0.06) 0%, rgba(13, 17, 26, 0.9) 100%)' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button 
                      onClick={() => toggleHabit(h.id)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      {h.completedToday ? (
                        <CheckCircle2 size={22} color="#00f5a0" />
                      ) : (
                        <Circle size={22} color="var(--text-muted)" />
                      )}
                    </button>
                    <span 
                      style={{ 
                        fontSize: '14px', 
                        fontWeight: 600,
                        color: h.completedToday ? '#fff' : 'var(--text-secondary)',
                        textDecoration: h.completedToday ? 'line-through' : 'none',
                      }}
                    >
                      {h.name}
                    </span>
                  </div>

                  <div 
                    className="badge badge-gold" 
                    style={{ padding: '3px 9px', fontSize: '11px' }}
                  >
                    <Flame size={12} fill="#ffd000" />
                    <span>{h.streak}D</span>
                  </div>
                </div>
              </div>
            )))
          }
          </div>
        </div>
      )}

      {/* ========================================================
          SECTION 2: STRATEGIC SPRINTS (21 / 90 DAYS)
          ======================================================== */}
      {(activeSection === 'sprints' || activeSection === 'all') && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Target size={16} color="var(--crimson-core)" />
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>Strategic Campaigns</h3>
            </div>
            <span className="badge badge-crimson" style={{ fontSize: '10px' }}>
              {goals.length} ACTIVE
            </span>
          </div>

          {/* Forge & Create Sprints Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <button
              className="btn btn-crimson"
              onClick={() => setIsAiForgeOpen(true)}
              id="btn-open-ai-sprint-forge"
              style={{ padding: '9px 12px', fontSize: '12px', gap: '6px' }}
            >
              <Sparkles size={14} />
              <span>Forge with AI</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleOpenNewManual}
              id="btn-open-manual-sprint-create"
              style={{ padding: '9px 12px', fontSize: '12px', gap: '6px' }}
            >
              <Plus size={14} />
              <span>Custom Sprint</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {goals.length === 0 ? (
              <div className="card-glass" style={{ padding: '28px 16px', textAlign: 'center', border: '1px dashed var(--border-glass)' }}>
                <Target size={28} color="var(--crimson-core)" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>No Strategic Sprints Active Yet</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Use "Forge with AI" or "Custom Sprint" above to launch your 21-Day or 90-Day transformation campaign.
                </div>
              </div>
            ) : (
              goals.map((g) => {
                const percent = Math.min(100, Math.round((g.dayCurrent / g.dayTotal) * 100));
                const daysLeft = Math.max(0, g.dayTotal - g.dayCurrent);
                const isExpanded = expandedGoalId === g.id;

                return (
            <div key={g.id} className="card-glass" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ flex: 1, paddingRight: '8px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '3px' }}>
                    {g.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {g.description}
                  </div>
                </div>

                <span className="badge badge-cyan" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                  {g.category || 'DISCIPLINE'}
                </span>
              </div>

              {/* Progress metrics */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0 6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Day <strong style={{ color: '#fff', fontSize: '14px' }}>{g.dayCurrent}</strong> of {g.dayTotal}
                </span>
                <span className="mono" style={{ fontSize: '12px', fontWeight: 800, color: daysLeft === 0 ? '#00f5a0' : '#ffd000' }}>
                  {daysLeft === 0 ? '🏆 CONQUERED' : `${daysLeft} Days Remaining`}
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '14px' }}>
                <div
                  style={{
                    width: `${percent}%`,
                    height: '100%',
                    background: percent >= 100 ? 'var(--emerald-gradient)' : 'var(--crimson-gradient)',
                    borderRadius: '4px',
                    boxShadow: '0 0 10px rgba(255, 42, 95, 0.4)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              {/* Sprint Milestones & Doctrine Expandable */}
              {g.milestones && g.milestones.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <button
                    onClick={() => setExpandedGoalId(isExpanded ? null : g.id)}
                    style={{ background: 'none', border: 'none', color: '#38e1ff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: 0 }}
                  >
                    <span>{isExpanded ? 'Hide Strategy Milestones' : 'View Strategy Milestones'}</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {isExpanded && (
                    <div style={{ marginTop: '8px', padding: '10px', borderRadius: '8px', background: 'rgba(0, 242, 254, 0.05)', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {g.milestones.map((m, idx) => (
                          <div key={idx} style={{ fontSize: '11.5px', color: '#cbd5e1', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                            <span style={{ color: 'var(--crimson-core)', fontWeight: 800 }}>•</span>
                            <span>{m}</span>
                          </div>
                        ))}
                      </div>
                      {g.doctrine && (
                        <div style={{ marginTop: '8px', fontStyle: 'italic', fontSize: '11px', color: '#ff7b00', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '6px' }}>
                          "{g.doctrine}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Card Actions Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <button
                  className="btn btn-crimson"
                  onClick={() => handleAdvanceDay(g.id)}
                  style={{ padding: '6px 12px', fontSize: '11px', gap: '5px' }}
                  title="Mark day as complete"
                >
                  <Zap size={13} />
                  <span>+1 Day Complete</span>
                </button>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="btn-icon"
                    onClick={() => handleOpenEdit(g)}
                    title="Customize Sprint"
                    style={{ width: '32px', height: '32px' }}
                  >
                    <Edit2 size={13} />
                  </button>

                  <button
                    className="btn-icon"
                    onClick={() => handleDeleteGoal(g.id)}
                    title="Delete Sprint"
                    style={{ width: '32px', height: '32px' }}
                  >
                    <Trash2 size={13} color="var(--text-muted)" />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
      </div>
    </div>
  )}

      {/* ========================================================
          MODAL 1: AI SPRINT FORGE (KRATOS AI ENGINE)
          ======================================================== */}
      {isAiForgeOpen && (
        <div className="modal-overlay" onClick={() => setIsAiForgeOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="var(--crimson-core)" />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>Forge Sprint with KRATOS</h3>
              </div>
              <button className="btn-icon" onClick={() => setIsAiForgeOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Describe your conquest. KRATOS will structure an unyielding battle plan with phase milestones.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                  What do you want to conquer?
                </label>
                <VoiceMicButton
                  onTranscript={(text) => setAmbitionInput(text)}
                  size={15}
                  id="btn-voice-goals-ambition"
                />
              </div>
              <textarea
                className="input-field"
                rows={3}
                placeholder="e.g. Master System Design & solve 50 LeetCode dynamic programming questions, or become AI engineer by Jan 1..."
                value={ambitionInput}
                onChange={(e) => setAmbitionInput(e.target.value)}
                autoFocus
              />
            </div>

            {/* Target Duration Selector Chips */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Sprint Duration:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
                {[21, 30, 60, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setAiDuration(days)}
                    className={`btn ${aiDuration === days ? 'btn-crimson' : 'btn-secondary'}`}
                    style={{ padding: '8px', fontSize: '12px' }}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-crimson"
              onClick={handleRunAiForge}
              disabled={isForging || !ambitionInput.trim()}
              style={{ width: '100%', marginBottom: '16px', gap: '8px' }}
              id="btn-run-ai-forge"
            >
              <Zap size={16} />
              <span>{isForging ? 'KRATOS Forging Strategy...' : `Forge ${aiDuration}-Day Sprint`}</span>
            </button>

            {/* AI Generated Preview */}
            {forgedResult && (
              <div className="card-glass card-must-win" style={{ padding: '16px', marginBottom: '18px' }}>
                <div style={{ fontSize: '11px', color: 'var(--crimson-core)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Forged Sprint Blueprint
                </div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff', marginBottom: '6px' }}>
                  {forgedResult.title}
                </div>
                <p style={{ fontSize: '12.5px', color: '#cbd5e1', marginBottom: '10px', lineHeight: 1.4 }}>
                  {forgedResult.description}
                </p>

                {forgedResult.milestones && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    {forgedResult.milestones.map((m, idx) => (
                      <div key={idx} style={{ fontSize: '11px', color: '#00f2fe' }}>
                        ⚡ {m}
                      </div>
                    ))}
                  </div>
                )}

                {forgedResult.doctrine && (
                  <div style={{ fontStyle: 'italic', fontSize: '11.5px', color: '#ffd000' }}>
                    "{forgedResult.doctrine}"
                  </div>
                )}

                <button
                  className="btn btn-crimson"
                  onClick={handleCommitAiSprint}
                  style={{ width: '100%', marginTop: '14px', gap: '6px' }}
                >
                  <ShieldCheck size={16} />
                  <span>Lock & Deploy to Active Sprints</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: MANUAL SPRINT CREATOR & EDITOR
          ======================================================== */}
      {isManualModalOpen && (
        <div className="modal-overlay" onClick={() => setIsManualModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={20} color="#00f2fe" />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                  {editingGoal ? 'Customize Strategic Sprint' : 'Create Custom Sprint'}
                </h3>
              </div>
              <button className="btn-icon" onClick={() => setIsManualModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveManualGoal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Sprint Title
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 21-Day Elite Discipline Sprint"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                  <VoiceMicButton
                    onTranscript={(text) => setFormTitle(text)}
                    size={16}
                    id="btn-voice-goals-title"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Mission Description
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="What is the non-negotiable standard?"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Total Days (Target)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    className="input-field"
                    value={formDaysTotal}
                    onChange={(e) => setFormDaysTotal(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Current Progress Day
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={formDaysTotal}
                    className="input-field"
                    value={formDayCurrent}
                    onChange={(e) => setFormDayCurrent(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Domain Category
                </label>
                <select
                  className="input-field"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="discipline">Discipline (Routine, Habit, Alarm)</option>
                  <option value="career">Career (Engineering, Promotion, LeetCode)</option>
                  <option value="fitness">Fitness (Strength, Conditioning, Diet)</option>
                  <option value="skills">Skills (Languages, System Design, Certifications)</option>
                  <option value="mental">Mental (Focus, Reading, Meditation)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsManualModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-crimson"
                  style={{ flex: 2 }}
                >
                  {editingGoal ? 'Save Customizations' : 'Deploy Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
