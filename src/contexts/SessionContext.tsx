import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ConventionSession, SystemUser } from '../types/database';
import { db, initSupabase } from '../services/db';

interface SessionContextType {
  user: SystemUser | null;
  activeSession: ConventionSession | null;
  sessions: ConventionSession[];
  loading: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  selectSession: (session: ConventionSession) => void;
  createSession: (session: ConventionSession) => Promise<void>;
  refreshSessions: () => Promise<void>;
  supabaseConfigured: boolean;
  reloadConfig: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SystemUser | null>(null);
  const [activeSession, setActiveSession] = useState<ConventionSession | null>(null);
  const [sessions, setSessions] = useState<ConventionSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [supabaseConfigured, setSupabaseConfigured] = useState<boolean>(false);

  const checkConfig = () => {
    const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('ATLAS_SUPABASE_URL');
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('ATLAS_SUPABASE_ANON_KEY');
    setSupabaseConfigured(!!(url && key));
  };

  const loadSessionData = async () => {
    try {
      setLoading(true);
      const list = await db.getSessions();
      setSessions(list);

      // Load session filter selection if stored
      const savedSession = localStorage.getItem('ATLAS_ACTIVE_SESSION');
      if (savedSession) {
        try {
          setActiveSession(JSON.parse(savedSession));
        } catch (e) {
          console.error('Failed to parse saved session JSON:', e);
          localStorage.removeItem('ATLAS_ACTIVE_SESSION');
        }
      } else if (list.length > 0) {
        setActiveSession(list[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConfig();
    // Load logged in user if stored
    const savedUser = localStorage.getItem('ATLAS_USER');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user JSON:', e);
        localStorage.removeItem('ATLAS_USER');
      }
    }
    loadSessionData();
  }, []);

  const login = async (email: string): Promise<boolean> => {
    // Simple custom email/auth matching for demo; extends to Supabase Auth if needed
    const mockUser: SystemUser = { id: `u-${Math.random().toString(36).substr(2, 9)}`, email };
    setUser(mockUser);
    localStorage.setItem('ATLAS_USER', JSON.stringify(mockUser));
    await loadSessionData();
    return true;
  };

  const logout = () => {
    setUser(null);
    setActiveSession(null);
    localStorage.removeItem('ATLAS_USER');
    localStorage.removeItem('ATLAS_ACTIVE_SESSION');
  };

  const selectSession = (session: ConventionSession) => {
    setActiveSession(session);
    localStorage.setItem('ATLAS_ACTIVE_SESSION', JSON.stringify(session));
  };

  const createSession = async (session: ConventionSession) => {
    await db.addSession(session);
    await loadSessionData();
    selectSession(session);
  };

  const refreshSessions = async () => {
    const list = await db.getSessions();
    setSessions(list);
  };

  const reloadConfig = () => {
    initSupabase();
    checkConfig();
    loadSessionData();
  };

  return (
    <SessionContext.Provider value={{
      user,
      activeSession,
      sessions,
      loading,
      login,
      logout,
      selectSession,
      createSession,
      refreshSessions,
      supabaseConfigured,
      reloadConfig
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
