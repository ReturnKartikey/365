'use client';

import React, { useState } from 'react';
import { AdminDataService } from '../../lib/adminData';
import { Submission } from '@365/core';
import { Trash2, CheckCircle, Search, ExternalLink, ShieldAlert } from 'lucide-react';

export default function QueuePage() {
  const [submissions, setSubmissions] = useState<Submission[]>(AdminDataService.getSubmissions());
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  const handleRemove = (id: string) => {
    if (confirm('Are you sure you want to remove this submission from the queue?')) {
      AdminDataService.removeSubmission(id, 'Removed by admin moderator');
      setSubmissions(AdminDataService.getSubmissions());
    }
  };

  const handleBanUser = (userId: string, username: string) => {
    if (confirm(`Ban user @${username}? This will remove all their submissions.`)) {
      AdminDataService.banUser(userId);
      setSubmissions(AdminDataService.getSubmissions());
      alert(`User @${username} has been banned.`);
    }
  };

  const filtered = submissions.filter((s) => {
    const q = searchFilter.toLowerCase();
    return (
      s.song.title.toLowerCase().includes(q) ||
      s.song.artist.toLowerCase().includes(q) ||
      s.submitterUsername.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-border pb-6 gap-4">
        <div>
          <span className="text-xs font-semibold tracking-widest text-primary uppercase">Listening Pool</span>
          <h1 className="text-4xl font-serif font-bold text-white tracking-tight mt-1">Submission Queue</h1>
          <p className="text-muted text-sm mt-1">Review community recommendations submitted by registered listeners.</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted" />
          <input
            type="text"
            placeholder="Filter queue by title, artist, user..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-surface border border-border pl-10 pr-4 py-2 rounded-full text-sm text-white placeholder-muted focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Submissions Table / Cards */}
      <div className="bg-surface border border-border rounded-3xl overflow-hidden">
        <div className="divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted text-sm">
              No submissions match your search query.
            </div>
          ) : (
            filtered.map((sub) => (
              <div
                key={sub.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-elevated/40 transition"
              >
                <div className="flex items-center space-x-4">
                  <img
                    src={sub.song.artworkUrl}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover shadow"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          sub.status === 'queued'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : sub.status === 'selected'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {sub.status}
                      </span>
                      <span className="text-xs text-muted">
                        Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mt-1">{sub.song.title}</h3>
                    <p className="text-sm text-gray-300">{sub.song.artist}</p>
                    <p className="text-xs text-primary mt-1">
                      Submitted by @{sub.submitterUsername} ({sub.submitterDisplayName})
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5">
                  <a
                    href={sub.song.externalUrls.spotify}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-full border border-border bg-surface-elevated text-gray-300 hover:text-white hover:border-primary transition"
                    title="Open on Spotify"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {sub.status === 'queued' && (
                    <>
                      <button
                        onClick={() => handleRemove(sub.id)}
                        className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-rose-950/40 border border-rose-800/40 text-rose-300 hover:bg-rose-900/60 transition flex items-center"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Remove
                      </button>

                      <button
                        onClick={() => handleBanUser(sub.userId, sub.submitterUsername)}
                        className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-surface border border-border text-gray-400 hover:text-rose-400 hover:border-rose-500/40 transition flex items-center"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                        Ban User
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
