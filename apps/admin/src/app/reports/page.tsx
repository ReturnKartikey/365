'use client';

import React, { useState, useEffect } from 'react';
import { AdminDataService } from '../../lib/adminData';
import { Report } from '@365/core';
import { ShieldCheck, Flag, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>(AdminDataService.getReports());

  const loadReports = async () => {
    try {
      const data = await AdminDataService.fetchReports();
      setReports(data);
    } catch (e) {
      console.warn('Error fetching reports:', e);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleResolve = async (id: string, action: 'dismissed' | 'resolved') => {
    await AdminDataService.resolveReport(id, action, `Actioned by curator as ${action}`);
    await loadReports();
  };

  const handleBanReportedUser = async (userId: string, reportId: string) => {
    if (confirm(`Suspend user ${userId} and remove all associated submissions?`)) {
      await AdminDataService.banUser(userId);
      await AdminDataService.resolveReport(reportId, 'resolved', 'User banned for policy violation');
      await loadReports();
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b border-border/80 pb-6">
        <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-[0.2em] text-primary mb-1.5">
          <Flag className="w-3.5 h-3.5 text-amber" />
          <span>Trust & Safety Desk</span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-serif font-bold text-cream tracking-tight">
          Community Reports
        </h1>
        <p className="text-muted text-sm mt-1.5 max-w-xl leading-relaxed">
          Review community reports regarding explicit lyrics, inappropriate submissions, spam, or metadata errors.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-3xl overflow-hidden divide-y divide-border/80">
        {reports.length === 0 ? (
          <div className="p-16 text-center text-muted text-xs flex flex-col items-center">
            <ShieldCheck className="w-10 h-10 text-emerald-400 mb-3 opacity-80" />
            <span className="font-serif text-lg font-bold text-cream mb-1">Safety Desk Clear</span>
            <span>No pending community reports. All listeners and submissions adhere to policy.</span>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-surface-container/50 transition">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider ${
                      report.status === 'pending'
                        ? 'bg-amber/15 text-amber border border-amber/30'
                        : 'bg-surface-elevated text-muted border border-border'
                    }`}
                  >
                    {report.status}
                  </span>
                  <span className="text-[11px] font-mono text-muted">
                    Reported on {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-[11px] font-mono text-primary uppercase">
                    Target: {report.targetType}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-cream">
                    Reason: <span className="font-normal text-cream/90">{report.reason}</span>
                  </p>
                  {report.notes && (
                    <p className="text-xs text-muted leading-relaxed">
                      Listener note: &ldquo;{report.notes}&rdquo;
                    </p>
                  )}
                  <p className="text-[11px] font-mono text-muted/60">
                    Target ID: {report.targetId}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              {report.status === 'pending' && (
                <div className="flex items-center space-x-2.5 shrink-0">
                  <button
                    onClick={() => handleResolve(report.id, 'dismissed')}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-surface-container hover:bg-surface-elevated text-muted hover:text-cream border border-border transition flex items-center"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Dismiss
                  </button>

                  <button
                    onClick={() => handleResolve(report.id, 'resolved')}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/40 transition flex items-center"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Action & Resolve
                  </button>

                  {report.targetType === 'user' && (
                    <button
                      onClick={() => handleBanReportedUser(report.targetId, report.id)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition flex items-center"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      Suspend User
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
