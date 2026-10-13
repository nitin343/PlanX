import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import TodayPage from './pages/TodayPage';
import GoalsPage from './pages/GoalsPage';
import KratosPage from './pages/KratosPage';
import LearnPage from './pages/LearnPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import MorningPlanModal from './components/MorningPlanModal';
import NightReviewModal from './components/NightReviewModal';
import FocusTimerModal from './components/FocusTimerModal';
import AuthModal from './components/AuthModal';
import AlarmOverlayModal from './components/AlarmOverlayModal';
import { useAuth } from './context/AuthContext';
import { storage } from './services/storage';
import { startAlarmScheduler, stopActiveAlarmSiren, startAlarmSiren } from './services/alarms';

export default function App() {
  const { user, loading, isAuthModalOpen, setIsAuthModalOpen } = useAuth();
  const [activeTab, setActiveTab] = useState('today');
  const [isMorningOpen, setIsMorningOpen] = useState(false);
  const [isNightOpen, setIsNightOpen] = useState(false);
  const [isFocusOpen, setIsFocusOpen] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState(null); // { type, time, title, body }
  const [focusTaskTitle, setFocusTaskTitle] = useState('Deep Work Session');
  const [refreshKey, setRefreshKey] = useState(0);

  // Background Alarm Scheduler
  useEffect(() => {
    if (user) {
      startAlarmScheduler((alarmInfo) => {
        setActiveAlarm(alarmInfo);
      });
    }
    return () => {
      stopActiveAlarmSiren();
    };
  }, [user]);

  const handleOpenFocus = (title) => {
    setFocusTaskTitle(title || 'Deep Work Session');
    setIsFocusOpen(true);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Loading Session Gate
  if (loading) {
    return (
      <div className="app-shell" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'linear-gradient(135deg, #ff2a5f, #ff6b35)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 25px rgba(255,42,95,0.5)' }}>
            <span style={{ fontSize: '24px' }}>🛡️</span>
          </div>
          <div style={{ fontWeight: 900, fontSize: '18px', color: '#fff', letterSpacing: '0.04em' }}>PLANX // KRATOS</div>
          <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>AUTHENTICATING SYSTEMS...</div>
        </div>
      </div>
    );
  }

  // Auth Gate: Redirect to AuthPage if user has no active session
  if (!user) {
    return <AuthPage onAuthSuccess={handleRefresh} />;
  }

  return (
    <div className="app-shell" id="planx-root-shell">
      {/* Dynamic Background Atmosphere */}
      <div className="app-atmosphere">
        <div className="atmosphere-orb-1" />
        <div className="atmosphere-orb-2" />
        <div className="atmosphere-grid" />
      </div>

      {/* Futuristic Header */}
      <Header 
        onOpenSettings={() => setActiveTab('settings')} 
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Tab Content */}
      <main style={{ flex: 1, position: 'relative', zIndex: 2 }}>
        {activeTab === 'today' && (
          <TodayPage
            key={`today-${refreshKey}`}
            onOpenMorningPlan={() => setIsMorningOpen(true)}
            onOpenNightReview={() => setIsNightOpen(true)}
            onOpenFocusTimer={handleOpenFocus}
          />
        )}

        {activeTab === 'goals' && <GoalsPage key={`goals-${refreshKey}`} />}
        {activeTab === 'kratos' && <KratosPage key={`kratos-${refreshKey}`} onNavigateTab={setActiveTab} onRefresh={handleRefresh} />}
        {activeTab === 'learn' && <LearnPage key={`learn-${refreshKey}`} />}
        {activeTab === 'settings' && <SettingsPage key={`settings-${refreshKey}`} />}
      </main>

      {/* Mobile-First Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Modals */}
      <MorningPlanModal
        isOpen={isMorningOpen}
        onClose={() => setIsMorningOpen(false)}
        onSavePlan={handleRefresh}
      />

      <NightReviewModal
        isOpen={isNightOpen}
        onClose={() => setIsNightOpen(false)}
        tasks={storage.getTasks()}
        onCompletedReview={handleRefresh}
      />

      <FocusTimerModal
        isOpen={isFocusOpen}
        onClose={() => setIsFocusOpen(false)}
        taskTitle={focusTaskTitle}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleRefresh}
      />

      {/* Cross-Platform Alarm Siren Overlay */}
      <AlarmOverlayModal
        alarmData={activeAlarm}
        onClose={() => setActiveAlarm(null)}
        onSnooze={(alarm) => {
          setTimeout(() => {
            setActiveAlarm(alarm);
          }, 5 * 60 * 1000); // 5 min snooze
        }}
      />
    </div>
  );
}

