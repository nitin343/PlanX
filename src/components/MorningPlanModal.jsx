import React, { useState } from 'react';
import { X, Sparkles, Swords, CheckCircle2, AlertCircle } from 'lucide-react';
import { generateMorningBattlePlan } from '../services/ai';
import { storage } from '../services/storage';

export default function MorningPlanModal({ isOpen, onClose, onSavePlan }) {
  const currentPlan = storage.getDailyPlan();
  const [userFocus, setUserFocus] = useState('');
  const [mustWin, setMustWin] = useState(currentPlan.mustWin || '');
  const [shouldDo1, setShouldDo1] = useState(currentPlan.shouldDo?.[0] || '');
  const [shouldDo2, setShouldDo2] = useState(currentPlan.shouldDo?.[1] || '');
  const [couldDo1, setCouldDo1] = useState(currentPlan.couldDo?.[0] || '');
  const [couldDo2, setCouldDo2] = useState(currentPlan.couldDo?.[1] || '');
  const [motivation, setMotivation] = useState(currentPlan.aiMotivation || '');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerateAiPlan = async (customPrompt) => {
    setIsGenerating(true);
    const target = customPrompt || userFocus.trim() || 'Focus on engineering excellence, LeetCode, physical fitness';
    try {
      const goals = storage.getGoals();
      const plan = await generateMorningBattlePlan(goals, target);
      if (plan.mustWin) setMustWin(plan.mustWin);
      if (plan.shouldDo?.[0]) setShouldDo1(plan.shouldDo[0]);
      if (plan.shouldDo?.[1]) setShouldDo2(plan.shouldDo[1]);
      if (plan.couldDo?.[0]) setCouldDo1(plan.couldDo[0]);
      if (plan.couldDo?.[1]) setCouldDo2(plan.couldDo[1]);
      if (plan.motivation) setMotivation(plan.motivation);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommit = () => {
    const updated = {
      planDate: new Date().toISOString().split('T')[0],
      mustWin,
      shouldDo: [shouldDo1, shouldDo2].filter(Boolean),
      couldDo: [couldDo1, couldDo2].filter(Boolean),
      aiMotivation: motivation || "No excuses. Execute without compromise.",
      status: 'active',
    };
    storage.saveDailyPlan(updated);

    // CRITICAL: Synchronize and create interactive checklist tasks for Today Page
    const existingCompleted = storage.getTasks().filter(t => t.completed);
    const newTasks = [
      mustWin && {
        id: `t-mw-${Date.now()}`,
        title: mustWin.trim(),
        priority: 'must_win',
        category: 'skills',
        completed: false,
        estimatedMinutes: 90,
        actualMinutes: 0,
      },
      shouldDo1 && {
        id: `t-sd1-${Date.now()}`,
        title: shouldDo1.trim(),
        priority: 'should_do',
        category: 'work',
        completed: false,
        estimatedMinutes: 60,
        actualMinutes: 0,
      },
      shouldDo2 && {
        id: `t-sd2-${Date.now()}`,
        title: shouldDo2.trim(),
        priority: 'should_do',
        category: 'skills',
        completed: false,
        estimatedMinutes: 45,
        actualMinutes: 0,
      },
      couldDo1 && {
        id: `t-cd1-${Date.now()}`,
        title: couldDo1.trim(),
        priority: 'could_do',
        category: 'skills',
        completed: false,
        estimatedMinutes: 30,
        actualMinutes: 0,
      },
      couldDo2 && {
        id: `t-cd2-${Date.now()}`,
        title: couldDo2.trim(),
        priority: 'could_do',
        category: 'health',
        completed: false,
        estimatedMinutes: 15,
        actualMinutes: 0,
      },
    ].filter(Boolean);

    storage.saveTasks([...newTasks, ...existingCompleted]);

    if (onSavePlan) onSavePlan(updated);
    onClose();
  };

  const quickPresets = [
    { label: '🚀 AI Engineer / Upskilling', text: 'Frontend to AI Engineer upskilling: PyTorch tensors, Transformer self-attention, and LeetCode DP' },
    { label: '💻 Deep Architecture & Work', text: 'Production engineering: System architecture, code reviews, and high-focus deep work' },
    { label: '🔥 LeetCode & High Intensity Gym', text: 'Algorithmic problem solving, dynamic programming, and 45-min workout' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Swords size={20} color="var(--crimson-core)" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>Morning War Room Briefing</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* User Objective / Target Input */}
        <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#00f2fe', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.03em' }}>
            What do you want to accomplish today?
          </label>
          <input
            type="text"
            className="input-field"
            value={userFocus}
            onChange={(e) => setUserFocus(e.target.value)}
            placeholder="e.g. Frontend to AI Engineer transition: PyTorch, attention layer, gym..."
            style={{ marginBottom: '8px', fontSize: '13px' }}
            id="input-morning-target"
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {quickPresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setUserFocus(preset.text);
                  handleGenerateAiPlan(preset.text);
                }}
                className="btn btn-secondary"
                style={{ padding: '4px 9px', fontSize: '10.5px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <button 
          className="btn btn-crimson" 
          style={{ width: '100%', marginBottom: '20px', gap: '8px' }}
          onClick={() => handleGenerateAiPlan()}
          disabled={isGenerating}
          id="btn-generate-morning-plan"
        >
          <Sparkles size={16} />
          {isGenerating ? 'KRATOS Synthesizing Custom Battle Plan...' : 'Generate with KRATOS AI'}
        </button>

        {motivation && (
          <div className="coach-bubble" style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--crimson-core)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
              KRATOS Direct Directive
            </div>
            <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#e2e8f0', lineHeight: 1.5 }}>
              "{motivation}"
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Must Win Task */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#ff527b', textTransform: 'uppercase', marginBottom: '6px' }}>
              <AlertCircle size={14} />
              1. Non-Negotiable Must-Win Task
            </label>
            <input
              type="text"
              className="input-field"
              value={mustWin}
              onChange={(e) => setMustWin(e.target.value)}
              placeholder="The #1 single target that defines today's victory..."
              style={{ borderColor: 'rgba(255, 42, 95, 0.4)' }}
            />
          </div>

          {/* Should Do */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#38e1ff', textTransform: 'uppercase', marginBottom: '6px' }}>
              2. Should-Do Objectives (Core Execution)
            </label>
            <input
              type="text"
              className="input-field"
              value={shouldDo1}
              onChange={(e) => setShouldDo1(e.target.value)}
              placeholder="Important Priority 1..."
              style={{ marginBottom: '8px' }}
            />
            <input
              type="text"
              className="input-field"
              value={shouldDo2}
              onChange={(e) => setShouldDo2(e.target.value)}
              placeholder="Important Priority 2..."
            />
          </div>

          {/* Could Do */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
              3. Could-Do Bonus (Upskilling / Micro-habits)
            </label>
            <input
              type="text"
              className="input-field"
              value={couldDo1}
              onChange={(e) => setCouldDo1(e.target.value)}
              placeholder="Bonus objective 1..."
              style={{ marginBottom: '8px' }}
            />
            <input
              type="text"
              className="input-field"
              value={couldDo2}
              onChange={(e) => setCouldDo2(e.target.value)}
              placeholder="Bonus objective 2..."
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-crimson" 
            style={{ flex: 2 }}
            onClick={handleCommit}
            id="btn-commit-morning-plan"
          >
            <CheckCircle2 size={16} />
            Commit & Lock Plan
          </button>
        </div>
      </div>
    </div>
  );
}
