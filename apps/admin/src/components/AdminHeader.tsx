'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { LogOut, ShieldCheck, User } from 'lucide-react';

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';

  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  return (
    <header className="border-b border-border bg-surface/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-baseline space-x-3">
            <span className="font-serif text-3xl font-bold tracking-tight text-primary">365</span>
            <span className="text-xs uppercase tracking-widest text-muted font-medium">Curation Desk</span>
          </Link>

          {/* Navigation Links — Only shown when authenticated */}
          {!isLoginPage && (
            <nav className="hidden md:flex space-x-1">
              <Link
                href="/"
                className={`px-3.5 py-2 text-sm font-medium rounded-md transition ${
                  pathname === '/'
                    ? 'text-white bg-surface-elevated'
                    : 'text-gray-300 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                Overview
              </Link>
              <Link
                href="/schedule"
                className={`px-3.5 py-2 text-sm font-medium rounded-md transition ${
                  pathname === '/schedule'
                    ? 'text-white bg-surface-elevated'
                    : 'text-gray-300 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                Calendar & Select
              </Link>
              <Link
                href="/queue"
                className={`px-3.5 py-2 text-sm font-medium rounded-md transition ${
                  pathname === '/queue'
                    ? 'text-white bg-surface-elevated'
                    : 'text-gray-300 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                Queue
              </Link>
              <Link
                href="/reports"
                className={`px-3.5 py-2 text-sm font-medium rounded-md transition ${
                  pathname === '/reports'
                    ? 'text-white bg-surface-elevated'
                    : 'text-gray-300 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                Reports
              </Link>
              <Link
                href="/config"
                className={`px-3.5 py-2 text-sm font-medium rounded-md transition ${
                  pathname === '/config'
                    ? 'text-white bg-surface-elevated'
                    : 'text-gray-300 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                Release Config
              </Link>
            </nav>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-3">
          {isLoginPage ? (
            <div className="flex items-center space-x-2 text-xs text-muted">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Restricted Staff Portal</span>
            </div>
          ) : (
            <>
              <div className="hidden sm:flex items-center space-x-2 bg-surface-elevated/80 border border-border px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-gray-300 font-medium truncate max-w-[180px]">
                  {userEmail || 'Curator (Admin)'}
                </span>
              </div>

              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1.5 text-xs text-muted hover:text-white px-2.5 py-1.5 rounded-lg border border-border/80 hover:bg-surface-elevated transition"
                title="Sign out of Curation Desk"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
