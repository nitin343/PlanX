import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { storage } from '../services/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(() => storage.getProfile());
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'

  // Sync Supabase Auth session on mount and auth changes
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const sbUser = session?.user ?? null;
        storage.setAuthUser(sbUser);
        setUser(sbUser);
        if (sbUser) {
          setProfile(storage.getProfile());
        }
        setLoading(false);
      }).catch((err) => {
        console.warn('Session retrieval error:', err);
        storage.setAuthUser(null);
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const sbUser = session?.user ?? null;
        storage.setAuthUser(sbUser);
        setUser(sbUser);
        if (sbUser) {
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
        resendConfirmationEmail,
        signOut,
        updateProfile,
        incrementStreak,
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
