'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminDataService, AdminStats } from '../lib/adminData';
import { DailySong } from '@365/core';
import { ExternalLink, Calendar, Disc, Users, Music2, Flag, ArrowRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats>(AdminDataService.getStats());
  const [todaySong, setTodaySong] = useState<DailySong | undefined>(AdminDataService.getTodaySong());
  const [historySongs, setHistorySongs] = useState<DailySong[]>(AdminDataService.getDailySongs().slice(1));
  const [isReleasing, setIsReleasing] = useState(false);
  const [releaseStatus, setReleaseStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
  }, []);

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

  return (
    <div className="space-y-10">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border pb-6 gap-4">
        <div>
          <span className="text-xs font-semibold tracking-widest text-primary uppercase">Ritual Control Room</span>
          <h1 className="text-4xl font-serif font-bold text-white tracking-tight mt-1">Daily Overview</h1>
          <p className="text-muted text-sm mt-1">One song. Every day. Exactly one global song identical for all listeners.</p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/schedule"
            className="inline-flex items-center px-4 py-2 rounded-full border border-border bg-surface-elevated text-sm font-medium text-gray-200 hover:border-primary/50 transition"
          >
            <Calendar className="w-4 h-4 mr-2 text-primary" />
            Schedule Days
          </Link>
          <Link
            href="/queue"
            className="inline-flex items-center px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-medium transition"
          >
            <Music2 className="w-4 h-4 mr-2" />
            Review Queue ({stats.queueSize})
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border p-5 rounded-2xl">
          <div className="flex items-center text-muted text-xs uppercase tracking-wider mb-2">
            <Users className="w-4 h-4 mr-1.5 text-primary" /> Total Listeners
          </div>
          <div className="text-3xl font-serif font-bold text-white">{stats.totalUsers.toLocaleString()}</div>
          <div className="text-xs text-muted mt-1">Community listener base</div>
        </div>

        <div className="bg-surface border border-border p-5 rounded-2xl">
          <div className="flex items-center text-muted text-xs uppercase tracking-wider mb-2">
            <Music2 className="w-4 h-4 mr-1.5 text-primary" /> Active Queue
          </div>
          <div className="text-3xl font-serif font-bold text-white">{stats.queueSize}</div>
          <div className="text-xs text-muted mt-1">Pending curator selection</div>
        </div>

        <div className="bg-surface border border-border p-5 rounded-2xl">
          <div className="flex items-center text-muted text-xs uppercase tracking-wider mb-2">
            <Disc className="w-4 h-4 mr-1.5 text-primary" /> Songs Released
          </div>
          <div className="text-3xl font-serif font-bold text-white">Day {todaySong?.dayNumber || 47}</div>
          <div className="text-xs text-muted mt-1">Unbroken daily ritual count</div>
        </div>

        <div className="bg-surface border border-border p-5 rounded-2xl">
          <div className="flex items-center text-muted text-xs uppercase tracking-wider mb-2">
            <Flag className="w-4 h-4 mr-1.5 text-rose-400" /> Pending Reports
          </div>
          <div className="text-3xl font-serif font-bold text-white">{stats.pendingReports}</div>
          <div className="text-xs text-muted mt-1">Moderation queue</div>
        </div>
      </div>

      {/* Hero: Today's Song Status */}
      <div className="bg-surface border border-border rounded-3xl p-8 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {todaySong && (
              <img
                src={todaySong.song.artworkUrl}
                alt={todaySong.song.title}
                className="w-48 h-48 rounded-2xl object-cover shadow-2xl border border-white/10"
              />
            )}

            <div className="space-y-3 max-w-xl">
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-primary/20 text-primary border border-primary/30">
                  DAY {todaySong?.dayNumber}
                </span>
                <span className="text-xs text-muted font-medium">
                  {todaySong?.date} • Published 7:00 PM IST
                </span>
              </div>

              <div>
                <h2 className="text-3xl font-serif font-bold text-white leading-tight">
                  {todaySong?.song.title}
                </h2>
                <p className="text-lg text-gray-300 font-medium mt-1">
                  {todaySong?.song.artist}
                </p>
                <p className="text-sm text-muted">
                  Album: {todaySong?.song.album}
                </p>
              </div>

              <div className="pt-2 text-sm text-gray-300">
                Submitted by{' '}
                <span className="font-semibold text-primary">
                  @{todaySong?.submitterUsername}
                </span>{' '}
                ({todaySong?.submitterDisplayName})
              </div>
            </div>
          </div>

          {/* Release Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto">
            <a
              href={todaySong?.song.externalUrls.spotify}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center px-5 py-3 rounded-full border border-border bg-surface-elevated text-sm font-semibold text-white hover:border-primary transition"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Spotify
            </a>

            <button
              onClick={handleManualRelease}
              disabled={isReleasing}
              className={`inline-flex items-center justify-center px-5 py-3 rounded-full text-sm font-semibold transition ${
                isReleasing
                  ? 'bg-primary/50 text-white cursor-wait'
                  : 'bg-primary hover:bg-primary-hover text-white'
              }`}
            >
              {isReleasing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing Daily Release...
                </>
              ) : (
                'Trigger Daily Release Now'
              )}
            </button>

            {releaseStatus && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center space-x-2 border ${
                  releaseStatus.type === 'success'
                    ? 'bg-emerald-950/40 text-emerald-200 border-emerald-500/30'
                    : 'bg-rose-950/40 text-rose-200 border-rose-500/30'
                }`}
              >
                {releaseStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{releaseStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historical Archive Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-serif font-bold text-white">Recent Daily Rituals</h2>
          <span className="text-xs text-muted uppercase tracking-wider">Past releases</span>
        </div>

        <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {historySongs.map((daily) => (
            <div key={daily.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-surface-elevated/50 transition">
              <div className="flex items-center space-x-4">
                <img
                  src={daily.song.artworkUrl}
                  alt={daily.song.title}
                  className="w-14 h-14 rounded-xl object-cover"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-primary">DAY {daily.dayNumber}</span>
                    <span className="text-xs text-muted">• {daily.date}</span>
                  </div>
                  <h4 className="text-base font-semibold text-white">{daily.song.title}</h4>
                  <p className="text-xs text-gray-400">{daily.song.artist}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-muted">Submitted by</span>
                <p className="text-xs font-medium text-gray-300">@{daily.submitterUsername}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
