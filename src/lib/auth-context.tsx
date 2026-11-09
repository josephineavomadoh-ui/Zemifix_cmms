'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
    code: string;
    type: string;
  };
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
  accessScope: string;
  approvalLimit?: number | null;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  selectedBranch: string;
  setSelectedBranch: (branchName: string) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  startDemoSession: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState('Accra Head Office');
  const router = useRouter();

  const fetchSession = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me');
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.authenticated && data.user) {
        setUser(data.user);
        if (data.user.branch?.name) {
          setSelectedBranch(data.user.branch.name);
        }
        return;
      }

      setUser(null);
    } catch (err) {
      console.error('Failed to retrieve session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const startDemoSession = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/demo-session', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.user) {
        setUser(data.user);
        if (data.user.branch?.name) {
          setSelectedBranch(data.user.branch.name);
        }
        return { success: true };
      }
      return { success: false, error: data.message || 'Demonstration session unavailable' };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      setUser(data.user);
      if (data.user.branch?.name) {
        setSelectedBranch(data.user.branch.name);
      }
      router.push('/dashboard');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        selectedBranch,
        setSelectedBranch,
        login,
        logout,
        refreshUser: fetchSession,
        startDemoSession,
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
