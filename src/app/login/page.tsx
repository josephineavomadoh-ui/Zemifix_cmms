'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/lib/auth-context';
import { Logo } from '@/src/components/brand/Logo';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  KeyRound,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const { login, verifyOtp, resendOtp, loginDemo } = useAuth();
  const router = useRouter();

  // State A (Credentials) vs State B (OTP)
  const [authState, setAuthState] = useState<'credentials' | 'otp'>('credentials');

  // Credentials form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [maskedDestination, setMaskedDestination] = useState('');
  const [channel, setChannel] = useState<'EMAIL' | 'SMS'>('EMAIL');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  // Timers & Messages
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);

  // OTP input element references
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown countdown timer effect
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Focus first OTP input when transitioning to OTP state
  useEffect(() => {
    if (authState === 'otp') {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [authState]);

  // Handle Credentials submission (State A -> State B)
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Authentication failed. Please verify your credentials.');
        return;
      }

      if (result.otpRequired) {
        setMaskedDestination(result.destination || email);
        setChannel(result.channel || 'EMAIL');
        setOtpDigits(['', '', '', '', '', '']);
        setAttemptsRemaining(null);
        setCooldownSeconds(90); // 90s initial cooldown
        setAuthState('otp');
      } else {
        // Fallback redirect if OTP was not required (e.g. session directly issued)
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle OTP digit input changes, auto-advance and paste handling
  const handleDigitChange = (index: number, value: string) => {
    setError(null);
    setNotice(null);

    // If user pasted or typed multiple digits
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 1) {
      const digits = cleaned.slice(0, 6).split('');
      const newDigits = ['', '', '', '', '', ''];
      digits.forEach((d, i) => {
        newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const singleDigit = cleaned.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = singleDigit;
    setOtpDigits(newDigits);

    if (singleDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const digits = pastedData.split('');
    const newDigits = ['', '', '', '', '', ''];
    digits.forEach((d, i) => {
      newDigits[i] = d;
    });

    setOtpDigits(newDigits);
    const focusIdx = Math.min(digits.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  // Handle OTP verification submission
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit authentication code.');
      return;
    }

    setError(null);
    setNotice(null);
    setIsVerifying(true);

    try {
      const result = await verifyOtp(code);
      if (!result.success) {
        if (result.isExpired) {
          setError('Pre-authentication session expired. Please log in again.');
          setTimeout(() => {
            setAuthState('credentials');
          }, 2000);
          return;
        }

        setError(result.error || 'Invalid verification code.');
        if (typeof result.attemptsRemaining === 'number') {
          setAttemptsRemaining(result.attemptsRemaining);
        }
        return;
      }

      // Verification succeeded! Context sets user and we push dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Network error during code verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle OTP Resend
  const handleResendOtp = async () => {
    if (cooldownSeconds > 0 || isResending) return;

    setError(null);
    setNotice(null);
    setIsResending(true);

    try {
      const result = await resendOtp();
      if (!result.success) {
        if (result.isExpired) {
          setError('Pre-authentication session expired. Please log in again.');
          setTimeout(() => {
            setAuthState('credentials');
          }, 2000);
          return;
        }

        setError(result.error || 'Failed to resend code.');
        if (result.retryAfterSeconds) {
          setCooldownSeconds(result.retryAfterSeconds);
        }
        return;
      }

      setNotice('A new authentication code has been sent.');
      if (result.destination) {
        setMaskedDestination(result.destination);
      }
      setCooldownSeconds(90); // Reset cooldown timer
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err?.message || 'Network error while resending code.');
    } finally {
      setIsResending(false);
    }
  };

  // Handle Demonstration Mode login
  const handleDemoLogin = async () => {
    setError(null);
    setIsDemoSubmitting(true);
    try {
      const result = await loginDemo();
      if (!result.success) {
        setError(result.error || 'Failed to initiate demonstration session.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to demo mode.');
    } finally {
      setIsDemoSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-[#F8FAFC] py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <Logo variant="light" width={170} height={48} />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0B1336]">
          {authState === 'credentials'
            ? 'Staff Authentication Portal'
            : 'Two-Factor Authentication'}
        </h2>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          {authState === 'credentials'
            ? 'Single-company enterprise CMMS deployment for facilities, manufacturing & contractor operations.'
            : 'Enter the 6-digit verification code sent to your registered device.'}
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

          {notice && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-semibold">Security Update</p>
                <p className="mt-0.5 text-emerald-700">{notice}</p>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STATE A — CREDENTIALS FORM                                       */}
          {/* ================================================================ */}
          {authState === 'credentials' ? (
            <form className="space-y-5" onSubmit={handleCredentialsSubmit}>
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

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-[#0B1336] hover:bg-[#16204E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0B1336] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Validating Credentials...</span>
                  ) : (
                    <>
                      <span>Sign In & Verify</span>
                      <ArrowRight className="h-4 w-4 text-[#FF5B00]" />
                    </>
                  )}
                </button>
              </div>

              {/* Demo Mode Action */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={isDemoSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#FF5B00]" />
                  <span>
                    {isDemoSubmitting
                      ? 'Connecting Demo Session...'
                      : 'Explore Demonstration Mode'}
                  </span>
                </button>
              </div>
            </form>
          ) : (
            /* ================================================================ */
            /* STATE B — OTP VERIFICATION INTERFACE                              */
            /* ================================================================ */
            <form className="space-y-6" onSubmit={handleVerifyOtpSubmit}>
              <div className="text-center bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Sent via {channel} to</span>
                </div>
                <p className="mt-0.5 text-xs font-bold text-[#0B1336] tracking-wide">
                  {maskedDestination}
                </p>
                {attemptsRemaining !== null && (
                  <p className="mt-1 text-[11px] font-medium text-amber-700 bg-amber-50 rounded-md py-0.5 px-2 inline-block">
                    {attemptsRemaining} attempt(s) remaining
                  </p>
                )}
              </div>

              {/* 6 Digit Inputs */}
              <div>
                <label className="block text-center text-xs font-semibold text-slate-700 mb-2">
                  Enter 6-Digit Code
                </label>
                <div className="flex justify-between gap-1.5 sm:gap-2" onPaste={handlePaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-9 h-11 sm:w-11 sm:h-12 text-center text-lg font-bold text-[#0B1336] bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5B00] focus:border-[#FF5B00]"
                    />
                  ))}
                </div>
              </div>

              {/* Action buttons: Verify & Resend */}
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isVerifying || otpDigits.join('').length !== 6}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-[#0B1336] hover:bg-[#16204E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0B1336] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isVerifying ? (
                    <span>Verifying Code...</span>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4 text-[#FF5B00]" />
                      <span>Verify & Complete Sign In</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthState('credentials');
                      setError(null);
                      setNotice(null);
                    }}
                    className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Credentials</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={cooldownSeconds > 0 || isResending}
                    className="flex items-center gap-1 font-bold text-[#FF5B00] hover:text-[#D94D00] disabled:text-slate-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <RotateCcw className={`h-3.5 w-3.5 ${isResending ? 'animate-spin' : ''}`} />
                    <span>
                      {cooldownSeconds > 0
                        ? `Resend Code (${cooldownSeconds}s)`
                        : isResending
                        ? 'Resending...'
                        : 'Resend Code'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          )}

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
