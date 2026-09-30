export type AuthProviderType = 'google' | 'guest';

export interface UserNotificationPreferences {
  dailyRelease: boolean;
  songSelected: boolean;
}

export interface UserProfile {
  id: string;
  authProvider: AuthProviderType;
  googleId?: string;
  displayName: string;
  username: string; // e.g. "kartik" or "maya"
  avatar?: string;
  isGuest: boolean;
  isBanned: boolean;
  notificationPrefs: UserNotificationPreferences;
  fcmTokens: string[];
  createdAt: string;
  updatedAt: string;
}

export type MusicProviderType = 'spotify' | 'apple' | 'youtube';

export interface SongMetadata {
  durationMs?: number;
  isExplicit?: boolean;
  previewUrl?: string | null;
  genre?: string;
  releaseYear?: number;
  palette?: {
    dominant?: string;
    primary?: string;
    secondary?: string;
    background?: string;
    surface?: string;
  };
}

export interface ExternalUrls {
  spotify?: string;
  apple?: string;
  youtube?: string;
  web?: string;
}

export interface Song {
  id: string; // Deterministic: `${provider}_${providerSongId}`
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  provider: MusicProviderType;
  providerSongId: string;
  externalUrls: ExternalUrls;
  metadata: SongMetadata;
  createdAt: string;
}

export type SubmissionStatus = 'queued' | 'selected' | 'removed' | 'rejected';

export interface Submission {
  id: string; // e.g. deterministic songId `${provider}_${providerSongId}` or unique ID with unique songId index
  songId: string;
  song: Song;
  userId: string;
  submitterUsername: string;
  submitterDisplayName: string;
  submittedAt: string;
  status: SubmissionStatus;
  selectedDate?: string; // YYYY-MM-DD when selected
  rejectionReason?: string;
}

export type DailySongStatus = 'scheduled' | 'published';

export interface DailySong {
  id: string; // Date formatted YYYY-MM-DD
  date: string; // YYYY-MM-DD
  dayNumber: number; // e.g. 47
  songId: string;
  song: Song;
  submitterId: string;
  submitterUsername: string;
  submitterDisplayName?: string;
  publishedAt: string | null;
  status: DailySongStatus;
}

export type NotificationType = 'daily_release' | 'song_selected';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  relatedSongId: string;
  relatedDayNumber?: number;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
}

export type ReportTargetType = 'song' | 'user';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'resolved';

export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  notes?: string;
}

export interface AppConfig {
  releaseTime: string; // "19:00" default (7:00 PM)
  timezone: string;    // "Asia/Kolkata" default
  lastDayNumber: number;
  maintenanceMode?: boolean;
}
