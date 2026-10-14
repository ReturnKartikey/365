'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminDataService } from '../../lib/adminData';
import { DailySong, Song, Submission } from '@365/core';
import {
  Calendar as CalendarIcon,
  Check,
  Search,
  PlusCircle,
  Play,
  Pause,
  ExternalLink,
  Sparkles,
  Loader2,
  Music2,
  Clock,
} from 'lucide-react';

function ScheduleContent() {
  const searchParams = useSearchParams();
  const preselectId = searchParams.get('preselect');

  const [dailySongs, setDailySongs] = useState<DailySong[]>(AdminDataService.getDailySongs());
  const [submissions, setSubmissions] = useState<Submission[]>(AdminDataService.getSubmissions());
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [searchCatalogQuery, setSearchCatalogQuery] = useState('');
  const [catalogResults, setCatalogResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Audition audio player
  const [currentPlayingUri, setCurrentPlayingUri] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadData = async () => {
    try {
      const [liveDaily, liveSubs] = await Promise.all([
        AdminDataService.fetchDailySongs(),
        AdminDataService.fetchSubmissions(),
      ]);
      setDailySongs(liveDaily);
      setSubmissions(liveSubs);
    } catch (e) {
      console.warn('Error loading schedule data:', e);
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
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    setCurrentPlayingUri(previewUrl);

    audio.onended = () => {
      setCurrentPlayingUri(null);
    };

    audio.play().catch(() => {
      setCurrentPlayingUri(null);
    });
  };

  const handleSearchCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCatalogQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await AdminDataService.searchCatalog(searchCatalogQuery);
      setCatalogResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleScheduleFromQueue = async (sub: Submission) => {
    await AdminDataService.scheduleSongForDate(selectedDate, sub.song, {
      id: sub.userId,
      username: sub.submitterUsername,
      displayName: sub.submitterDisplayName,
    });
    await loadData();
    setNotification(`Scheduled "${sub.song.title}" for ${selectedDate}`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleScheduleFromCatalog = async (song: Song) => {
    await AdminDataService.scheduleSongForDate(selectedDate, song, {
      id: 'admin_curator',
      username: 'editorial_desk',
      displayName: '365 Editorial',
    });
    await loadData();
    setNotification(`Scheduled editorial release "${song.title}" for ${selectedDate}`);
    setTimeout(() => setNotification(null), 4000);
  };

  const existingForDate = dailySongs.find((d) => d.date === selectedDate);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b border-border/80 pb-6">
        <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-[0.2em] text-primary mb-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-amber" />
          <span>Ritual Pipeline & Calendar</span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-serif font-bold text-cream tracking-tight">
          Schedule & Slot Releases
        </h1>
        <p className="text-muted text-sm mt-1.5 max-w-xl leading-relaxed">
          Pre-assign community submissions or editorial master tracks to upcoming daily drops.
        </p>
      </div>

      {notification && (
        <div className="bg-surface-container border border-primary/40 text-cream px-4 py-3 rounded-2xl text-xs flex items-center">
          <Check className="w-4 h-4 mr-2 text-primary" />
          {notification}
        </div>
      )}

      {/* Target Date Bar */}
      <div className="bg-surface border border-border p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-muted font-semibold mb-1.5">
            Target Release Date
          </label>
          <div className="flex items-center space-x-3">
            <CalendarIcon className="w-4 h-4 text-primary" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-surface-container border border-border px-3.5 py-2 rounded-xl text-cream font-mono text-xs focus:outline-none focus:border-primary transition"
            />
          </div>
        </div>

        {existingForDate ? (
          <div className="flex items-center space-x-4 bg-surface-container p-3.5 rounded-xl border border-primary/30 max-w-md">
            <img
              src={existingForDate.song.artworkUrl}
              alt=""
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-bold text-amber uppercase tracking-wider block">
                Scheduled for {existingForDate.date}
              </span>
              <h4 className="text-sm font-semibold text-cream truncate">{existingForDate.song.title}</h4>
              <p className="text-xs text-muted truncate">{existingForDate.song.artist} • @{existingForDate.submitterUsername}</p>
            </div>
          </div>
        ) : (
          <div className="text-xs font-mono text-amber bg-amber/10 border border-amber/30 px-4 py-3 rounded-xl flex items-center space-x-2">
            <Clock className="w-4 h-4 shrink-0" />
            <span>No song scheduled for {selectedDate}. Choose from below.</span>
          </div>
        )}
      </div>

      {/* 2-Column Selection Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Column 1: Community Submissions */}
        <div className="bg-surface border border-border p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <h3 className="text-xl font-serif font-bold text-cream">Community Queue</h3>
              <p className="text-xs text-muted">Listener recommendations</p>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber border border-amber/20 bg-amber/10 px-2 py-0.5 rounded-full">
              Recommended
            </span>
          </div>

          <div className="space-y-3">
            {submissions
              .filter((s) => s.status === 'queued')
              .map((sub) => {
                const isPlayingThis = currentPlayingUri === sub.song.metadata?.previewUrl;
                return (
                  <div
                    key={sub.id}
                    className="bg-surface-container border border-border hover:border-border-hover p-4 rounded-2xl flex items-center justify-between gap-4 transition group"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={sub.song.artworkUrl}
                          alt=""
                          className="w-13 h-13 rounded-xl object-cover bg-surface-elevated"
                        />
                        {sub.song.metadata?.previewUrl && (
                          <button
                            onClick={() => handleTogglePlay(sub.song.metadata?.previewUrl)}
                            className={`absolute inset-0 m-auto w-7 h-7 rounded-full bg-black/75 border border-white/20 text-cream flex items-center justify-center transition ${
                              isPlayingThis ? 'opacity-100 scale-105 text-amber' : 'opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            {isPlayingThis ? <Pause className="w-3.5 h-3.5 fill-amber" /> : <Play className="w-3.5 h-3.5 fill-cream ml-0.5" />}
                          </button>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-cream truncate">{sub.song.title}</h4>
                        <p className="text-[11px] text-muted truncate">{sub.song.artist}</p>
                        <p className="text-[10px] font-mono text-primary mt-0.5">@{sub.submitterUsername}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleScheduleFromQueue(sub)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-white transition flex items-center shrink-0 shadow-sm"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1" />
                      Slot {selectedDate.slice(5)}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Column 2: Direct Spotify Catalog Search */}
        <div className="bg-surface border border-border p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <h3 className="text-xl font-serif font-bold text-cream">Spotify Master Search</h3>
              <p className="text-xs text-muted">Editorial direct curation</p>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted border border-border px-2 py-0.5 rounded-full">
              Editorial
            </span>
          </div>

          <form onSubmit={handleSearchCatalog} className="flex gap-2">
            <input
              type="text"
              placeholder="Search Spotify by song, artist, album..."
              value={searchCatalogQuery}
              onChange={(e) => setSearchCatalogQuery(e.target.value)}
              className="flex-1 bg-surface-container border border-border px-4 py-2 rounded-xl text-xs text-cream placeholder-muted focus:outline-none focus:border-primary transition"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-surface-high border border-border text-xs font-semibold text-cream transition flex items-center"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </button>
          </form>

          {/* Search Results */}
          <div className="space-y-3">
            {catalogResults.map((song) => {
              const isPlayingThis = currentPlayingUri === song.metadata?.previewUrl;
              return (
                <div
                  key={song.id}
                  className="bg-surface-container border border-border hover:border-border-hover p-4 rounded-2xl flex items-center justify-between gap-4 transition group"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={song.artworkUrl}
                        alt=""
                        className="w-13 h-13 rounded-xl object-cover bg-surface-elevated"
                      />
                      {song.metadata?.previewUrl && (
                        <button
                          onClick={() => handleTogglePlay(song.metadata?.previewUrl)}
                          className={`absolute inset-0 m-auto w-7 h-7 rounded-full bg-black/75 border border-white/20 text-cream flex items-center justify-center transition ${
                            isPlayingThis ? 'opacity-100 scale-105 text-amber' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {isPlayingThis ? <Pause className="w-3.5 h-3.5 fill-amber" /> : <Play className="w-3.5 h-3.5 fill-cream ml-0.5" />}
                        </button>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-cream truncate">{song.title}</h4>
                      <p className="text-[11px] text-muted truncate">{song.artist}</p>
                      <p className="text-[10px] font-mono text-muted/70 mt-0.5">{song.album}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleScheduleFromCatalog(song)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-surface-elevated hover:bg-primary text-cream hover:text-white border border-border transition flex items-center shrink-0"
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1" />
                    Slot
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-muted">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        </div>
      }
    >
      <ScheduleContent />
    </Suspense>
  );
}
