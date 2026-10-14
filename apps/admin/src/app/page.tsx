'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AdminDataService, AdminStats } from '../lib/adminData';
import { DailySong } from '@365/core';
import {
  ExternalLink,
  Calendar,
  Disc,
  Users,
  Music2,
  Flag,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  Radio,
  Sparkles,
} from 'lucide-react';

function formatEditorialDate(dateStr?: string) {
  if (!dateStr) return 'Today';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts.map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats>(AdminDataService.getStats());
  const [todaySong, setTodaySong] = useState<DailySong | undefined>(AdminDataService.getTodaySong());
  const [historySongs, setHistorySongs] = useState<DailySong[]>(AdminDataService.getDailySongs().slice(1));
  const [isReleasing, setIsReleasing] = useState(false);
  const [releaseStatus, setReleaseStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // In-browser audio player for auditioning tracks directly on the desk
  const [currentPlayingUri, setCurrentPlayingUri] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState<number>(0);
  const [playTime, setPlayTime] = useState<string>('0:00');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadData = async () => {
    try {
      const [liveStats, liveDaily, liveToday] = await Promise.all([
        AdminDataService.fetchStats(),
        AdminDataService.fetchDailySongs(),
        AdminDataService.fetchTodaySong(),
      ]);
      setStats(liveStats);
      setTodaySong(liveToday);
      setHistorySongs(liveDaily.slice(1));
    } catch (e) {
      console.warn('Failed to refresh admin data:', e);
    }
  };

  useEffect(() => {
    loadData();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleTogglePlay = (previewUrl?: string | null) => {
    if (!previewUrl) return;

    if (currentPlayingUri === previewUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentPlayingUri(null);
      setPlayProgress(0);
      setPlayTime('0:00');
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    setCurrentPlayingUri(previewUrl);
    setPlayProgress(0);
    setPlayTime('0:00');

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setPlayProgress((audio.currentTime / audio.duration) * 100);
        const secs = Math.floor(audio.currentTime);
        setPlayTime(`0:${secs < 10 ? '0' : ''}${secs}`);
      }
    };

    audio.onended = () => {
      setCurrentPlayingUri(null);
      setPlayProgress(0);
      setPlayTime('0:00');
    };

    audio.onerror = () => {
      console.warn('Preview playback failed');
      setCurrentPlayingUri(null);
      setPlayProgress(0);
      setPlayTime('0:00');
    };

    audio.play().catch(() => {
      setCurrentPlayingUri(null);
      setPlayProgress(0);
      setPlayTime('0:00');
    });
  };

  const handleManualRelease = async () => {
    if (isReleasing) return;
    setIsReleasing(true);
    setReleaseStatus(null);

    try {
      const res = await AdminDataService.triggerManualRelease();
      if (res.success) {
        setReleaseStatus({
          type: 'success',
          message: res.message || 'Daily release executed successfully on Supabase.',
        });
        await loadData();
      } else {
        setReleaseStatus({
          type: 'error',
          message: res.message || 'Failed to trigger daily release.',
        });
      }
    } catch (e: any) {
      setReleaseStatus({
        type: 'error',
        message: e?.message || 'Error executing daily release RPC.',
      });
    } finally {
      setIsReleasing(false);
    }
  };

  const isTodayPlaying = Boolean(
    todaySong?.song.metadata?.previewUrl && currentPlayingUri === todaySong.song.metadata.previewUrl
  );

  return (
    <div className="space-y-12">
      {/* 1. Master Broadcast Masthead & Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border/70 pb-6 gap-6">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono uppercase tracking-[0.22em] text-primary mb-2">
            <Radio className="w-3.5 h-3.5 animate-pulse text-amber" />
            <span>Master Broadcast Deck · 365 Studio</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-serif font-bold text-cream tracking-tight">
            {formatEditorialDate(todaySong?.date)}
          </h1>

          {/* Minimalist Studio Telemetry Strip (Whisper-quiet, replaces generic 4-card SaaS boxes) */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs font-mono text-muted">
            <div className="flex items-center space-x-1.5 text-cream/90">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Day {todaySong?.dayNumber || 60} of 365</span>
            </div>
            <span className="text-border">/</span>
            <div className="flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-muted" />
              <span>{stats.totalUsers} listeners</span>
            </div>
            <span className="text-border">/</span>
            <div className="flex items-center space-x-1.5">
              <Music2 className="w-3.5 h-3.5 text-muted" />
              <span>{stats.queueSize} in audition crate</span>
            </div>
            <span className="text-border">/</span>
            <div className="flex items-center space-x-1.5 text-emerald-400/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Master bus clean</span>
            </div>
          </div>
        </div>

        {/* Quick Crate Actions */}
        <div className="flex items-center space-x-3 shrink-0">
          <Link
            href="/queue"
            className="inline-flex items-center px-4 py-2.5 rounded-full bg-surface-container hover:bg-surface-elevated text-xs font-semibold text-cream border border-border transition"
          >
            <Music2 className="w-3.5 h-3.5 mr-2 text-primary" />
            Audition Crate ({stats.queueSize})
          </Link>
          <Link
            href="/schedule"
            className="inline-flex items-center px-4 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold tracking-wide transition shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5 mr-2" />
            Schedule Crate
          </Link>
        </div>
      </div>

      {/* 2. The Master Turntable & Gatefold Centerpiece (The Star of the Control Room) */}
      <div className="relative rounded-3xl bg-surface-container/70 border border-border/80 p-8 sm:p-12 overflow-hidden shadow-2xl">
        {/* Ambient warm amber/terracotta backlight glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: The Physical Vinyl Record & Gatefold Sleeve */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative group">
              {todaySong && (
                <>
                  {/* The Physical Vinyl Record (slides out smoothly and spins when playing) */}
                  <div
                    className={`absolute top-2 bottom-2 w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-[#0d0e11] border border-white/10 vinyl-grooves vinyl-reflection -z-10 transition-all duration-700 ease-out flex items-center justify-center ${
                      isTodayPlaying
                        ? 'translate-x-28 sm:translate-x-36 shadow-2xl animate-vinyl-spin'
                        : 'translate-x-6 group-hover:translate-x-12 opacity-80'
                    }`}
                  >
                    {/* Vinyl Center Spindle Label */}
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary-container via-surface-elevated to-primary/40 border border-white/15 flex flex-col items-center justify-center p-2 text-center shadow-inner">
                      <span className="text-[7px] font-mono uppercase tracking-[0.2em] text-cream/70">365 Master</span>
                      <span className="text-[9px] font-serif font-bold text-cream truncate max-w-[70px]">
                        Day {todaySong.dayNumber}
                      </span>
                      <div className="w-3 h-3 rounded-full bg-[#121316] border border-white/20 mt-1" />
                    </div>
                  </div>

                  {/* Physical Album Cover Sleeve */}
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-surface-elevated">
                    <img
                      src={todaySong.song.artworkUrl}
                      alt={todaySong.song.title}
                      className="w-full h-full object-cover"
                    />

                    {/* Gradient Seam Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                    {/* Prominent Needle-Drop Play/Pause Button */}
                    {todaySong.song.metadata?.previewUrl && (
                      <button
                        onClick={() => handleTogglePlay(todaySong.song.metadata?.previewUrl)}
                        className={`absolute inset-0 m-auto w-16 h-16 rounded-full backdrop-blur-md border border-white/30 flex items-center justify-center transition-all duration-300 shadow-2xl ${
                          isTodayPlaying
                            ? 'bg-amber text-black ring-4 ring-amber/30 scale-105'
                            : 'bg-black/65 text-cream hover:scale-110 hover:bg-black/80'
                        }`}
                        title={isTodayPlaying ? 'Pause studio hook' : 'Audition 30s studio hook'}
                      >
                        {isTodayPlaying ? (
                          <Pause className="w-7 h-7 fill-current" />
                        ) : (
                          <Play className="w-7 h-7 fill-current ml-1" />
                        )}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Audio Hook Equalizer & Progress Bar (Active when auditioning in browser) */}
            <div className="w-64 sm:w-72 mt-6 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                <span className="flex items-center space-x-1.5">
                  <Volume2 className={`w-3.5 h-3.5 ${isTodayPlaying ? 'text-amber animate-pulse' : 'text-muted'}`} />
                  <span className={isTodayPlaying ? 'text-amber' : ''}>
                    {isTodayPlaying ? 'AUDITIONING 30s HOOK' : 'STUDIO HOOK PREVIEW'}
                  </span>
                </span>
                <span className="text-cream/80">{isTodayPlaying ? `${playTime} / 0:30` : '0:30'}</span>
              </div>

              {/* Progress Scrubber Bar */}
              <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-gradient-to-r from-primary to-amber transition-all duration-200 rounded-full"
                  style={{ width: `${playProgress}%` }}
                />
              </div>

              {/* Animated Frequency Bars */}
              {isTodayPlaying && (
                <div className="flex items-end justify-center space-x-1 h-6 pt-1">
                  <span className="w-1 bg-amber rounded-full animate-eq-1" />
                  <span className="w-1 bg-primary rounded-full animate-eq-2" />
                  <span className="w-1 bg-amber rounded-full animate-eq-3" />
                  <span className="w-1 bg-primary rounded-full animate-eq-4" />
                  <span className="w-1 bg-amber rounded-full animate-eq-2" />
                  <span className="w-1 bg-primary rounded-full animate-eq-1" />
                  <span className="w-1 bg-amber rounded-full animate-eq-4" />
                  <span className="w-1 bg-primary rounded-full animate-eq-3" />
                  <span className="w-1 bg-amber rounded-full animate-eq-1" />
                  <span className="w-1 bg-primary rounded-full animate-eq-2" />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Editorial Liner Notes & Studio Broadcast Controls */}
          <div className="lg:col-span-7 space-y-6">
            {/* Status Badge & Publication Meta */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase bg-primary/20 text-primary border border-primary/40">
                DAY {todaySong?.dayNumber || 60} · ON-AIR
              </span>
              <span className="text-xs font-mono text-muted">
                {todaySong?.date} · 7:00 PM IST Synchronized Ritual
              </span>
            </div>

            {/* Song Title & Artist in Bespoke Editorial Display Typography */}
            <div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-cream tracking-tight leading-[1.08]">
                {todaySong?.song.title}
              </h2>
              <p className="text-2xl sm:text-3xl text-primary font-medium mt-2">
                {todaySong?.song.artist}
              </p>
              {todaySong?.song.album && (
                <p className="text-xs text-muted font-mono mt-1.5">
                  Album: {todaySong.song.album} {todaySong.song.metadata?.releaseYear ? `(${todaySong.song.metadata.releaseYear})` : ''}
                </p>
              )}
            </div>

            {/* Liner Notes Card (Styled like an authentic physical vinyl gatefold insert) */}
            <div className="p-5 rounded-2xl bg-surface border border-border/80 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">Liner Notes</span>
                <span className="text-[10px] font-mono text-amber bg-amber/10 border border-amber/30 px-2 py-0.5 rounded-full">
                  Verified Audio Master
                </span>
              </div>
              <p className="text-xs text-cream/90 leading-relaxed italic font-serif">
                &ldquo;Selected from community crate curation. Master audio hook verified clean for 7:00 PM IST global synchronized release.&rdquo;
              </p>
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted text-[11px]">
                  Curated by <span className="text-cream font-semibold font-mono">@{todaySong?.submitterUsername}</span>
                  {todaySong?.submitterDisplayName && (
                    <span className="text-muted"> ({todaySong.submitterDisplayName})</span>
                  )}
                </span>
                <span className="text-[11px] text-muted font-mono">Day {todaySong?.dayNumber} Selection</span>
              </div>
            </div>

            {/* Tactile Master Broadcast Controls */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={handleManualRelease}
                disabled={isReleasing}
                className={`inline-flex items-center justify-center px-6 py-3.5 rounded-full text-xs font-semibold tracking-wide transition shadow-lg ${
                  isReleasing
                    ? 'bg-primary/50 text-white cursor-wait'
                    : 'bg-primary hover:bg-primary-hover text-white active:scale-95'
                }`}
              >
                {isReleasing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Broadcasting 7:00 PM IST Ritual...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 text-amber" />
                    Broadcast Drop Now (Bypass 19:00)
                  </>
                )}
              </button>

              <a
                href={todaySong?.song.externalUrls.spotify || todaySong?.song.externalUrls.web}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center px-5 py-3.5 rounded-full border border-border bg-surface hover:bg-surface-elevated text-xs font-semibold text-cream transition"
              >
                <ExternalLink className="w-4 h-4 mr-2 text-emerald-400" />
                Listen on Spotify
              </a>
            </div>

            {releaseStatus && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start space-x-2.5 border mt-2 ${
                  releaseStatus.type === 'success'
                    ? 'bg-emerald-950/40 text-emerald-200 border-emerald-500/30'
                    : 'bg-rose-950/40 text-rose-200 border-rose-500/30'
                }`}
              >
                {releaseStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span className="leading-snug">{releaseStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. The Crate Shelf (Historical Archive as Vinyl Crates) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div>
            <h2 className="text-2xl font-serif font-bold text-cream">Archive Shelf</h2>
            <p className="text-xs text-muted mt-0.5">Flip through past daily drops in the 365 listening crate.</p>
          </div>
          <span className="text-xs font-mono text-muted uppercase tracking-wider">
            {historySongs.length} releases in archive
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {historySongs.map((daily) => {
            const isPlayingThis = currentPlayingUri === daily.song.metadata?.previewUrl;
            return (
              <div
                key={daily.id}
                className="p-4 rounded-2xl bg-surface-container/60 border border-border hover:border-border-hover hover:bg-surface-container transition flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={daily.song.artworkUrl}
                      alt={daily.song.title}
                      className="w-16 h-16 rounded-xl object-cover border border-white/10 shadow-md bg-surface"
                    />

                    {daily.song.metadata?.previewUrl && (
                      <button
                        onClick={() => handleTogglePlay(daily.song.metadata?.previewUrl)}
                        className={`absolute inset-0 m-auto w-8 h-8 rounded-full bg-black/75 backdrop-blur-sm border border-white/20 text-cream flex items-center justify-center transition ${
                          isPlayingThis ? 'opacity-100 scale-105 text-amber ring-2 ring-amber/50' : 'opacity-0 group-hover:opacity-100'
                        }`}
                        title={isPlayingThis ? 'Pause preview' : 'Play preview'}
                      >
                        {isPlayingThis ? (
                          <Pause className="w-4 h-4 fill-amber" />
                        ) : (
                          <Play className="w-4 h-4 fill-cream ml-0.5" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 text-[10px] font-mono text-muted mb-0.5">
                      <span className="font-bold text-primary">DAY {daily.dayNumber}</span>
                      <span>•</span>
                      <span>{daily.date}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-cream truncate">{daily.song.title}</h4>
                    <p className="text-xs text-muted truncate">{daily.song.artist}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[9px] font-mono text-muted uppercase tracking-wider block">Submitted</span>
                  <span className="text-xs text-cream/80 font-medium font-mono">@{daily.submitterUsername}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
