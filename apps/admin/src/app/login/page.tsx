'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Lock, Mail, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';

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

      setSuccessMessage('Curator credential verified. Launching control room...');
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
    <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
      {/* Subtle decorative glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-elevated border border-border mb-4 text-primary">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-white mb-2">
          365 Curation Desk
        </h1>
        <p className="text-sm text-muted">
          Authenticated administrator access required to manage releases, queue, and moderation.
        </p>
      </div>

      {/* Error notification */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 flex items-start space-x-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success notification */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-start space-x-3 text-emerald-200 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
            Administrator Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-muted absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="curator@365.internal"
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-muted absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition"
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium text-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying credentials...</span>
            </>
          ) : (
            <>
              <span>Enter Curation Desk</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Quick-fill Dev Credentials */}
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted mb-3 text-center">
          Recognized Admin Accounts
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleQuickSelect('kartikeynegi2000.work@gmail.com', '365Auth!kartikeywork')}
            className="w-full text-left p-2.5 rounded-lg bg-surface-elevated hover:bg-border border border-border transition text-xs text-gray-300 flex items-center justify-between"
          >
            <div>
              <span className="font-medium text-white block">kartikeynegi2000.work@gmail.com</span>
              <span className="text-muted">Kartikey Negi (Work) • Curator Claim</span>
            </div>
            <span className="text-primary text-[11px] font-semibold">Select</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickSelect('kartikeynegi2000@gmail.com', '365Auth!kartikeynegi')}
            className="w-full text-left p-2.5 rounded-lg bg-surface-elevated hover:bg-border border border-border transition text-xs text-gray-300 flex items-center justify-between"
          >
            <div>
              <span className="font-medium text-white block">kartikeynegi2000@gmail.com</span>
              <span className="text-muted">Kartikey Negi (Personal) • Curator Claim</span>
            </div>
            <span className="text-primary text-[11px] font-semibold">Select</span>
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
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
