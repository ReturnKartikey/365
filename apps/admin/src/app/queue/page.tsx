'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AdminDataService } from '../../lib/adminData';
import { Submission } from '@365/core';
import {
  Trash2,
  Calendar,
  Search,
  ExternalLink,
  ShieldAlert,
  Play,
  Pause,
  Music2,
  CheckCircle2,
  MessageSquare,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function QueuePage() {
  const [submissions, setSubmissions] = useState<Submission[]>(AdminDataService.getSubmissions());
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlayingUri, setCurrentPlayingUri] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadSubmissions = async () => {
    try {
      const data = await AdminDataService.fetchSubmissions();
      setSubmissions(data);
    } catch (e) {
      console.warn('Error fetching submissions:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();

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

  const handleRemove = async (id: string, title: string) => {
    if (confirm(`Remove "${title}" from the community queue?`)) {
      await AdminDataService.removeSubmission(id, 'Declined by curator');
      setActionNotice(`Removed "${title}" from queue.`);
      setTimeout(() => setActionNotice(null), 3500);
      await loadSubmissions();
    }
  };

  const handleBanUser = async (userId: string, username: string) => {
    if (confirm(`Suspend user @${username} and remove all their submissions?`)) {
      await AdminDataService.banUser(userId);
      setActionNotice(`User @${username} suspended.`);
      setTimeout(() => setActionNotice(null), 3500);
      await loadSubmissions();
    }
  };

  const filtered = submissions.filter((s) => {
    const q = searchFilter.toLowerCase();
    return (
      s.song.title.toLowerCase().includes(q) ||
      s.song.artist.toLowerCase().includes(q) ||
      s.submitterUsername.toLowerCase().includes(q) ||
      (s.note && s.note.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border/80 pb-6 gap-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-[0.2em] text-primary mb-1.5">
            <Music2 className="w-3.5 h-3.5 text-amber" />
            <span>Community Audition Crate</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-serif font-bold text-cream tracking-tight">
            Submission Queue
          </h1>
          <p className="text-muted text-sm mt-1.5 max-w-xl leading-relaxed">
            Audition prospective daily releases submitted by registered listeners. Preview tracks, inspect notes, and slot into upcoming daily rituals.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-4 top-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search title, artist, listener..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-surface border border-border pl-11 pr-4 py-2.5 rounded-full text-xs text-cream placeholder-muted focus:outline-none focus:border-primary transition"
          />
        </div>
      </div>

      {/* Action Notification */}
      {actionNotice && (
        <div className="p-4 rounded-2xl bg-surface-container border border-primary/40 text-cream text-xs flex items-center space-x-3">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Queue Grid / Crates */}
      {filtered.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-surface border border-border">
          <Music2 className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
          <h3 className="font-serif text-xl font-bold text-cream">Listening Crate Empty</h3>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            {searchFilter ? 'No queued tracks match your search filter.' : 'All listener submissions have been reviewed or scheduled.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((sub) => {
            const isPlayingThis = currentPlayingUri === sub.song.metadata?.previewUrl;
            return (
              <div
                key={sub.id}
                className="p-5 sm:p-6 rounded-2xl bg-surface border border-border hover:border-border-hover transition group flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Track Artwork & Info */}
                <div className="flex items-start space-x-5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={sub.song.artworkUrl}
                      alt={sub.song.title}
                      className="w-20 h-20 rounded-2xl object-cover border border-white/10 shadow-lg bg-surface-container"
                    />

                    {/* In-Cover Audio Audition Overlay */}
                    {sub.song.metadata?.previewUrl && (
                      <button
                        onClick={() => handleTogglePlay(sub.song.metadata?.previewUrl)}
                        className={`absolute inset-0 m-auto w-10 h-10 rounded-full bg-black/75 backdrop-blur-sm border border-white/20 text-cream flex items-center justify-center transition shadow-lg ${
                          isPlayingThis ? 'opacity-100 scale-105 text-amber ring-2 ring-amber/50' : 'opacity-90 md:opacity-0 md:group-hover:opacity-100'
                        }`}
                        title={isPlayingThis ? 'Pause audition' : 'Audition 30s preview'}
                      >
                        {isPlayingThis ? (
                          <Pause className="w-5 h-5 fill-amber" />
                        ) : (
                          <Play className="w-5 h-5 fill-cream ml-0.5" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold ${
                          sub.status === 'queued'
                            ? 'bg-amber/15 text-amber border border-amber/30'
                            : sub.status === 'selected'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {sub.status}
                      </span>
                      <span className="text-[11px] font-mono text-muted">
                        Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-lg font-serif font-bold text-cream truncate">
                      {sub.song.title}
                    </h3>
                    <p className="text-xs text-primary font-medium truncate">
                      {sub.song.artist} • <span className="text-muted">{sub.song.album}</span>
                    </p>

                    {/* Submitter note */}
                    {sub.note && (
                      <div className="flex items-start space-x-2 text-xs text-cream/90 italic pt-1">
                        <MessageSquare className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
                        <span className="leading-relaxed">&ldquo;{sub.note}&rdquo;</span>
                      </div>
                    )}

                    <div className="pt-1 text-[11px] text-muted">
                      From listener <span className="text-cream font-medium">@{sub.submitterUsername}</span>
                    </div>
                  </div>
                </div>

                {/* Curator Actions */}
                <div className="flex items-center space-x-2.5 shrink-0 self-end md:self-center">
                  <a
                    href={sub.song.externalUrls.spotify || sub.song.externalUrls.web}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-full border border-border bg-surface-container hover:bg-surface-elevated text-muted hover:text-cream transition"
                    title="Open track on Spotify"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-400" />
                  </a>

                  <Link
                    href={`/schedule?preselect=${encodeURIComponent(sub.id)}`}
                    className="px-4 py-2 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-white transition flex items-center shadow-sm"
                  >
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    Schedule Release
                  </Link>

                  {sub.status === 'queued' && (
                    <>
                      <button
                        onClick={() => handleRemove(sub.id, sub.song.title)}
                        className="p-2.5 rounded-full text-muted hover:text-rose-400 bg-surface-container hover:bg-rose-950/30 border border-border hover:border-rose-800/40 transition"
                        title="Decline from queue"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleBanUser(sub.userId, sub.submitterUsername)}
                        className="p-2.5 rounded-full text-muted hover:text-rose-400 bg-surface-container hover:bg-rose-950/30 border border-border hover:border-rose-800/40 transition"
                        title={`Suspend user @${sub.submitterUsername}`}
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
