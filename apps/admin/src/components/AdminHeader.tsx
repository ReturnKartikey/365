'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { LogOut, Disc, Sparkles, Clock, Music2, Calendar, ShieldCheck, Flag, Sliders } from 'lucide-react';

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [istTime, setIstTime] = useState<string>('');

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      setIstTime(new Intl.DateTimeFormat('en-GB', options).format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const navItems = [
    { href: '/', label: 'Studio Deck', icon: Disc },
    { href: '/queue', label: 'Audition Crate', icon: Music2 },
    { href: '/schedule', label: 'Schedule', icon: Calendar },
    { href: '/reports', label: 'Moderation', icon: Flag },
    { href: '/config', label: 'Config', icon: Sliders },
  ];

  return (
    <header className="border-b border-border/80 bg-background/95 backdrop-blur-md sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          {/* Masthead Logo */}
          <Link href="/" className="group flex items-baseline space-x-3 focus:outline-none">
            <span className="font-serif text-3xl font-bold tracking-tight text-primary transition group-hover:text-primary-hover">
              365
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber border border-amber/30 bg-amber/10 px-2.5 py-0.5 rounded-full font-semibold">
              Curator Desk
            </span>
          </Link>

          {/* Navigation Links — Audiophile Tab Bar */}
          {!isLoginPage && (
            <nav className="hidden lg:flex items-center space-x-1 p-1 bg-surface-container rounded-full border border-border">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs tracking-wide transition whitespace-nowrap ${
                      isActive
                        ? 'bg-surface-elevated text-cream font-semibold shadow-sm border border-border/80'
                        : 'text-muted hover:text-cream hover:bg-surface-elevated/40 font-medium'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 mr-2 ${isActive ? 'text-primary' : 'text-muted'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Station Status & Admin Badge */}
        <div className="flex items-center space-x-4">
          {/* Live IST Analog Engine Clock */}
          {!isLoginPage && istTime && (
            <div className="hidden sm:flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-surface-container border border-border text-xs font-mono whitespace-nowrap shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber animate-pulse shrink-0" />
              <span className="text-cream font-medium tracking-wide">{istTime}</span>
              <span className="text-muted text-[11px] uppercase tracking-wider">IST</span>
              <span className="text-primary/90 text-[10px] font-semibold tracking-wider">· 19:00 DROP</span>
            </div>
          )}

          {isLoginPage ? (
            <div className="flex items-center space-x-2 text-xs text-muted font-mono tracking-wider">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Restricted Studio Gate</span>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              {/* Curator Identity Plaque */}
              <div className="flex items-center space-x-2.5 bg-surface-container border border-border px-3.5 py-1.5 rounded-full">
                <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[10px] font-bold text-primary">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : 'C'}
                </div>
                <span className="text-xs text-cream font-medium truncate max-w-[150px]">
                  {userEmail || 'Master Curator'}
                </span>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center p-2 rounded-full text-muted hover:text-cream bg-surface-container hover:bg-surface-elevated border border-border transition"
                title="Sign out of Curation Desk"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
