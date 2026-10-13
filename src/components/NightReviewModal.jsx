import React, { useState } from 'react';
import { X, Moon, Award, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { reviewNightDebrief } from '../services/ai';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import VoiceMicButton from './VoiceMicButton';

export default function NightReviewModal({ isOpen, onClose, tasks = [], onCompletedReview }) {
  const { incrementStreak } = useAuth();
  const [journalNote, setJournalNote] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);

  if (!isOpen) return null;

  const completed = tasks.filter(t => t.completed);
  const pending = tasks.filter(t => !t.completed);

  const handleStartDebrief = async () => {
    setIsEvaluating(true);
    try {
      const res = await reviewNightDebrief(
        completed.map(t => t.title),
        pending.map(t => t.title),
        journalNote
      );
      setReviewResult(res);
    } catch (e) {
      console.error(e);
      setReviewResult({
        score: Math.min(100, Math.round((completed.length / Math.max(1, tasks.length)) * 100)),
        wins: ['Completed assigned focus targets'],
        weaknesses: ['Review remaining pending tasks tomorrow'],
        review: 'Good effort, but tomorrow demand perfection from yourself.',
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleFinalizeReview = () => {
    if (reviewResult) {
      storage.saveDayScore({
        date: new Date().toISOString().split('T')[0],
        score: reviewResult.score,
        wins: reviewResult.wins || [],
        weaknesses: reviewResult.weaknesses || [],
        aiReview: reviewResult.review,
        journalNote,
      });
      incrementStreak();
    }
    if (onCompletedReview) onCompletedReview();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Moon size={20} color="#ffd000" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>Night War Room Debrief</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {!reviewResult ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div className="card-glass" style={{ padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completed</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#00f5a0' }}>{completed.length}</div>
              </div>
              <div className="card-glass" style={{ padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Missed / Left</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#ff2a5f' }}>{pending.length}</div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Brief Reflection (What worked? Where did you lose discipline?)
                </label>
                <VoiceMicButton
                  onTranscript={(text) => setJournalNote(text)}
                  size={15}
                  id="btn-voice-night-review"
                />
              </div>
              <textarea
                className="input-field"
                rows={3}
                value={journalNote}
                onChange={(e) => setJournalNote(e.target.value)}
                placeholder="Be brutally honest with yourself or tap mic to speak..."
                style={{ resize: 'vertical' }}
              />
            </div>

            <button
              className="btn btn-crimson"
              style={{ width: '100%', gap: '8px' }}
              onClick={handleStartDebrief}
              disabled={isEvaluating}
              id="btn-evaluate-night-review"
            >
              <Award size={16} />
              {isEvaluating ? 'KRATOS Evaluating Day Performance...' : 'Submit to KRATOS for Scoring'}
            </button>
          </div>
        ) : (
          <div>
            {/* Score Display */}
            <div 
              style={{
                textAlign: 'center',
                padding: '20px',
                borderRadius: '16px',
                background: 'radial-gradient(circle, rgba(255, 42, 95, 0.15) 0%, rgba(13, 17, 26, 0.8) 70%)',
                border: '1px solid var(--border-crimson)',
                marginBottom: '18px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Official Day Score
              </div>
              <div className="mono" style={{ fontSize: '54px', fontWeight: 900, color: '#fff', textShadow: '0 0 25px rgba(255, 42, 95, 0.6)' }}>
                {reviewResult.score}<span style={{ fontSize: '24px', color: 'var(--crimson-core)' }}>/100</span>
              </div>
              <div style={{ fontSize: '12px', color: reviewResult.score >= 80 ? '#00f5a0' : '#ffd000' }}>
                {reviewResult.score >= 85 ? 'WARRIOR CLASS — DOMINANT DAY' : reviewResult.score >= 70 ? 'PASSING STANDARD — ROOM TO FORGE' : 'BELOW STANDARD — NO EXCUSES'}
              </div>
            </div>

            {/* KRATOS debrief */}
            <div className="coach-bubble" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--crimson-core)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                KRATOS Debrief
              </div>
              <p style={{ fontSize: '13px', color: '#f1f5f9', lineHeight: 1.5 }}>
                {reviewResult.review}
              </p>
            </div>

            {/* Wins & Weaknesses */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {reviewResult.wins?.map((w, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#00f5a0' }}>
                  <CheckCircle size={14} />
                  <span>{w}</span>
                </div>
              ))}
              {reviewResult.weaknesses?.map((w, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#ff527b' }}>
                  <AlertTriangle size={14} />
                  <span>{w}</span>
                </div>
              ))}
            </div>

            <button
              className="btn btn-crimson"
              style={{ width: '100%', gap: '8px' }}
              onClick={handleFinalizeReview}
              id="btn-lock-day-score"
            >
              <span>Lock In Score & Bank Streak 🔥</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
