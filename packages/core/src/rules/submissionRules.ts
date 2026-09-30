import { Submission, UserProfile } from '../types/index.js';

export interface CanSubmitResult {
  canSubmit: boolean;
  errorCode?: 'GUEST_UNAUTHORIZED' | 'USER_BANNED' | 'ACTIVE_SUBMISSION_EXISTS' | 'SONG_ALREADY_QUEUED';
  message?: string;
}

/**
 * Validates whether a user can submit a song according to 365 core rules:
 * 1. Must not be guest (must sign in with Google).
 * 2. Must not be banned.
 * 3. Exactly one active submission per user.
 * 4. Duplicate song prevention: song must not already be in the active queue.
 */
export function validateSubmissionEligibility(
  user: UserProfile,
  songId: string,
  userActiveSubmissions: Submission[],
  existingSongSubmissions: Submission[]
): CanSubmitResult {
  if (user.isGuest) {
    return {
      canSubmit: false,
      errorCode: 'GUEST_UNAUTHORIZED',
      message: 'Sign in with Google to submit a song.',
    };
  }

  if (user.isBanned) {
    return {
      canSubmit: false,
      errorCode: 'USER_BANNED',
      message: 'Your account is restricted from submitting songs.',
    };
  }

  // Rule: One active submission per user
  const hasActiveUserSubmission = userActiveSubmissions.some(
    (sub) => sub.userId === user.id && sub.status === 'queued'
  );
  if (hasActiveUserSubmission) {
    return {
      canSubmit: false,
      errorCode: 'ACTIVE_SUBMISSION_EXISTS',
      message: 'You already have an active submission in the 365 queue. You can submit a new song tomorrow.',
    };
  }

  // Rule: Song duplicate prevention
  const songAlreadyInQueue = existingSongSubmissions.some(
    (sub) => sub.songId === songId && sub.status === 'queued'
  );
  if (songAlreadyInQueue) {
    return {
      canSubmit: false,
      errorCode: 'SONG_ALREADY_QUEUED',
      message: 'This song is already in the 365 queue.',
    };
  }

  return { canSubmit: true };
}
