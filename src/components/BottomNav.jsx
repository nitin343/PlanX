import React from 'react';
import { Swords, Target, Bot, BookOpen, Settings } from 'lucide-react';

export default function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'today', label: 'War Room', icon: Swords },
    { id: 'goals', label: 'Sprints', icon: Target },
    { id: 'kratos', label: 'KRATOS', icon: Bot },
    { id: 'learn', label: 'Upskill', icon: BookOpen },
    { id: 'settings', label: 'Config', icon: Settings },
  ];

  return (
    <nav className="bottom-nav" id="planx-bottom-nav">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            id={`nav-tab-${t.id}`}
            className={`nav-tab ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(t.id)}
          >
            <Icon size={20} className="nav-icon" />
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
