// ========================================================
// PLANX — LOCAL STORAGE & PERSISTENCE ENGINE
// Works 100% offline with zero latency, syncs with Supabase
// ========================================================

const STORAGE_KEYS = {
  PROFILE: 'planx_profile',
  DAILY_PLAN: 'planx_daily_plan',
  TASKS: 'planx_tasks',
  GOALS: 'planx_goals',
  HABITS: 'planx_habits',
  HABIT_LOGS: 'planx_habit_logs',
  DAY_SCORES: 'planx_day_scores',
  MEMORY_CARDS: 'planx_memory_cards',
  AI_CHAT: 'planx_ai_chat',
  AI_SETTINGS: 'planx_ai_settings',
  AI_METRICS: 'planx_ai_metrics',
  USERS_LIST: 'planx_users_list',
  ACTIVE_USER_ID: 'planx_active_user_id',
};

const getTodayString = () => new Date().toISOString().split('T')[0];

const defaultUsersList = [
  {
    id: 'usr_commander',
    email: 'commander@planx.io',
    fullName: 'Commander',
    callsign: 'Apex-1',
    role: 'Lead Operator',
    avatar: '🛡️',
    aiTone: 'aggressive',
    wakeTime: '05:00',
    sleepTime: '23:00',
    streakCount: 14,
    longestStreak: 19,
    totalScore: 1140,
    isCloudSynced: false,
    archtype: 'engineering',
    createdAt: '2026-10-01',
  },
];

const defaultProfile = {
  fullName: 'Commander',
  wakeTime: '05:00',
  sleepTime: '23:00',
  workStart: '09:00',
  workEnd: '18:00',
  streakCount: 14,
  longestStreak: 19,
  totalScore: 1140,
  aiTone: 'aggressive', // 'aggressive' | 'tactical' | 'mentor'
};

const defaultPlan = {
  planDate: getTodayString(),
  mustWin: 'Ship Core PlanX PWA Module & Complete LeetCode DP problem',
  shouldDo: [
    'Deep Work Block: Review Siemens Edge Architecture',
    'Hit 45-min gym workout / High Intensity cardio',
  ],
  couldDo: [
    'Review 5 spaced repetition system flashcards',
    'Read 1 chapter on Distributed Systems',
    'Hydration check: 3.5 Liters water',
  ],
  aiMotivation: 'Excuses are for the weak. You have 14 days of momentum on the line. Win your morning, execute the Must-Win without hesitation, and earn your rest tonight.',
  status: 'active',
};

const defaultTasks = [
  {
    id: 't-1',
    title: 'Ship Core PlanX PWA Module & LeetCode DP',
    priority: 'must_win',
    category: 'skills',
    completed: false,
    estimatedMinutes: 90,
    actualMinutes: 45,
  },
  {
    id: 't-2',
    title: 'Deep Work Block: Review Siemens Edge Architecture',
    priority: 'should_do',
    category: 'work',
    completed: true,
    estimatedMinutes: 60,
    actualMinutes: 60,
  },
  {
    id: 't-3',
    title: 'Hit 45-min gym workout / High Intensity cardio',
    priority: 'should_do',
    category: 'health',
    completed: false,
    estimatedMinutes: 45,
    actualMinutes: 0,
  },
  {
    id: 't-4',
    title: 'Review 5 spaced repetition system flashcards',
    priority: 'could_do',
    category: 'skills',
    completed: false,
    estimatedMinutes: 15,
    actualMinutes: 0,
  },
];

const defaultGoals = [
  {
    id: 'g-1',
    title: '21-Day Elite Discipline Sprint',
    description: 'Zero skipped workouts, 5:00 AM wake up, daily LeetCode.',
    durationType: '21_day',
    startDate: getTodayString(),
    dayCurrent: 14,
    dayTotal: 21,
    status: 'active',
    category: 'discipline',
  },
  {
    id: 'g-2',
    title: '90-Day System Design & LeetCode Mastery',
    description: 'Solve 150 curated problems and master microservice patterns.',
    durationType: '90_day',
    startDate: getTodayString(),
    dayCurrent: 38,
    dayTotal: 90,
    status: 'active',
    category: 'career',
  },
];

