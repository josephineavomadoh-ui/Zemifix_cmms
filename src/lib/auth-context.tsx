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

export interface LoginResult {
  success: boolean;
  otpRequired?: boolean;
  channel?: 'EMAIL' | 'SMS';
  destination?: string;
  message?: string;
  error?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  user?: UserSession;
  error?: string;
  attemptsRemaining?: number;
  isExpired?: boolean;
}

export interface ResendOtpResult {
  success: boolean;
  destination?: string;
  channel?: 'EMAIL' | 'SMS';
  message?: string;
  error?: string;
  retryAfterSeconds?: number;
  isExpired?: boolean;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  selectedBranch: string;
  setSelectedBranch: (branchName: string) => void;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyOtp: (code: string) => Promise<VerifyOtpResult>;
  resendOtp: () => Promise<ResendOtpResult>;
  loginDemo: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
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
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          if (data.user.branch?.name) {
            setSelectedBranch(data.user.branch.name);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to retrieve session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.message || data.error || 'Authentication failed',
        };
      }

      return {
        success: true,
        otpRequired: data.otpRequired === true,
        channel: data.channel,
        destination: data.destination,
        message: data.message,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error during authentication',
      };
    }
  };

  const verifyOtp = async (code: string): Promise<VerifyOtpResult> => {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.message || data.error || 'Verification failed',
          attemptsRemaining: data.attemptsRemaining,
          isExpired: res.status === 401,
        };
      }

      if (data.authenticated && data.user) {
        setUser(data.user);
        if (data.user.branch?.name) {
          setSelectedBranch(data.user.branch.name);
        }
        return { success: true, user: data.user };
      }

      return { success: false, error: 'Verification succeeded but user payload missing' };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error during verification',
      };
    }
  };

  const resendOtp = async (): Promise<ResendOtpResult> => {
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.message || data.error || 'Failed to resend authentication code',
          retryAfterSeconds: data.retryAfterSeconds,
          isExpired: res.status === 401,
        };
      }

      return {
        success: true,
        destination: data.destination,
        channel: data.channel,
        message: data.message,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error during resend',
      };
    }
  };

  const loginDemo = async () => {
    try {
      const res = await fetch('/api/auth/demo-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || data.error || 'Demo session failed' };
      }

      setUser(data.user);
      if (data.user?.branch?.name) {
        setSelectedBranch(data.user.branch.name);
      }
      router.push('/dashboard');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error initiating demo session' };
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
        verifyOtp,
        resendOtp,
        loginDemo,
        logout,
        refreshUser: fetchSession,
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
