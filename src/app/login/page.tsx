'use client';

import React, { useState } from 'react';
import { useAuth } from '@/src/lib/auth-context';
import { Logo } from '@/src/components/brand/Logo';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { login, startDemoSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoLaunching, setIsDemoLaunching] = useState(false);

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

  const handleLaunchDemo = async () => {
    setIsDemoLaunching(true);
    setError(null);
    try {
      const result = await startDemoSession();
      if (result.success) {
        window.location.href = '/dashboard';
      } else {
        setError(result.error || 'Demonstration session could not be established.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to launch demonstration mode.');
    } finally {
      setIsDemoLaunching(false);
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
                <p className="font-semibold">Authentication Notice</p>
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
                  placeholder="staff@zemifix.local"
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
                  placeholder="Enter your confidential staff password"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5B00] focus:border-[#FF5B00]"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-[#0B1336] hover:bg-[#16204E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0B1336] disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <span>Verifying Credentials...</span>
                ) : (
                  <>
                    <span>Sign In to ZemiFix CMMS</span>
                    <ArrowRight className="h-4 w-4 text-[#FF5B00]" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Isolated Demonstration Mode Entry */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="rounded-xl bg-amber-50/80 p-3.5 border border-amber-200/80 text-[11px] text-amber-900">
              <div className="flex items-center gap-1.5 font-semibold text-[#0B1336]">
                <ShieldCheck className="h-4 w-4 text-[#FF5B00]" />
                <span>Isolated Demonstration Mode</span>
              </div>
              <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
                Preview the interface with sandboxed demonstration data. Demonstration sessions operate in memory and never touch real production records.
              </p>
              <button
                type="button"
                onClick={handleLaunchDemo}
                disabled={isDemoLaunching}
                className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-[#0B1336] hover:bg-amber-100/60 shadow-2xs transition-colors"
              >
                {isDemoLaunching ? (
                  <span>Connecting to Demo Session...</span>
                ) : (
                  <>
                    <span>Enter Demonstration Preview</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#FF5B00]" />
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
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
