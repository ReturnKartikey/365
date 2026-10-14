'use client';

import React, { useState, useEffect } from 'react';
import { AdminDataService } from '../../lib/adminData';
import { AppConfig } from '@365/core';
import { Clock, Globe, Save, Check, BellRing, Sliders, Shield } from 'lucide-react';

export default function ConfigPage() {
  const [config, setConfig] = useState<AppConfig>(AdminDataService.getConfig());
  const [releaseTime, setReleaseTime] = useState(config.releaseTime || '19:00');
  const [timezone, setTimezone] = useState(config.timezone || 'Asia/Kolkata');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    AdminDataService.fetchConfig().then((c) => {
      setConfig(c);
      if (c.releaseTime) setReleaseTime(c.releaseTime);
      if (c.timezone) setTimezone(c.timezone);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await AdminDataService.updateConfig({
      releaseTime,
      timezone,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3500);
  };

  return (
    <div className="space-y-10 max-w-3xl">
      {/* Header */}
      <div className="border-b border-border/80 pb-6">
        <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-[0.2em] text-primary mb-1.5">
          <Sliders className="w-3.5 h-3.5 text-amber" />
          <span>System Parameters</span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-serif font-bold text-cream tracking-tight">
          Ritual Configuration
        </h1>
        <p className="text-muted text-sm mt-1.5 max-w-xl leading-relaxed">
          Configure the synchronized global release hour and timezone for the 365 community drop.
        </p>
      </div>

      {savedNotice && (
        <div className="bg-surface-container border border-primary/40 text-cream px-4 py-3 rounded-2xl text-xs flex items-center">
          <Check className="w-4 h-4 mr-2 text-primary" />
          Ritual configuration saved successfully to Supabase.
        </div>
      )}

      {/* Configuration Form */}
      <form onSubmit={handleSave} className="bg-surface border border-border p-6 sm:p-8 rounded-3xl space-y-8">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-muted font-semibold mb-2 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-primary" /> Daily Drop Time (24h Format)
          </label>
          <input
            type="time"
            value={releaseTime}
            onChange={(e) => setReleaseTime(e.target.value)}
            className="w-full sm:w-64 bg-surface-container border border-border px-4 py-2.5 rounded-xl text-cream font-mono text-sm focus:outline-none focus:border-primary transition"
          />
          <p className="text-[11px] text-muted/70 mt-2 leading-relaxed">
            Default is 19:00 (7:00 PM IST). Automated pg_cron will unveil the next queued track at this precise instant.
          </p>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-muted font-semibold mb-2 flex items-center">
            <Globe className="w-4 h-4 mr-2 text-amber" /> Reference Timezone
          </label>
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="Asia/Kolkata"
            className="w-full sm:w-64 bg-surface-container border border-border px-4 py-2.5 rounded-xl text-cream font-mono text-xs focus:outline-none focus:border-primary transition"
          />
          <p className="text-[11px] text-muted/70 mt-2 leading-relaxed">
            IANA timezone identifier used to anchor calendar day rollover and daily push dispatch.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container/70 border border-border-subtle flex items-start space-x-3 text-xs text-muted">
          <BellRing className="w-4 h-4 text-amber shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-cream block mb-0.5">Automated Ritual Pipeline</span>
            When the release hour strikes, the Supabase stored procedure marks the song as published and invokes the Expo push dispatcher.
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold tracking-wide transition flex items-center shadow-sm"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Configuration
        </button>
      </form>
    </div>
  );
}
