'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type User = { id: string; email?: string } | null;

interface SessionContextType {
  user: User;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user || null);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error('Failed to load session', e);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    }
    setUser(null);
    localStorage.clear();
    sessionStorage.clear();
    // Broadcast logout to other tabs
    try {
      const bc = new BroadcastChannel('session');
      bc.postMessage({ type: 'logout' });
      bc.close();
    } catch (e) {
      // Ignore if BroadcastChannel unsupported
    }

    router.replace('/login');
  }

  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('session');
      bc.onmessage = (ev) => {
        if (ev.data?.type === 'logout') {
          setUser(null);
          localStorage.clear();
          sessionStorage.clear();
          router.replace('/login');
        }
      };
    } catch (e) {
      // BroadcastChannel not supported
    }
    return () => {
      if (bc) bc.close();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </SessionContext.Provider>
  );
};

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
