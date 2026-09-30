'use client';

import React, { useState } from 'react';
import { AdminDataService } from '../../lib/adminData';
import { AppConfig } from '@365/core';
import { Clock, Globe, Save, Check, BellRing } from 'lucide-react';

export default function ConfigPage() {
  const [config, setConfig] = useState<AppConfig>(AdminDataService.getConfig());
  const [releaseTime, setReleaseTime] = useState(config.releaseTime || '19:00');
  const [timezone, setTimezone] = useState(config.timezone || 'Asia/Kolkata');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    AdminDataService.updateConfig({
      releaseTime,
      timezone,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3500);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <span className="text-xs font-semibold tracking-widest text-primary uppercase">System Parameters</span>
        <h1 className="text-4xl font-serif font-bold text-white tracking-tight mt-1">Release Configuration</h1>
        <p className="text-muted text-sm mt-1">
          Configure the global moment when the new daily song is unveiled and push notifications are dispatched.
        </p>
      </div>

      {savedNotice && (
        <div className="bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-xl text-sm flex items-center">
          <Check className="w-4 h-4 mr-2 text-emerald-400" />
          Ritual release configuration successfully saved to Firestore.
        </div>
      )}

      {/* Configuration Form */}
      <form onSubmit={handleSave} className="bg-surface border border-border p-8 rounded-3xl space-y-6">
        <div>
          <label className="block text-sm font-semibold text-white mb-2 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-primary" /> Daily Release Time (24h Format)
          </label>
          <input
            type="time"
            value={releaseTime}
            onChange={(e) => setReleaseTime(e.target.value)}
            className="w-full sm:w-60 bg-surface-elevated border border-border px-4 py-2.5 rounded-xl text-white font-medium text-sm focus:outline-none focus:border-primary"
            required
          />
          <p className="text-xs text-muted mt-2">
            Default: 19:00 (7:00 PM). Exactly when the scheduled Cloud Function runs and pushes:
            <span className="text-gray-300 font-medium block mt-1">"🎧 Today's 365 is here."</span>
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2 flex items-center">
            <Globe className="w-4 h-4 mr-2 text-primary" /> Ritual Timezone
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full sm:w-80 bg-surface-elevated border border-border px-4 py-2.5 rounded-xl text-white font-medium text-sm focus:outline-none focus:border-primary"
          >
            <option value="Asia/Kolkata">Asia/Kolkata (IST - Indian Standard Time, UTC+5:30)</option>
            <option value="UTC">UTC (Coordinated Universal Time)</option>
            <option value="America/New_York">America/New_York (EST / EDT)</option>
            <option value="Europe/London">Europe/London (GMT / BST)</option>
            <option value="Europe/Berlin">Europe/Berlin (CET / CEST)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (JST, UTC+9)</option>
          </select>
          <p className="text-xs text-muted mt-2">
            The target timezone determining the 24-hour cycle boundary.
          </p>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="text-sm font-semibold text-white mb-2">Graceful Fallback Policy</div>
          <p className="text-xs text-muted leading-relaxed">
            If no song is scheduled for a given day, the system invokes the pluggable <span className="text-gray-300 font-mono">SongSelector</span> interface.
            In v1, it automatically picks the oldest eligible unselected submission from the queue. If the queue is also empty, the system retains the previous day's song and surfaces an admin alert without crashing.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="px-6 py-3 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
