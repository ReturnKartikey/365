import { DailySong, Submission } from '../types/index.js';

export interface SelectorContext {
  targetDate: string; // YYYY-MM-DD
  dayNumber: number;
  scheduledSong?: DailySong | null;
  activeQueue: Submission[];
  recentDailySongs?: DailySong[];
}

export interface SelectionResult {
  songSelected: DailySong | null;
  source: 'scheduled_manual' | 'algorithmic_fallback' | 'none';
  warningMessage?: string;
}

/**
 * Interface for pluggable song selection strategies.
 * v1: ManualSongSelector (admin curated/scheduled days).
 * Future: AlgorithmicSelector (queue age, diversity, discovery).
 */
export interface SongSelector {
  readonly selectorName: string;
  selectSong(context: SelectorContext): Promise<SelectionResult>;
}

/**
 * v1 Manual Selector:
 * Prioritizes admin pre-scheduled songs for targetDate.
 * If none is scheduled for today, checks if there is any queued submission
 * or gracefully returns source: 'none' with an actionable warning for admin.
 */
export class ManualSongSelector implements SongSelector {
  public readonly selectorName = 'v1_manual_admin_selector';

  public async selectSong(context: SelectorContext): Promise<SelectionResult> {
    const { targetDate, scheduledSong, activeQueue, dayNumber } = context;

    // 1. If an admin scheduled a song specifically for this date, pick it.
    if (scheduledSong) {
      return {
        songSelected: {
          ...scheduledSong,
          status: 'published',
          publishedAt: new Date().toISOString(),
        },
        source: 'scheduled_manual',
      };
    }

    // 2. Fallback check: if nothing was pre-scheduled, do we have queued submissions?
    if (activeQueue.length > 0) {
      // Graceful fallback to the earliest unselected submission in queue
      const candidate = activeQueue[0];
      const fallbackDailySong: DailySong = {
        id: targetDate,
        date: targetDate,
        dayNumber,
        songId: candidate.songId,
        song: candidate.song,
        submitterId: candidate.userId,
        submitterUsername: candidate.submitterUsername,
        submitterDisplayName: candidate.submitterDisplayName,
        publishedAt: new Date().toISOString(),
        status: 'published',
      };

      return {
        songSelected: fallbackDailySong,
        source: 'algorithmic_fallback',
        warningMessage: `No manual selection scheduled for ${targetDate}. Gracefully selected oldest submission: ${candidate.song.title}.`,
      };
    }

    // 3. Graceful fallback when queue is also empty: don't crash
    return {
      songSelected: null,
      source: 'none',
      warningMessage: `No song was scheduled for ${targetDate} and queue is empty. App will display previous day's song gracefully.`,
    };
  }
}
