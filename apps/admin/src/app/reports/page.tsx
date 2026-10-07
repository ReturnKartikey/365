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
    await AdminDataService.resolveReport(id, action, `Actioned by moderator as ${action}`);
    await loadReports();
  };

  const handleBanReportedUser = async (userId: string, reportId: string) => {
    if (confirm(`Ban user ${userId}?`)) {
      await AdminDataService.banUser(userId);
      await AdminDataService.resolveReport(reportId, 'resolved', 'User banned for policy violation');
      await loadReports();
      alert(`User ${userId} banned.`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <span className="text-xs font-semibold tracking-widest text-primary uppercase">Trust & Safety</span>
        <h1 className="text-4xl font-serif font-bold text-white tracking-tight mt-1">Community Reports</h1>
        <p className="text-muted text-sm mt-1">
          Review listener reports concerning songs, inappropriate usernames, spam, or copyright violations.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-3xl overflow-hidden divide-y divide-border">
        {reports.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm flex flex-col items-center">
            <ShieldCheck className="w-10 h-10 text-emerald-400 mb-2" />
            No pending community reports.
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      report.status === 'pending'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {report.status}
                  </span>
                  <span className="text-xs text-muted">
                    Reported {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="text-base font-semibold text-white">
                  Target: <span className="text-primary font-mono">{report.targetType} ({report.targetId})</span>
                </div>

                <p className="text-sm text-gray-300 bg-surface-elevated/70 p-3 rounded-xl border border-border">
                  "{report.reason}"
                </p>

                <p className="text-xs text-muted">
                  Filed by user ID: {report.reporterId}
                </p>
              </div>

              {report.status === 'pending' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleResolve(report.id, 'dismissed')}
                    className="px-4 py-2 rounded-full text-xs font-semibold bg-surface-elevated hover:bg-surface-elevated/80 border border-border text-gray-300 transition flex items-center"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Dismiss
                  </button>

                  <button
                    onClick={() => handleResolve(report.id, 'resolved')}
                    className="px-4 py-2 rounded-full text-xs font-semibold bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/60 transition flex items-center"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Mark Resolved
                  </button>

                  {report.targetType === 'user' && (
                    <button
                      onClick={() => handleBanReportedUser(report.targetId, report.id)}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      Ban Account
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
