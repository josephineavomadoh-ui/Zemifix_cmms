'use client';

import React, { useState } from 'react';
import { useAuth } from '@/src/lib/auth-context';
import { Logo } from '@/src/components/brand/Logo';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@zemifix.local');
  const [password, setPassword] = useState('ReplaceWithStrongAdminPassword!');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-[#F8FAFC] py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <Logo variant="light" width={170} height={48} />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0B1336]">
          Staff Authentication Portal
        </h2>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          Single-company enterprise CMMS deployment for facilities, manufacturing & contractor operations.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200/80 sm:px-10">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication Error</p>
                <p className="mt-0.5 text-rose-700">{error}</p>
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                Work Email Address
              </label>
              <div className="mt-1 relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@zemifix.local"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5B00] focus:border-[#FF5B00]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                Staff Password
              </label>
              <div className="mt-1 relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5B00] focus:border-[#FF5B00]"
                />
              </div>
            </div>

            {/* Quick Helper for Seeded Credentials */}
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5 font-semibold text-[#0B1336]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#FF5B00]" />
                <span>Default Provisioned Admin Account</span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-slate-700">
                Email: <span className="font-bold">admin@zemifix.local</span>
              </p>
              <p className="font-mono text-[10px] text-slate-700">
                Password: <span className="font-bold">ReplaceWithStrongAdminPassword!</span>
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-[#0B1336] hover:bg-[#16204E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0B1336] disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <span>Validating Credentials...</span>
                ) : (
                  <>
                    <span>Sign In to ZemiFix CMMS</span>
                    <ArrowRight className="h-4 w-4 text-[#FF5B00]" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Role-Based Access Control</span>
            </span>
            <span>Single-Company Architecture</span>
          </div>
        </div>
      </div>
    </div>
  );
}
