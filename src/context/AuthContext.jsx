import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { storage } from '../services/storage';
import { pullFromCloud, pushToCloud } from '../services/cloudSync';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // CRITICAL FIX: Initialize user immediately from persistent storage so refresh NEVER drops the session!
  const [user, setUser] = useState(() => storage.getAuthUser());
  const [profile, setProfile] = useState(() => storage.getProfile());
  const [loading, setLoading] = useState(() => !storage.getAuthUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'

  // Two-way encrypted sync for User Profile & Gemini API Key
  const syncCloudProfile = async (appUser) => {
    if (!isSupabaseConfigured || !supabase || !appUser?.id) return;
    try {
      const { data: cloudProf, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', appUser.id)
        .single();

      const curAi = storage.getAiSettings();

      if (!error && cloudProf) {
        // 1. If cloud has an encrypted Gemini API key, decrypt and store locally
        if (cloudProf.gemini_api_key) {
          const decrypted = storage._decryptVal(cloudProf.gemini_api_key, appUser.id);
          if (decrypted && decrypted.trim()) {
            storage.saveAiSettings({ ...curAi, geminiKey: decrypted.trim() });
          }
        } else if (curAi.geminiKey && curAi.geminiKey.trim()) {
          // Cloud has no key, but local device has one -> upload encrypted to cloud!
          const encrypted = storage._encryptVal(curAi.geminiKey.trim(), appUser.id);
          await supabase.from('profiles').update({
            gemini_api_key: encrypted,
            updated_at: new Date().toISOString(),
          }).eq('id', appUser.id);
        }

        // 2. Sync profile fields
        const localProf = storage.getProfile();
        const merged = {
          ...localProf,
          name: cloudProf.full_name || localProf.name,
          streakCount: cloudProf.streak_count ?? localProf.streakCount,
        };
        storage.saveProfile(merged);
        setProfile(merged);
      } else if (error && (error.code === 'PGRST116' || error.message?.includes('No rows'))) {
        // Row does not exist yet -> create row with encrypted key
        const localProf = storage.getProfile();
        const encrypted = curAi.geminiKey ? storage._encryptVal(curAi.geminiKey.trim(), appUser.id) : null;
        await supabase.from('profiles').upsert({
          id: appUser.id,
          full_name: appUser.user_metadata?.full_name || appUser.email?.split('@')[0],
          gemini_api_key: encrypted,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Cloud profile sync note:', err.message);
    }
  };

  const syncAiKeyToCloud = async (keyToSync) => {
    if (!user?.id || !isSupabaseConfigured || !supabase) return;
    try {
      const encrypted = keyToSync ? storage._encryptVal(keyToSync.trim(), user.id) : null;
      await supabase.from('profiles').upsert({
        id: user.id,
        gemini_api_key: encrypted,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Failed to sync encrypted key to cloud:', err.message);
    }
  };

  // Sync Supabase Auth session on mount and auth changes without dropping persistent session
  useEffect(() => {
    // 1. Prolong mobile & desktop rolling session expiration (90 days)
    storage.touchSession();

    const localUser = storage.getAuthUser();
    if (localUser) {
      setUser(localUser);
      syncCloudProfile(localUser).catch(() => {});
      pullFromCloud(() => setProfile(storage.getProfile())).catch(() => {});
    }

    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          storage.setAuthUser(session.user);
          setUser(session.user);
          await syncCloudProfile(session.user);
          await pullFromCloud(() => setProfile(storage.getProfile()));
          setProfile(storage.getProfile());
        } else {
          // Cloud session is null (or offline/unconfirmed email user)
          // DO NOT wipe the user session! Keep the persistent local session active!
          const saved = storage.getAuthUser();
          if (saved) {
            setUser(saved);
          }
        }
        setLoading(false);
      }).catch((err) => {
        console.warn('Session retrieval error (maintaining persistent offline session):', err);
        const saved = storage.getAuthUser();
        if (saved) setUser(saved);
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          // Explicit sign out is handled by signOut()
          return;
        }

        if (session?.user) {
          storage.setAuthUser(session.user);
          setUser(session.user);
          await syncCloudProfile(session.user);
          await pullFromCloud(() => setProfile(storage.getProfile()));
          setProfile(storage.getProfile());
        }
      });

      return () => subscription.unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const updateProfile = (updates) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    storage.saveProfile(updated);
  };

  const incrementStreak = () => {
    const updated = {
      ...profile,
      streakCount: (profile.streakCount || 0) + 1,
      longestStreak: Math.max((profile.streakCount || 0) + 1, profile.longestStreak || 0),
    };
    updateProfile(updated);
  };

  // Resend confirmation email helper
  const resendConfirmationEmail = async (email) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
      });
      if (error) throw error;
      return true;
    }
    return false;
  };

  // Sign In user (Supabase with Local Registry fallback & unconfirmed email auto-pass)
  const signIn = async (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase();

    // 1. Try Supabase cloud sign-in first
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email: cleanEmail, 
          password 
        });

        if (!error && data?.user) {
          storage.setAuthUser(data.user);
          setUser(data.user);
          await syncCloudProfile(data.user);
          await pullFromCloud(() => setProfile(storage.getProfile()));
          setProfile(storage.getProfile());
          return data;
        }

        // Supabase returns "Email not confirmed" ONLY IF the password is 100% correct!
        if (error && error.message?.toLowerCase().includes('email not confirmed')) {
          console.info('Supabase: Password verified. Auto-authorizing operator session.');
          const localUser = storage.findLocalUser(cleanEmail);
          const appUser = {
            id: localUser?.id || `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
            email: cleanEmail,
            user_metadata: { full_name: localUser?.fullName || cleanEmail.split('@')[0] },
          };
          storage.saveLocalUser({
            id: appUser.id,
            email: cleanEmail,
            password,
            fullName: appUser.user_metadata.full_name,
            geminiKey: localUser?.geminiKey || '',
          });
          storage.setAuthUser(appUser);
          setUser(appUser);
          setProfile(storage.getProfile());
          return { user: appUser, emailConfirmationPending: true };
        }

        if (error) {
          console.warn('Supabase sign-in note:', error.message);
          // If credentials failed on cloud, check local registry in case password matches local
          const localUser = storage.findLocalUser(cleanEmail);
          if (localUser && localUser.password === password) {
            const appUser = {
              id: localUser.id,
              email: localUser.email,
              user_metadata: { full_name: localUser.fullName },
            };
            storage.setAuthUser(appUser);
            setUser(appUser);
            if (localUser.geminiKey) {
              const cur = storage.getAiSettings();
              storage.saveAiSettings({ ...cur, geminiKey: localUser.geminiKey });
            }
            setProfile(storage.getProfile());
            return { user: appUser };
          }
          throw error;
        }
      } catch (sbErr) {
        if (sbErr.message?.toLowerCase().includes('email not confirmed')) {
          const localUser = storage.findLocalUser(cleanEmail);
          const appUser = {
            id: localUser?.id || `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
            email: cleanEmail,
            user_metadata: { full_name: localUser?.fullName || cleanEmail.split('@')[0] },
          };
          storage.saveLocalUser({
            id: appUser.id,
            email: cleanEmail,
            password,
            fullName: appUser.user_metadata.full_name,
            geminiKey: localUser?.geminiKey || '',
          });
          storage.setAuthUser(appUser);
          setUser(appUser);
          setProfile(storage.getProfile());
          return { user: appUser, emailConfirmationPending: true };
        }
        throw sbErr;
      }
    }

    // 2. Check local accounts registry on this device
    const localUser = storage.findLocalUser(cleanEmail);
    if (localUser) {
      if (localUser.password === password) {
        const appUser = {
          id: localUser.id,
          email: localUser.email,
          user_metadata: { full_name: localUser.fullName },
        };
        storage.setAuthUser(appUser);
        setUser(appUser);
        if (localUser.geminiKey) {
          const cur = storage.getAiSettings();
          storage.saveAiSettings({ ...cur, geminiKey: localUser.geminiKey });
        }
        setProfile(storage.getProfile());
        return { user: appUser };
      } else {
        throw new Error('Incorrect password for this account.');
      }
    }

    // 3. Neither found
    throw new Error(`Email "${cleanEmail}" not found in database. If you previously saw "email rate limit exceeded", the cloud account creation was blocked by Supabase. Please click "Create Account" to register.`);
  };

  // Sign Up new user (Supabase with Local Fallback)
  const signUp = async (email, password, fullName, geminiKey = '') => {
    const cleanEmail = (email || '').trim().toLowerCase();

    // Save locally first so the user is never locked out
    const localUserObj = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: cleanEmail,
      password,
      fullName: fullName || 'Operator',
      geminiKey: geminiKey || '',
      createdAt: new Date().toISOString(),
    };
    storage.saveLocalUser(localUserObj);

    // Try Supabase registration
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { full_name: fullName },
          },
        });

        if (error) {
          // If rate limited or error, fall back to local user so operator is not blocked
          if (error.message?.toLowerCase().includes('rate limit')) {
            console.warn('Supabase rate limited, creating local user account instead.');
            const appUser = {
              id: localUserObj.id,
              email: localUserObj.email,
              user_metadata: { full_name: fullName },
            };
            storage.setAuthUser(appUser);
            setUser(appUser);
            if (geminiKey && geminiKey.trim()) {
              const cur = storage.getAiSettings();
              storage.saveAiSettings({ ...cur, geminiKey: geminiKey.trim() });
            }
            setProfile(storage.getProfile());
            return { user: appUser };
          }
          throw error;
        }

        if (data?.user) {
          storage.setAuthUser(data.user);
          setUser(data.user);

          if (geminiKey && geminiKey.trim()) {
            const cur = storage.getAiSettings();
            storage.saveAiSettings({ ...cur, geminiKey: geminiKey.trim() });
          }

          setProfile(storage.getProfile());
          return data;
        }
      } catch (err) {
        if (err.message?.toLowerCase().includes('rate limit')) {
          const appUser = {
            id: localUserObj.id,
            email: localUserObj.email,
            user_metadata: { full_name: fullName },
          };
          storage.setAuthUser(appUser);
          setUser(appUser);
          if (geminiKey && geminiKey.trim()) {
            const cur = storage.getAiSettings();
            storage.saveAiSettings({ ...cur, geminiKey: geminiKey.trim() });
          }
          setProfile(storage.getProfile());
          return { user: appUser };
        }
        throw err;
      }
    }

    // Pure local activation
    const appUser = {
      id: localUserObj.id,
      email: localUserObj.email,
      user_metadata: { full_name: fullName },
    };
    storage.setAuthUser(appUser);
    setUser(appUser);
    if (geminiKey && geminiKey.trim()) {
      const cur = storage.getAiSettings();
      storage.saveAiSettings({ ...cur, geminiKey: geminiKey.trim() });
    }
    setProfile(storage.getProfile());
    return { user: appUser };
  };

  // Sign Out user
  const signOut = async () => {
    storage.setAuthUser(null);
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    setUser(null);
  };

  const openLogin = () => {
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };

  const openSignUp = () => {
    setAuthMode('signup');
    setIsAuthModalOpen(true);
  };

  const loginGuest = () => {
    const guestUser = {
      id: 'guest_operator',
      email: 'guest@planx.local',
      user_metadata: { full_name: 'Guest Operator' },
    };
    storage.setAuthUser(guestUser);
    setUser(guestUser);
    setProfile(storage.getProfile());
    return guestUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isSupabaseConfigured,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authMode,
        setAuthMode,
        openLogin,
        openSignUp,
        signIn,
        signUp,
        loginGuest,
        resendConfirmationEmail,
        signOut,
        updateProfile,
        incrementStreak,
        syncAiKeyToCloud,
        syncCloudProfile,
        pullFromCloud,
        pushToCloud,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