const defaultHabits = [
  { id: 'h-1', name: '5:00 AM Wakeup & Cold Water', streak: 14, completedToday: true },
  { id: 'h-2', name: '45-Min Intense Physical Training', streak: 12, completedToday: false },
  { id: 'h-3', name: '1 LeetCode Problem Solved', streak: 14, completedToday: true },
  { id: 'h-4', name: 'Zero Junk Food / Clean Diet', streak: 8, completedToday: true },
  { id: 'h-5', name: 'Night War Room Debrief & Journal', streak: 13, completedToday: false },
];

const defaultCards = [
  {
    id: 'c-1',
    front: 'What is CAP Theorem in Distributed Databases?',
    back: 'A distributed system can guarantee at most 2 out of 3: Consistency (every read gets latest write), Availability (every request receives a non-error response), and Partition Tolerance (system continues despite dropped messages).',
    category: 'System Design',
    interval: 3,
    difficulty: 2,
    nextReview: getTodayString(),
  },
  {
    id: 'c-2',
    front: 'Two Pointers vs Sliding Window: When to use which?',
    back: 'Two Pointers is used when comparing elements from two ends or sorted arrays (e.g. 2Sum II, container with most water). Sliding Window is used for contiguous subarray/substring problems with dynamic or fixed bounds.',
    category: 'Algorithms',
    interval: 1,
    difficulty: 1,
    nextReview: getTodayString(),
  },
  {
    id: 'c-3',
    front: 'What is the SM-2 Spaced Repetition Algorithm?',
    back: 'Calculates the optimal interval to review a card based on repetition count, ease factor (initial 2.5), and recall quality (0-5 rating) so memory decays slower.',
    category: 'Learning',
    interval: 5,
    difficulty: 1,
    nextReview: getTodayString(),
  },
];

const CURRENT_USER_KEY = 'planx_current_auth_user';

