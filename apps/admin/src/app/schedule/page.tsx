'use client';

import React, { useState, useEffect } from 'react';
import { AdminDataService } from '../../lib/adminData';
import { DailySong, Song, Submission } from '@365/core';
import { Calendar as CalendarIcon, Check, Search, PlusCircle, Sparkles, Loader2 } from 'lucide-react';

export default function SchedulePage() {
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
  }, []);

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
    setNotification(`Scheduled "${song.title}" for ${selectedDate}`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Find if date already has scheduled song
  const existingForDate = dailySongs.find((d) => d.date === selectedDate);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <span className="text-xs font-semibold tracking-widest text-primary uppercase">Curation Pipeline</span>
        <h1 className="text-4xl font-serif font-bold text-white tracking-tight mt-1">Calendar & Day Selection</h1>
        <p className="text-muted text-sm mt-1">
          Pick future dates on the calendar and assign upcoming ritual tracks from listener submissions or the curated catalog.
        </p>
      </div>

      {notification && (
        <div className="bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-xl text-sm flex items-center">
          <Check className="w-4 h-4 mr-2 text-emerald-400" />
          {notification}
        </div>
      )}

      {/* Date Selector Row */}
      <div className="bg-surface border border-border p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted font-medium mb-1">
            Target Release Date
          </label>
          <div className="flex items-center space-x-3">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-surface-elevated border border-border px-3.5 py-2 rounded-xl text-white font-medium text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {existingForDate ? (
          <div className="flex items-center space-x-4 bg-surface-elevated p-3 rounded-xl border border-primary/30">
            <img
              src={existingForDate.song.artworkUrl}
              alt=""
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div>
              <span className="text-xs font-bold text-primary">Scheduled for {existingForDate.date}</span>
              <h4 className="text-sm font-semibold text-white">{existingForDate.song.title}</h4>
              <p className="text-xs text-muted">@{existingForDate.submitterUsername}</p>
            </div>
          </div>
        ) : (
          <div className="text-sm text-amber-400/90 bg-amber-950/30 border border-amber-500/20 px-4 py-2.5 rounded-xl">
            No song scheduled yet for {selectedDate}. Choose from below.
          </div>
        )}
      </div>

      {/* 2-Column Selection Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Column 1: Pick from Community Submissions Queue */}
        <div className="bg-surface border border-border p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-serif font-bold text-white">Community Submissions</h3>
            <span className="text-xs text-muted uppercase">Recommended</span>
          </div>

          <div className="space-y-3">
            {submissions
              .filter((s) => s.status === 'queued')
              .map((sub) => (
                <div
                  key={sub.id}
                  className="bg-surface-elevated border border-border p-4 rounded-2xl flex items-center justify-between hover:border-primary/40 transition"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={sub.song.artworkUrl}
                      alt=""
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white">{sub.song.title}</h4>
                      <p className="text-xs text-gray-300">{sub.song.artist}</p>
                      <p className="text-xs text-primary mt-1">Submitted by @{sub.submitterUsername}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleScheduleFromQueue(sub)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-white transition flex items-center"
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1" />
                    Select for {selectedDate.slice(5)}
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* Column 2: Search Spotify / Catalog Directly */}
        <div className="bg-surface border border-border p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-serif font-bold text-white">Curator Catalog Search</h3>
            <span className="text-xs text-muted uppercase">Direct</span>
          </div>

          <form onSubmit={handleSearchCatalog} className="flex gap-2">
            <input
              type="text"
              placeholder="Search Spotify catalog by title or artist..."
              value={searchCatalogQuery}
              onChange={(e) => setSearchCatalogQuery(e.target.value)}
              className="flex-1 bg-surface-elevated border border-border px-4 py-2.5 rounded-full text-sm text-white placeholder-muted focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-2.5 rounded-full bg-surface-elevated border border-border text-white text-sm font-medium hover:border-primary transition flex items-center"
            >
              <Search className="w-4 h-4 mr-1.5" />
              Search
            </button>
          </form>

          {/* Search Results */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {catalogResults.map((song) => (
              <div
                key={song.id}
                className="bg-surface-elevated border border-border p-3.5 rounded-2xl flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={song.artworkUrl}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-white">{song.title}</h4>
                    <p className="text-xs text-gray-300">{song.artist}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleScheduleFromCatalog(song)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-surface border border-border hover:border-primary text-gray-200 transition"
                >
                  Schedule
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
