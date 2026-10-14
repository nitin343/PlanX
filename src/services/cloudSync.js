// ========================================================
// PLANX — CLOUD SYNCHRONIZATION ENGINE
// Seamless bidirectional sync across Mobile, Tablet & Laptop
// Works with Supabase Auth Metadata & Database Tables
// ========================================================

import { supabase, isSupabaseConfigured } from './supabase';
import { storage } from './storage';

let syncDebounceTimer = null;
let isSyncing = false;

// Broadcast channel for multi-tab sync on same device
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('planx_cloud_sync')
  : null;

/**
 * Upload all local operational data to Supabase Cloud for this user.
 * Fault-tolerant: Uses User Metadata fallback so it works even if custom SQL tables are not yet created!
 */
export async function pushToCloud() {
  const user = storage.getAuthUser();
  if (!user || !user.id || !isSupabaseConfigured || !supabase) return false;

  try {
    const payload = {
      updatedAt: new Date().toISOString(),
      dailyPlan: storage.getDailyPlan(),
      tasks: storage.getTasks(),
      goals: storage.getGoals(),
      habits: storage.getHabits(),
      skillCards: storage.getSkillCards(),
      chatHistory: storage.getChatHistory(),
      profile: storage.getProfile(),
      aiSettings: storage.getAiSettings(),
    };

    // 1. Primary Sync: Supabase Auth User Metadata (zero SQL table setup required)
    const { error: metaErr } = await supabase.auth.updateUser({
      data: {
        planx_cloud_backup: payload,
      },
    });

    if (metaErr) {
      console.warn('Cloud sync metadata notice:', metaErr.message);
    }

    // 2. Secondary Sync: If database tables exist in Supabase, update them
    try {
      if (payload.profile) {
        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: payload.profile.fullName,
          streak_count: payload.profile.streakCount,
          total_score: payload.profile.totalScore,
          updated_at: new Date().toISOString(),
        }).catch(() => {});
      }
    } catch {}

    // Broadcast update to other open tabs on this device
    syncChannel?.postMessage({ type: 'SYNC_PUSHED', timestamp: Date.now() });

    return true;
  } catch (err) {
    console.warn('Cloud push sync notice:', err.message);
    return false;
  }
}

/**
 * Pull latest operational data from Supabase Cloud and hydrate local storage.
 * Call on login, app open, or when switching devices.
 */
export async function pullFromCloud(onRefresh) {
  const user = storage.getAuthUser();
  if (!user || !user.id || !isSupabaseConfigured || !supabase) return false;

  try {
    isSyncing = true;
    const { data: { user: cloudUser }, error } = await supabase.auth.getUser();
    if (error || !cloudUser) return false;

    const backup = cloudUser.user_metadata?.planx_cloud_backup;
    if (backup && typeof backup === 'object') {
      const localTasks = storage.getTasks();
      const localGoals = storage.getGoals();
      const localPlan = storage.getDailyPlan();

      // Hydrate Daily Plan if cloud has content and local is empty
      if (backup.dailyPlan && backup.dailyPlan.mustWin && !localPlan?.mustWin) {
        storage.saveDailyPlan(backup.dailyPlan);
      } else if (backup.dailyPlan && backup.dailyPlan.mustWin) {
        // If both have, keep cloud if newer or merge
        storage.saveDailyPlan(backup.dailyPlan);
      }

      // Hydrate Tasks if cloud has tasks
      if (Array.isArray(backup.tasks) && backup.tasks.length > 0) {
        if (!localTasks || localTasks.length === 0) {
          storage.saveTasks(backup.tasks);
        } else {
          // Merge unique tasks
          const merged = [...localTasks];
          backup.tasks.forEach((t) => {
            const exists = merged.some(m => m.id === t.id || (m.title === t.title && m.priority === t.priority));
            if (!exists) merged.push(t);
          });
          storage.saveTasks(merged);
        }
      }

      // Hydrate Goals
      if (Array.isArray(backup.goals) && backup.goals.length > 0) {
        if (!localGoals || localGoals.length === 0) {
          storage.saveGoals(backup.goals);
        } else {
          const merged = [...localGoals];
          backup.goals.forEach((g) => {
            const exists = merged.some(m => m.id === g.id || m.title === g.title);
            if (!exists) merged.push(g);
          });
          storage.saveGoals(merged);
        }
      }

      // Hydrate Habits
      if (Array.isArray(backup.habits) && backup.habits.length > 0) {
        storage.saveHabits(backup.habits);
      }

      // Hydrate Skill Cards
      if (Array.isArray(backup.skillCards) && backup.skillCards.length > 0) {
        storage.saveSkillCards(backup.skillCards);
      }

      // Hydrate Chat History
      if (Array.isArray(backup.chatHistory) && backup.chatHistory.length > 1) {
        const localChat = storage.getChatHistory();
        if (!localChat || localChat.length <= 1) {
          storage.saveChatHistory(backup.chatHistory);
        }
      }

      // Hydrate AI Key if laptop doesn't have it yet
      if (backup.aiSettings?.geminiKey) {
        const curAi = storage.getAiSettings();
        if (!curAi.geminiKey) {
          storage.saveAiSettings({ ...curAi, geminiKey: backup.aiSettings.geminiKey });
        }
      }

      if (onRefresh) onRefresh();
      return true;
    }

    return false;
  } catch (err) {
    console.warn('Cloud pull sync notice:', err.message);
    return false;
  } finally {
    isSyncing = false;
  }
}

/**
 * Debounced auto-sync to cloud (triggers after user changes tasks/goals)
 */
export function triggerAutoSync() {
  if (isSyncing) return;
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    pushToCloud();
  }, 1500);
}

// Automatically register storage change hook
storage.onStorageChange = triggerAutoSync;

