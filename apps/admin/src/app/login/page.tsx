'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Lock, Mail, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck, Loader2, Sparkles, Disc } from 'lucide-react';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam === 'unauthorized'
      ? 'Access Denied: Your account does not possess administrator privileges.'
      : null
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if session already exists
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && user.app_metadata?.is_admin) {
        router.replace(redirectPath);
      }
    });
  }, [redirectPath, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      const user = data.user;
      const isAdmin = Boolean(user?.app_metadata?.is_admin);

      if (!isAdmin) {
        await supabase.auth.signOut();
        setErrorMessage('Access Denied: This account is not registered as an administrator.');
        setIsLoading(false);
        return;
      }

      setSuccessMessage('Curator verified. Launching master console...');
      setTimeout(() => {
        router.refresh();
        router.push(redirectPath);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (devEmail: string, devPass: string) => {
    setEmail(devEmail);
    setPassword(devPass);
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden">
      {/* Warm ambient glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber/10 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-container border border-border mb-4 text-primary">
          <Disc className="w-6 h-6 text-amber animate-spin-slow" />
        </div>
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-amber mb-1">
          Master Audio Desk
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-cream mb-2">
          365 Curation Studio
        </h1>
        <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
          Authorized curator authentication required to manage broadcast drops, queue, and safety.
        </p>
      </div>

      {/* Error notification */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex items-start space-x-3 text-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
          <span className="leading-snug">{errorMessage}</span>
        </div>
      )}

      {/* Success notification */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-start space-x-3 text-emerald-200 text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
          <span className="leading-snug">{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4 relative z-10">
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-muted font-semibold mb-2">
            Curator Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-muted absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="curator@365.internal"
              className="w-full bg-surface-container border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-cream placeholder-muted focus:outline-none focus:border-primary transition font-mono"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-muted font-semibold mb-2">
            Access Key / Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-muted absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-surface-container border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-cream placeholder-muted focus:outline-none focus:border-primary transition font-mono"
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs tracking-wide transition flex items-center justify-center space-x-2 disabled:opacity-50 shadow-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying credentials...</span>
            </>
          ) : (
            <>
              <span>Enter Control Studio</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Quick-fill Dev Credentials */}
      <div className="mt-8 pt-6 border-t border-border-subtle relative z-10">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted mb-3 text-center">
          Verified Staff Claims
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleQuickSelect('kartikeynegi2000.work@gmail.com', '365Auth!kartikeywork')}
            className="w-full text-left p-3 rounded-xl bg-surface-container hover:bg-surface-elevated border border-border-subtle transition text-xs text-muted flex items-center justify-between"
          >
            <div>
              <span className="font-semibold text-cream block text-xs">kartikeynegi2000.work@gmail.com</span>
              <span className="text-[11px] text-muted font-mono">Kartikey Negi (Work) • Curator</span>
            </div>
            <span className="text-amber text-[10px] font-mono uppercase tracking-wider font-bold">Select</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickSelect('kartikeynegi2000@gmail.com', '365Auth!kartikeynegi')}
            className="w-full text-left p-3 rounded-xl bg-surface-container hover:bg-surface-elevated border border-border-subtle transition text-xs text-muted flex items-center justify-between"
          >
            <div>
              <span className="font-semibold text-cream block text-xs">kartikeynegi2000@gmail.com</span>
              <span className="text-[11px] text-muted font-mono">Kartikey Negi (Personal) • Curator</span>
            </div>
            <span className="text-amber text-[10px] font-mono uppercase tracking-wider font-bold">Select</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
