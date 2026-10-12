import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Sparkles, Plus, CheckCircle2, RotateCcw, 
  Trash2, ChevronLeft, ChevronRight, Zap, Target, Edit3, X, Check, Filter
} from 'lucide-react';
import { storage } from '../services/storage';
import { forgeSkillCard } from '../services/ai';

export default function LearnPage() {
  const [cards, setCards] = useState(() => {
    try {
      const data = typeof storage.getSkillCards === 'function' ? storage.getSkillCards() : [];
      // Clean out any legacy prefilled cards
      const clean = Array.isArray(data) ? data.filter(c => !c.id?.startsWith('card-sample-')) : [];
      return clean;
    } catch {
      return [];
    }
  });

  const [selectedSkill, setSelectedSkill] = useState('all');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Manual Add Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [manualSkill, setManualSkill] = useState('');
  const [manualFront, setManualFront] = useState('');
  const [manualBack, setManualBack] = useState('');
  const [manualDrill, setManualDrill] = useState('');

  // AI Forge Modal State
  const [isAiForgeOpen, setIsAiForgeOpen] = useState(false);
  const [aiSkillName, setAiSkillName] = useState('');
  const [aiRequirement, setAiRequirement] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState(null); // { front, back, skill, actionDrill }
  const [forgeError, setForgeError] = useState(null);

  // Derive dynamic user skills from existing cards (Zero hardcoded domains!)
  const userSkills = Array.from(new Set(cards.map(c => c.skill || c.domain).filter(Boolean)));

  // Filter cards by selected skill
  const filteredCards = selectedSkill === 'all' 
    ? cards 
    : cards.filter(c => (c.skill || c.domain || '').toLowerCase() === selectedSkill.toLowerCase());

  const currentCard = filteredCards[currentIdx] || filteredCards[0];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIdx((prev) => (prev + 1) % Math.max(1, filteredCards.length));
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIdx((prev) => (prev - 1 + filteredCards.length) % Math.max(1, filteredCards.length));
  };

  const handleToggleMastered = (id) => {
    const updated = cards.map(c => {
      if (c.id === id) {
        return { ...c, mastered: !c.mastered };
      }
      return c;
    });
    setCards(updated);
    storage.saveSkillCards(updated);
  };

  const handleDeleteCard = (id) => {
    const updated = cards.filter(c => c.id !== id);
    setCards(updated);
    storage.saveSkillCards(updated);
    if (currentIdx >= updated.length) {
      setCurrentIdx(Math.max(0, updated.length - 1));
    }
  };

  // Submit manual card
  const handleSaveManual = (e) => {
    e.preventDefault();
    if (!manualFront.trim() || !manualBack.trim()) return;

    const newCard = {
      id: `card-${Date.now()}`,
      front: manualFront.trim(),
      back: manualBack.trim(),
      skill: manualSkill.trim() || 'General Skill',
      domain: manualSkill.trim() || 'General Skill',
      actionDrill: manualDrill.trim() || 'Execute 1 practical iteration to lock in this skill.',
      mastered: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [newCard, ...cards];
    setCards(updated);
    storage.saveSkillCards(updated);

    // Reset and close
    setManualSkill('');
    setManualFront('');
    setManualBack('');
    setManualDrill('');
    setIsAddOpen(false);
  };

  // AI Forge step 1: Generate custom card according to user's exact need
  const handleGenerateAi = async (e) => {
    e.preventDefault();
    if (!aiSkillName.trim()) return;

    setIsGenerating(true);
    setForgeError(null);
    setGeneratedPreview(null);

    try {
      const result = await forgeSkillCard(aiSkillName.trim(), aiRequirement.trim());
      setGeneratedPreview(result);
    } catch (err) {
      setForgeError(err.message || 'Failed to forge skill card with KRATOS.');
    } finally {
      setIsGenerating(false);
    }
  };

  // AI Forge step 2: User cross-verifies, edits, and confirms
  const handleConfirmAiCard = () => {
    if (!generatedPreview) return;

    const newCard = {
      id: `ai-card-${Date.now()}`,
      front: generatedPreview.front,
      back: generatedPreview.back,
      skill: generatedPreview.skill || aiSkillName.trim(),
      domain: generatedPreview.skill || aiSkillName.trim(),
      actionDrill: generatedPreview.actionDrill || 'Apply this concept in a 5-minute focused session.',
      mastered: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [newCard, ...cards];
    setCards(updated);
    storage.saveSkillCards(updated);

    // Reset and close
    setAiSkillName('');
    setAiRequirement('');
    setGeneratedPreview(null);
    setIsAiForgeOpen(false);
  };

  const masteredCount = cards.filter(c => c.mastered).length;

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', letterSpacing: '0.03em' }}>
            UPSKILL ARENA
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Personalized skill mastery engine powered by KRATOS. Zero presets.
          </p>
        </div>
        <div className="badge badge-gold" style={{ fontSize: '10.5px' }}>
          <Zap size={13} fill="#ffd000" />
          <span>{masteredCount}/{cards.length} MASTERED</span>
        </div>
      </div>

      {/* Dynamic Skill Filter Chips (Generated purely from user's created skills) */}
      {userSkills.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          <button
            onClick={() => { setSelectedSkill('all'); setCurrentIdx(0); setIsFlipped(false); }}
            className={`btn ${selectedSkill === 'all' ? 'btn-crimson' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '11.5px', whiteSpace: 'nowrap' }}
          >
            All Skills ({cards.length})
          </button>
          {userSkills.map(skill => {
            const isSelected = selectedSkill.toLowerCase() === skill.toLowerCase();
            const count = cards.filter(c => (c.skill || c.domain || '').toLowerCase() === skill.toLowerCase()).length;
            return (
              <button
                key={skill}
                onClick={() => { setSelectedSkill(skill); setCurrentIdx(0); setIsFlipped(false); }}
                className={`btn ${isSelected ? 'btn-crimson' : 'btn-secondary'}`}
                style={{
                  padding: '6px 12px',
                  fontSize: '11.5px',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span>🎯</span>
                <span>{skill} ({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Action Buttons: Forge with KRATOS (AI) + Custom Flashcard */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
        <button
          onClick={() => { setIsAiForgeOpen(true); setGeneratedPreview(null); setForgeError(null); }}
          className="btn btn-crimson"
          style={{ padding: '11px 14px', fontSize: '12.5px', fontWeight: 800, gap: '6px' }}
          id="btn-forge-skill-ai"
        >
          <Sparkles size={15} />
          <span>Forge with KRATOS (AI)</span>
        </button>

        <button
          onClick={() => setIsAddOpen(true)}
          className="btn btn-secondary"
          style={{ padding: '11px 14px', fontSize: '12.5px', gap: '6px' }}
          id="btn-add-custom-card"
        >
          <Plus size={15} />
          <span>Add Custom Card</span>
        </button>
      </div>

      {/* Active Skill Drill Card (When cards exist) */}
      {currentCard ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Card {currentIdx + 1} of {filteredCards.length} in <span style={{ color: '#fff', fontWeight: 700 }}>{selectedSkill === 'all' ? 'All Skills' : selectedSkill}</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-cyan" style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>
                {currentCard.skill || currentCard.domain || 'Skill Drill'}
              </span>
              {currentCard.mastered && (
                <span className="badge badge-emerald" style={{ fontSize: '9.5px' }}>
                  MASTERED
                </span>
              )}
            </div>
          </div>

          {/* Interactive Card */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="card-glass"
            style={{
              minHeight: '210px',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              cursor: 'pointer',
              background: isFlipped 
                ? 'linear-gradient(145deg, rgba(0, 242, 254, 0.08) 0%, rgba(13, 17, 26, 0.95) 100%)' 
                : 'linear-gradient(145deg, rgba(255, 42, 95, 0.08) 0%, rgba(13, 17, 26, 0.95) 100%)',
              borderColor: isFlipped ? 'var(--border-cyan)' : 'var(--border-crimson)',
              boxShadow: isFlipped ? '0 0 25px rgba(0, 242, 254, 0.15)' : '0 0 25px rgba(255, 42, 95, 0.15)',
              transition: 'all 0.25s ease',
            }}
          >
            <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: isFlipped ? '#00f2fe' : 'var(--crimson-core)', marginBottom: '12px' }}>
              {isFlipped ? '⚡ TACTICAL BREAKDOWN & INSIGHT' : '🎯 CORE PRINCIPLE (TAP TO FLIP)'}
            </div>

            <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1.5, maxWidth: '420px' }}>
              {isFlipped ? currentCard.back : currentCard.front}
            </div>

            {isFlipped && currentCard.actionDrill && (
              <div style={{ marginTop: '14px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255, 208, 0, 0.08)', border: '1px solid rgba(255, 208, 0, 0.25)', fontSize: '11px', color: '#ffd000', textAlign: 'left', width: '100%', maxWidth: '380px' }}>
                <strong>Immediate Action Drill:</strong> {currentCard.actionDrill}
              </div>
            )}
          </div>

          {/* Navigation & Mastery Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', gap: '8px' }}>
            <button
              onClick={handlePrev}
              disabled={filteredCards.length <= 1}
              className="btn btn-secondary"
              style={{ padding: '8px 12px', fontSize: '12px' }}
            >
              <ChevronLeft size={16} />
              <span>Prev</span>
            </button>

            <button
              onClick={() => handleToggleMastered(currentCard.id)}
              className={`btn ${currentCard.mastered ? 'btn-secondary' : 'btn-crimson'}`}
              style={{ flex: 1, padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <CheckCircle2 size={15} color={currentCard.mastered ? '#00f5a0' : '#fff'} />
              <span>{currentCard.mastered ? 'Mark as In-Progress' : 'Mark as Mastered'}</span>
            </button>

            <button
              onClick={handleNext}
              disabled={filteredCards.length <= 1}
              className="btn btn-secondary"
              style={{ padding: '8px 12px', fontSize: '12px' }}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* Clean Zero-Preset Empty State */
        <div className="card-glass" style={{ padding: '40px 20px', textAlign: 'center', border: '1px dashed var(--border-glass)' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(255, 42, 95, 0.12)', border: '1px solid rgba(255, 42, 95, 0.3)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} color="var(--crimson-core)" />
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>
            No Skills Added Yet
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            Your arena has zero preset clutter. Tell KRATOS what skill or craft you want to master (Content Creation, Programming, Copywriting, Sales, etc.), or create your own custom flashcards.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button
              onClick={() => { setIsAiForgeOpen(true); setGeneratedPreview(null); }}
              className="btn btn-crimson"
              style={{ padding: '10px 16px', fontSize: '12.5px', fontWeight: 800 }}
            >
              <Sparkles size={14} />
              <span>Forge Skill with KRATOS</span>
            </button>
            <button
              onClick={() => setIsAddOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '10px 16px', fontSize: '12.5px' }}
            >
              <Plus size={14} />
              <span>Create Custom Flashcard</span>
            </button>
          </div>
        </div>
      )}

      {/* Cards List / Deck Management */}
      {filteredCards.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
              Your Skill Deck ({filteredCards.length})
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Tap any card to review
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredCards.map((card, idx) => (
              <div 
                key={card.id}
                onClick={() => { setCurrentIdx(idx); setIsFlipped(false); }}
                className="card-glass"
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  border: currentCard?.id === card.id ? '1px solid var(--crimson-core)' : '1px solid var(--border-glass)',
                  background: currentCard?.id === card.id ? 'rgba(255, 42, 95, 0.05)' : undefined,
                }}
              >
                <div style={{ flex: 1, paddingRight: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '3px' }}>
                    {card.front}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="badge badge-crimson" style={{ fontSize: '9px', padding: '1px 6px' }}>
                      {card.skill || card.domain || 'Skill'}
                    </span>
                    {card.mastered && (
                      <span className="badge badge-emerald" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        MASTERED
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }}
                  className="btn-icon"
                  style={{ width: '28px', height: '28px', color: 'var(--text-muted)' }}
                  title="Delete Card"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: AI SKILL FORGE & CROSS-VERIFICATION
          ======================================================== */}
      {isAiForgeOpen && (
        <div className="modal-overlay" onClick={() => setIsAiForgeOpen(false)}>
          <div className="modal-content card-glass" style={{ maxWidth: '520px', width: '95%', padding: '22px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--crimson-core)" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                  Forge Any Skill with KRATOS
                </h3>
              </div>
              <button onClick={() => setIsAiForgeOpen(false)} className="btn-glass" style={{ width: '30px', height: '30px', borderRadius: '50%', padding: 0 }}>
                <X size={15} />
              </button>
            </div>

            {forgeError && (
              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ff6b6b', fontSize: '12px', marginBottom: '12px' }}>
                {forgeError}
              </div>
            )}

            {!generatedPreview ? (
              /* Step 1: Input whatever skill and requirement user wants */
              <form onSubmit={handleGenerateAi} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    What Skill or Craft do you want to master? *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Content Creation, Video Hooks, System Design, Copywriting, Sales, etc."
                    value={aiSkillName}
                    onChange={e => setAiSkillName(e.target.value)}
                    className="input-field"
                    id="input-forge-skill-name"
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '3px' }}>
                    Completely unrestricted — type any craft, professional skill, or hobby.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    What specific requirement or concept do you want to learn?
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. How to keep 70% retention in the first 3 seconds, or how to handle API idempotency, or how to overcome price objections..."
                    value={aiRequirement}
                    onChange={e => setAiRequirement(e.target.value)}
                    className="input-field"
                    style={{ resize: 'none' }}
                    id="input-forge-skill-requirement"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsAiForgeOpen(false)}
                    className="btn btn-secondary"
                    style={{ padding: '9px 14px', fontSize: '12px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating || !aiSkillName.trim()}
                    className="btn btn-crimson"
                    style={{ padding: '9px 18px', fontSize: '12px', fontWeight: 800 }}
                    id="btn-submit-ai-forge"
                  >
                    {isGenerating ? 'KRATOS IS FORGING...' : 'Forge Masterclass Card (AI)'}
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Cross-Verification & Editable Preview */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(0, 245, 160, 0.1)', border: '1px solid rgba(0, 245, 160, 0.3)', fontSize: '11px', color: '#00f5a0' }}>
                  ✓ KRATOS generated this drill. Inspect, edit any text below to your liking, then confirm.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Skill:
                  </label>
                  <input
                    type="text"
                    value={generatedPreview.skill}
                    onChange={e => setGeneratedPreview({ ...generatedPreview, skill: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Card Front (Core Law / Question):
                  </label>
                  <input
                    type="text"
                    value={generatedPreview.front}
                    onChange={e => setGeneratedPreview({ ...generatedPreview, front: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Card Back (Masterclass Breakdown):
                  </label>
                  <textarea
                    rows={4}
                    value={generatedPreview.back}
                    onChange={e => setGeneratedPreview({ ...generatedPreview, back: e.target.value })}
                    className="input-field"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#ffd000', marginBottom: '4px' }}>
                    5-Minute Action Drill:
                  </label>
                  <input
                    type="text"
                    value={generatedPreview.actionDrill}
                    onChange={e => setGeneratedPreview({ ...generatedPreview, actionDrill: e.target.value })}
                    className="input-field"
                    style={{ borderColor: 'rgba(255, 208, 0, 0.4)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setGeneratedPreview(null)}
                    className="btn btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '11.5px', gap: '5px' }}
                  >
                    <RotateCcw size={13} />
                    <span>Re-Forge</span>
                  </button>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setIsAiForgeOpen(false)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '11.5px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmAiCard}
                      className="btn btn-crimson"
                      style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 800, gap: '5px' }}
                      id="btn-confirm-ai-card"
                    >
                      <Check size={14} />
                      <span>Confirm & Add to Deck</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: MANUAL CUSTOM FLASHCARD
          ======================================================== */}
      {isAddOpen && (
        <div className="modal-overlay" onClick={() => setIsAddOpen(false)}>
          <div className="modal-content card-glass" style={{ maxWidth: '480px', width: '95%', padding: '22px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} color="var(--crimson-core)" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                  Create Custom Flashcard
                </h3>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="btn-glass" style={{ width: '30px', height: '30px', borderRadius: '50%', padding: 0 }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveManual} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Skill or Discipline Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Content Creation, Python, Negotiation, Fitness, etc."
                  value={manualSkill}
                  onChange={e => setManualSkill(e.target.value)}
                  className="input-field"
                  id="input-manual-skill"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Front: Core Law or Question *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. What is the 3-second hook law?"
                  value={manualFront}
                  onChange={e => setManualFront(e.target.value)}
                  className="input-field"
                  id="input-manual-front"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Back: Tactical Breakdown & Answer *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain the law, formula, or execution steps clearly..."
                  value={manualBack}
                  onChange={e => setManualBack(e.target.value)}
                  className="input-field"
                  style={{ resize: 'vertical' }}
                  id="input-manual-back"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#ffd000', marginBottom: '5px' }}>
                  5-Minute Action Drill (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Write 3 variations of your next video hook immediately."
                  value={manualDrill}
                  onChange={e => setManualDrill(e.target.value)}
                  className="input-field"
                  id="input-manual-drill"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '9px 14px', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-crimson"
                  style={{ padding: '9px 18px', fontSize: '12px', fontWeight: 800 }}
                  id="btn-save-manual-card"
                >
                  Save Flashcard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
