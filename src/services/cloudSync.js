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
 * Verifies if there is an active authenticated Supabase session on this device.
 */
export async function checkCloudSession() {
  if (!isSupabaseConfigured || !supabase) {
    return { isReady: false, reason: 'Supabase cloud is not configured.' };
  }
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session || !session.user) {
      return { 
        isReady: false, 
        reason: 'No active Supabase cloud session on this device. Please log in with your account to enable sync.' 
      };
    }
    return { isReady: true, user: session.user };
  } catch (err) {
    return { isReady: false, reason: err.message || 'Could not verify cloud session.' };
  }
}

/**
 * Upload all local operational data to Supabase Cloud for this user.
 * Directly persists Gemini API Key to Supabase user metadata and profiles table.
 */
export async function pushToCloud() {
  const sessionCheck = await checkCloudSession();
  if (!sessionCheck.isReady) {
    return { success: false, error: sessionCheck.reason };
  }

  const user = sessionCheck.user;

  try {
    const tasks = storage.getTasks() || [];
    const goals = storage.getGoals() || [];
    const habits = storage.getHabits() || [];
    const dailyPlan = storage.getDailyPlan() || {};
    const skillCards = storage.getSkillCards() || [];
    const profile = storage.getProfile() || {};
    const curAi = storage.getAiSettings() || {};
    const geminiKey = curAi.geminiKey?.trim() || '';

    const payload = {
      updatedAt: new Date().toISOString(),
      dailyPlan,
      tasks,
      goals,
      habits,
      skillCards,
      profile,
      aiSettings: {
        geminiKey: geminiKey,
        preferredModel: curAi.preferredModel || 'gemini-2.5-flash',
        spendingCapDollars: curAi.spendingCapDollars,
      },
    };

    // 1. Primary Sync: Supabase Auth User Metadata (zero SQL table setup required)
    const { error: metaErr } = await supabase.auth.updateUser({
      data: {
        planx_cloud_backup: payload,
        gemini_api_key: geminiKey || null,
      },
    });

    if (metaErr) {
      console.warn('Metadata sync note:', metaErr.message);
    }

    // 2. Direct Sync: Supabase profiles table
    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: profile.fullName || user.email?.split('@')[0],
        gemini_api_key: geminiKey || null,
        wake_time: profile.wakeTime || '05:00',
        sleep_time: profile.sleepTime || '23:00',
        streak_count: profile.streakCount || 0,
        total_score: profile.totalScore || 0,
        updated_at: new Date().toISOString(),
      });
    } catch (profErr) {
      console.warn('Profiles table sync note:', profErr.message);
    }

    // Broadcast update to other open tabs on this device
    syncChannel?.postMessage({ type: 'SYNC_PUSHED', timestamp: Date.now() });

    return {
      success: true,
      summary: `${tasks.length} tasks, ${goals.length} goals, ${habits.length} habits${geminiKey ? ', and Gemini API Key' : ''}`,
    };
  } catch (err) {
    console.warn('Cloud push sync error:', err.message);
    return { success: false, error: err.message || 'Failed to upload data to cloud.' };
  }
}

/**
 * Pull latest operational data from Supabase Cloud and hydrate local storage.
 * Directly transfers Gemini API Key from cloud to local storage.
 */
export async function pullFromCloud(onRefresh) {
  const sessionCheck = await checkCloudSession();
  if (!sessionCheck.isReady) {
    return { success: false, error: sessionCheck.reason };
  }

  const user = sessionCheck.user;

  try {
    isSyncing = true;
    let geminiKeyTransferred = false;

    // 1. Direct transfer from profiles table
    try {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileRow?.gemini_api_key) {
        const curAi = storage.getAiSettings();
        if (curAi.geminiKey !== profileRow.gemini_api_key) {
          storage.saveAiSettings({
            ...curAi,
            geminiKey: profileRow.gemini_api_key,
          });
          geminiKeyTransferred = true;
        }
      }
    } catch (pErr) {
      console.warn('Profile key pull note:', pErr.message);
    }

    // 2. Pull from Supabase user metadata
    const { data: { user: cloudUser }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !cloudUser) {
      return { success: false, error: userErr?.message || 'Could not fetch cloud user profile.' };
    }

    const backup = cloudUser.user_metadata?.planx_cloud_backup;
    const metaGeminiKey = cloudUser.user_metadata?.gemini_api_key;

    if (metaGeminiKey) {
      const curAi = storage.getAiSettings();
      if (curAi.geminiKey !== metaGeminiKey) {
        storage.saveAiSettings({
          ...curAi,
          geminiKey: metaGeminiKey,
        });
        geminiKeyTransferred = true;
      }
    }

    if (backup && typeof backup === 'object') {
      const localTasks = storage.getTasks() || [];
      const localGoals = storage.getGoals() || [];
      const localPlan = storage.getDailyPlan() || {};

      // Hydrate Daily Plan
      if (backup.dailyPlan && backup.dailyPlan.mustWin) {
        storage.saveDailyPlan(backup.dailyPlan);
      }

      // Hydrate Tasks
      if (Array.isArray(backup.tasks) && backup.tasks.length > 0) {
        if (!localTasks || localTasks.length === 0) {
          storage.saveTasks(backup.tasks);
        } else {
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

      // Hydrate AI Key if backup has it
      if (backup.aiSettings?.geminiKey) {
        const curAi = storage.getAiSettings();
        if (curAi.geminiKey !== backup.aiSettings.geminiKey) {
          storage.saveAiSettings({
            ...curAi,
            geminiKey: backup.aiSettings.geminiKey,
          });
          geminiKeyTransferred = true;
        }
      }

      if (onRefresh) onRefresh();
      return {
        success: true,
        summary: `${backup.tasks?.length || 0} tasks, ${backup.goals?.length || 0} goals${geminiKeyTransferred ? ', and Gemini API Key' : ''}`,
      };
    }

    if (onRefresh) onRefresh();
    return {
      success: true,
      summary: geminiKeyTransferred ? 'Gemini API Key synchronized from cloud' : 'Cloud session active',
    };
  } catch (err) {
    console.warn('Cloud pull sync error:', err.message);
    return { success: false, error: err.message || 'Failed to pull data from cloud.' };
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