export const storage = {
  getAuthUser: () => {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setAuthUser: (user) => {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  },

  getLocalUsers: () => {
    try {
      const data = localStorage.getItem('planx_registered_users');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveLocalUser: (userRecord) => {
    const list = storage.getLocalUsers();
    const idx = list.findIndex(u => u.email?.toLowerCase() === userRecord.email?.toLowerCase());
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...userRecord };
    } else {
      list.push(userRecord);
    }
    localStorage.setItem('planx_registered_users', JSON.stringify(list));
  },

  findLocalUser: (email) => {
    const list = storage.getLocalUsers();
    return list.find(u => u.email?.toLowerCase() === email?.toLowerCase());
  },

  getUserKey: (baseKey) => {
    const user = storage.getAuthUser();
    return user && user.id ? `planx_${user.id}_${baseKey}` : `planx_guest_${baseKey}`;
  },

  getProfile: () => {
    const key = storage.getUserKey('profile');
    const data = localStorage.getItem(key);
    if (data) {
      try { return JSON.parse(data); } catch {}
    }
    const user = storage.getAuthUser();
    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Operator';
    return {
      fullName: displayName,
      email: user?.email || '',
      wakeTime: '05:30',
      sleepTime: '23:00',
      workStart: '09:00',
      workEnd: '18:00',
      streakCount: 0,
      longestStreak: 0,
      totalScore: 0,
      aiTone: 'aggressive',
    };
  },
  saveProfile: (profile) => {
    localStorage.setItem(storage.getUserKey('profile'), JSON.stringify(profile));
  },

  getDailyPlan: () => {
    const key = storage.getUserKey('daily_plan');
    const data = localStorage.getItem(key);
    if (!data) {
      return {
        planDate: getTodayString(),
        mustWin: '',
        shouldDo: [],
        couldDo: [],
        aiMotivation: 'Welcome to PlanX. Lock in your Priority 1 Must-Win target for today with KRATOS.',
        status: 'active',
      };
    }
    try {
      const plan = JSON.parse(data);
      if (plan.planDate !== getTodayString()) {
        plan.planDate = getTodayString();
      }
      return plan;
    } catch {
      return {
        planDate: getTodayString(),
        mustWin: '',
        shouldDo: [],
        couldDo: [],
        aiMotivation: 'Welcome to PlanX. Lock in your Priority 1 Must-Win target for today with KRATOS.',
        status: 'active',
      };
    }
  },
  saveDailyPlan: (plan) => {
    localStorage.setItem(storage.getUserKey('daily_plan'), JSON.stringify(plan));
  },

  getTasks: () => {
    const key = storage.getUserKey('tasks');
    const data = localStorage.getItem(key);
    // New user starts with empty tasks []
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },
  saveTasks: (tasks) => {
    localStorage.setItem(storage.getUserKey('tasks'), JSON.stringify(tasks));
  },

  getGoals: () => {
    const key = storage.getUserKey('goals');
    const data = localStorage.getItem(key);
    // New user starts with empty strategic sprints []
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },
  saveGoals: (goals) => {
    localStorage.setItem(storage.getUserKey('goals'), JSON.stringify(goals));
  },

  getHabits: () => {
    const key = storage.getUserKey('habits');
    const data = localStorage.getItem(key);
    // New user starts with empty daily habits []
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },
  saveHabits: (habits) => {
    localStorage.setItem(storage.getUserKey('habits'), JSON.stringify(habits));
  },

  getSkillCards: () => {
    const key = storage.getUserKey('skill_cards');
    const data = localStorage.getItem(key);
    if (data) {
      try { return JSON.parse(data); } catch {}
    }
    // Return empty array by default — user creates everything from scratch
    return [];
  },
  saveSkillCards: (cards) => {
    localStorage.setItem(storage.getUserKey('skill_cards'), JSON.stringify(cards));
  },

  getMemoryCards: () => {
    return storage.getSkillCards();
  },
  saveMemoryCards: (cards) => {
    storage.saveSkillCards(cards);
  },

  // Security Vault: Cipher encryption to prevent plaintext key exposure in localStorage and database
  _getSalt: (userId = '') => {
    return `planx_kratos_vault_${userId ? userId.slice(0, 16) : 'operator'}_2026`;
  },
  _encryptVal: (plainText, userId = '') => {
    if (!plainText) return '';
    try {
      const salt = storage._getSalt(userId);
      const obfuscated = plainText.split('').map((c, i) => 
        String.fromCharCode(c.charCodeAt(0) ^ salt.charCodeAt(i % salt.length))
      ).join('');
      return `enc::${btoa(encodeURIComponent(obfuscated))}`;
    } catch {
      return plainText;
    }
  },
  _decryptVal: (cipherText, userId = '') => {
    if (!cipherText) return '';
    if (!cipherText.startsWith('enc::')) return cipherText; // Backwards compatible with existing plaintext
    try {
      // 1. Try with user-specific salt
      const salt = storage._getSalt(userId);
      const raw = decodeURIComponent(atob(cipherText.slice(5)));
      return raw.split('').map((c, i) => 
        String.fromCharCode(c.charCodeAt(0) ^ salt.charCodeAt(i % salt.length))
      ).join('');
    } catch {
      // 2. Fallback to generic legacy salt if needed
      try {
        const legacySalt = 'planx_kratos_vault_key_2026';
        const raw = decodeURIComponent(atob(cipherText.slice(5)));
        return raw.split('').map((c, i) => 
          String.fromCharCode(c.charCodeAt(0) ^ legacySalt.charCodeAt(i % legacySalt.length))
        ).join('');
      } catch {
        return cipherText;
      }
    }
  },

  getAiSettings: () => {
    const key = storage.getUserKey('ai_settings');
    const data = localStorage.getItem(key);
    const parsed = data ? JSON.parse(data) : {};
    return {
      geminiKey: storage._decryptVal(parsed.geminiKey || ''), // Decrypted on read
      preferredModel: parsed.preferredModel || 'gemini-3.5-flash',
      siemensEndpoint: parsed.siemensEndpoint || '',
      siemensKey: storage._decryptVal(parsed.siemensKey || ''),
      siemensModel: parsed.siemensModel || 'siemens-default',
      spendingCapDollars: parsed.spendingCapDollars !== undefined ? parsed.spendingCapDollars : 1.0,
      dailyCallBudget: parsed.dailyCallBudget || 30,
      personality: parsed.personality || 'aggressive',
    };
  },
  saveAiSettings: (settings) => {
    const secureSettings = {
      ...settings,
      geminiKey: storage._encryptVal(settings.geminiKey || ''), // Encrypted before write
      siemensKey: storage._encryptVal(settings.siemensKey || ''),
    };
    localStorage.setItem(storage.getUserKey('ai_settings'), JSON.stringify(secureSettings));
  },

  getAlarmSettings: () => {
    const key = storage.getUserKey('alarm_settings');
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.alarmTone === 'battle-siren' || !parsed.alarmTone) {
          parsed.alarmTone = 'bansuri-morning';
        }
        if (!Array.isArray(parsed.customAlarms)) {
          parsed.customAlarms = [];
        }
        return parsed;
      } catch {}
    }
    return {
      wakeAlarmEnabled: true,
      wakeAlarmTime: '05:30',
      nightReviewAlarmEnabled: true,
      nightReviewTime: '21:30',
      alarmTone: 'bansuri-morning', // 'bansuri-morning' | 'santoor-sunrise' | 'temple-bell-om'
      alarmVolume: 0.8,
      vibrateEnabled: true,
      notificationsEnabled: true,
      customAlarms: [], // [{ id, title, time, enabled, tone, body, tag }]
    };
  },
  saveAlarmSettings: (settings) => {
    localStorage.setItem(storage.getUserKey('alarm_settings'), JSON.stringify(settings));
  },

  addCustomAlarm: (alarm) => {
    const settings = storage.getAlarmSettings();
    const alarms = settings.customAlarms || [];
    const newAlarm = {
      id: alarm.id || `alm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: alarm.title || 'Focus Checkpoint',
      time: alarm.time || '12:00',
      enabled: alarm.enabled !== false,
      tone: alarm.tone || settings.alarmTone || 'bansuri-morning',
      body: alarm.body || 'Execute with discipline and focus.',
      tag: alarm.tag || 'Focus',
      createdAt: new Date().toISOString(),
      ...alarm,
    };
    settings.customAlarms = [...alarms, newAlarm];
    storage.saveAlarmSettings(settings);
    return newAlarm;
  },

  updateCustomAlarm: (id, updates) => {
    const settings = storage.getAlarmSettings();
    settings.customAlarms = (settings.customAlarms || []).map(a => 
      a.id === id ? { ...a, ...updates } : a
    );
    storage.saveAlarmSettings(settings);
    return settings.customAlarms.find(a => a.id === id);
  },

  deleteCustomAlarm: (id) => {
    const settings = storage.getAlarmSettings();
    settings.customAlarms = (settings.customAlarms || []).filter(a => a.id !== id);
    storage.saveAlarmSettings(settings);
  },

  toggleCustomAlarm: (id) => {
    const settings = storage.getAlarmSettings();
    settings.customAlarms = (settings.customAlarms || []).map(a => 
      a.id === id ? { ...a, enabled: !a.enabled } : a
    );
    storage.saveAlarmSettings(settings);
  },

  getAiMetrics: () => {
    const key = storage.getUserKey('ai_metrics');
    const data = localStorage.getItem(key);
    const today = getTodayString();
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.date === today) return parsed;
      } catch {}
    }
    return {
      date: today,
      callsToday: 0,
      tokensToday: 0,
      estimatedCostUsd: 0.0,
      fallbackCalls: 0,
    };
  },
  incrementAiMetrics: (tokens = 350, isFallback = false) => {
    const metrics = storage.getAiMetrics();
    metrics.callsToday += 1;
    metrics.tokensToday += tokens;
    metrics.estimatedCostUsd += (tokens / 1000000) * 0.15;
    if (isFallback) metrics.fallbackCalls += 1;
    localStorage.setItem(storage.getUserKey('ai_metrics'), JSON.stringify(metrics));
    return metrics;
  },

  getDayScores: () => {
    const key = storage.getUserKey('day_scores');
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },
  saveDayScore: (scoreObj) => {
    const scores = storage.getDayScores();
    const existingIdx = scores.findIndex(s => s.date === scoreObj.date);
    if (existingIdx >= 0) {
      scores[existingIdx] = scoreObj;
    } else {
      scores.unshift(scoreObj);
    }
    localStorage.setItem(storage.getUserKey('day_scores'), JSON.stringify(scores));
  },

  getChatHistory: () => {
    const key = storage.getUserKey('ai_chat');
    const data = localStorage.getItem(key);
    if (data) {
      try { return JSON.parse(data); } catch {}
    }
    return [
      {
        id: 'msg-1',
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `I am KRATOS. Your workspace has been initialized from scratch. What is your Priority 1 Must-Win objective for today? Speak, or command me to forge your strategy.`,
      },
    ];
  },
  saveChatHistory: (msgs) => {
    localStorage.setItem(storage.getUserKey('ai_chat'), JSON.stringify(msgs));
  },

  clearUserSession: (currentUserId) => {
    storage.setAuthUser(null);
  },
};


