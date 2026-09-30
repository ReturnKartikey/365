import {
  DailySong,
  Submission,
  Report,
  AppConfig,
  SAMPLE_FALLBACK_TRACKS,
  Song,
  SpotifyProvider,
} from '@365/core';

export interface AdminStats {
  totalUsers: number;
  queueSize: number;
  totalDailySongs: number;
  pendingReports: number;
}

const spotifyProvider = new SpotifyProvider({ enableFallback: true });

let mockDailySongs: DailySong[] = [
  {
    id: '2026-09-30',
    date: '2026-09-30',
    dayNumber: 47,
    songId: SAMPLE_FALLBACK_TRACKS[0].id,
    song: SAMPLE_FALLBACK_TRACKS[0],
    submitterId: 'usr_maya',
    submitterUsername: 'maya',
    submitterDisplayName: 'Maya Lin',
    publishedAt: '2026-09-30T13:30:00Z',
    status: 'published',
  },
  {
    id: '2026-09-29',
    date: '2026-09-29',
    dayNumber: 46,
    songId: SAMPLE_FALLBACK_TRACKS[4].id,
    song: SAMPLE_FALLBACK_TRACKS[4],
    submitterId: 'usr_julian',
    submitterUsername: 'juliank',
    submitterDisplayName: 'Julian K',
    publishedAt: '2026-09-29T13:30:00Z',
    status: 'published',
  },
  {
    id: '2026-09-28',
    date: '2026-09-28',
    dayNumber: 45,
    songId: SAMPLE_FALLBACK_TRACKS[1].id,
    song: SAMPLE_FALLBACK_TRACKS[1],
    submitterId: 'usr_tariq',
    submitterUsername: 'tariq',
    submitterDisplayName: 'Tariq N',
    publishedAt: '2026-09-28T13:30:00Z',
    status: 'published',
  },
];

let mockSubmissions: Submission[] = [
  {
    id: `sub_${SAMPLE_FALLBACK_TRACKS[2].id}`,
    songId: SAMPLE_FALLBACK_TRACKS[2].id,
    song: SAMPLE_FALLBACK_TRACKS[2],
    userId: 'usr_julian',
    submitterUsername: 'juliank',
    submitterDisplayName: 'Julian K',
    submittedAt: '2026-09-30T09:12:00Z',
    status: 'queued',
  },
  {
    id: `sub_${SAMPLE_FALLBACK_TRACKS[3].id}`,
    songId: SAMPLE_FALLBACK_TRACKS[3].id,
    song: SAMPLE_FALLBACK_TRACKS[3],
    userId: 'usr_tariq',
    submitterUsername: 'tariq',
    submitterDisplayName: 'Tariq N',
    submittedAt: '2026-09-30T10:45:00Z',
    status: 'queued',
  },
];

let mockReports: Report[] = [
  {
    id: 'rep_1',
    reporterId: 'usr_maya',
    targetType: 'user',
    targetId: 'usr_spammer_99',
    reason: 'Suspicious bot submission pattern',
    status: 'pending',
    createdAt: '2026-09-30T11:00:00Z',
  },
];

let mockConfig: AppConfig = {
  releaseTime: '19:00',
  timezone: 'Asia/Kolkata',
  lastDayNumber: 47,
};

let bannedUserIds = new Set<string>();

export const AdminDataService = {
  getStats(): AdminStats {
    return {
      totalUsers: 1420,
      queueSize: mockSubmissions.filter((s) => s.status === 'queued').length,
      totalDailySongs: mockDailySongs.length,
      pendingReports: mockReports.filter((r) => r.status === 'pending').length,
    };
  },

  getDailySongs(): DailySong[] {
    return [...mockDailySongs];
  },

  getTodaySong(): DailySong | undefined {
    return mockDailySongs.find((d) => d.date === '2026-09-30');
  },

  getSubmissions(): Submission[] {
    return [...mockSubmissions];
  },

  getReports(): Report[] {
    return [...mockReports];
  },

  getConfig(): AppConfig {
    return { ...mockConfig };
  },

  updateConfig(config: Partial<AppConfig>): AppConfig {
    mockConfig = { ...mockConfig, ...config };
    return { ...mockConfig };
  },

  scheduleSongForDate(date: string, song: Song, submitter: { id: string; username: string }): DailySong {
    const existingIndex = mockDailySongs.findIndex((d) => d.date === date);
    const dayNumber = mockConfig.lastDayNumber + 1;

    const newDaily: DailySong = {
      id: date,
      date,
      dayNumber,
      songId: song.id,
      song,
      submitterId: submitter.id,
      submitterUsername: submitter.username,
      publishedAt: null,
      status: 'scheduled',
    };

    if (existingIndex >= 0) {
      mockDailySongs[existingIndex] = newDaily;
    } else {
      mockDailySongs.unshift(newDaily);
    }

    // Mark queued submission if it was from queue
    const queueSub = mockSubmissions.find((s) => s.songId === song.id);
    if (queueSub) {
      queueSub.status = 'selected';
      queueSub.selectedDate = date;
    }

    return newDaily;
  },

  removeSubmission(submissionId: string, reason?: string): void {
    const sub = mockSubmissions.find((s) => s.id === submissionId);
    if (sub) {
      sub.status = 'removed';
      sub.rejectionReason = reason || 'Removed by moderator';
    }
  },

  resolveReport(reportId: string, action: 'dismissed' | 'resolved', notes?: string): void {
    const rep = mockReports.find((r) => r.id === reportId);
    if (rep) {
      rep.status = action;
      rep.notes = notes;
    }
  },

  banUser(userId: string): void {
    bannedUserIds.add(userId);
    // Remove active submissions by this user
    mockSubmissions.forEach((sub) => {
      if (sub.userId === userId && sub.status === 'queued') {
        sub.status = 'rejected';
        sub.rejectionReason = 'User account suspended for policy violation';
      }
    });
  },

  isUserBanned(userId: string): boolean {
    return bannedUserIds.has(userId);
  },

  async searchCatalog(query: string): Promise<Song[]> {
    return spotifyProvider.searchTracks(query);
  },
};
