import React, { useState } from 'react';
import { X, Sparkles, Swords, CheckCircle2, AlertCircle } from 'lucide-react';
import { generateMorningBattlePlan } from '../services/ai';
import { storage } from '../services/storage';

export default function MorningPlanModal({ isOpen, onClose, onSavePlan }) {
  const currentPlan = storage.getDailyPlan();
  const [mustWin, setMustWin] = useState(currentPlan.mustWin || '');
  const [shouldDo1, setShouldDo1] = useState(currentPlan.shouldDo?.[0] || '');
  const [shouldDo2, setShouldDo2] = useState(currentPlan.shouldDo?.[1] || '');
  const [couldDo1, setCouldDo1] = useState(currentPlan.couldDo?.[0] || '');
  const [couldDo2, setCouldDo2] = useState(currentPlan.couldDo?.[1] || '');
  const [motivation, setMotivation] = useState(currentPlan.aiMotivation || '');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerateAiPlan = async () => {
    setIsGenerating(true);
    try {
      const goals = storage.getGoals();
      const plan = await generateMorningBattlePlan(goals, 'Focus on engineering excellence, LeetCode, physical fitness');
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
    if (onSavePlan) onSavePlan(updated);
    onClose();
  };

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

        <button 
          className="btn btn-crimson" 
          style={{ width: '100%', marginBottom: '20px', gap: '8px' }}
          onClick={handleGenerateAiPlan}
          disabled={isGenerating}
          id="btn-generate-morning-plan"
        >
          <Sparkles size={16} />
          {isGenerating ? 'KRATOS Synthesizing Battle Plan...' : 'Generate with KRATOS AI'}
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
