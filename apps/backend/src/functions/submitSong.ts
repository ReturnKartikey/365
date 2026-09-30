import * as admin from 'firebase-admin';
import { Song, Submission, UserProfile, validateSubmissionEligibility } from '@365/core';

export interface SubmitSongInput {
  userId: string;
  song: Song;
}

export interface SubmitSongResult {
  success: boolean;
  submission?: Submission;
  error?: string;
}

export async function submitSongTransaction(input: SubmitSongInput): Promise<SubmitSongResult> {
  const db = admin.firestore();
  const { userId, song } = input;

  // 1. Fetch user doc
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    return { success: false, error: 'User account not found.' };
  }

  const user = userSnap.data() as UserProfile;

  // 2. Query user's existing queued submissions & existing queued submissions for this song
  const userQueuedSnap = await db
    .collection('submissions')
    .where('userId', '==', userId)
    .where('status', '==', 'queued')
    .get();

  const userActiveSubmissions = userQueuedSnap.docs.map((d) => d.data() as Submission);

  const songQueuedSnap = await db
    .collection('submissions')
    .where('songId', '==', song.id)
    .where('status', '==', 'queued')
    .get();

  const existingSongSubmissions = songQueuedSnap.docs.map((d) => d.data() as Submission);

  // 3. Core eligibility validation
  const validation = validateSubmissionEligibility(
    user,
    song.id,
    userActiveSubmissions,
    existingSongSubmissions
  );

  if (!validation.canSubmit) {
    return { success: false, error: validation.message };
  }

  // 4. Save song metadata & submission
  const songRef = db.collection('songs').doc(song.id);
  const submissionDocId = `sub_${song.provider}_${song.providerSongId}`;
  const submissionRef = db.collection('submissions').doc(submissionDocId);

  const newSubmission: Submission = {
    id: submissionDocId,
    songId: song.id,
    song,
    userId: user.id,
    submitterUsername: user.username,
    submitterDisplayName: user.displayName,
    submittedAt: new Date().toISOString(),
    status: 'queued',
  };

  await db.runTransaction(async (transaction) => {
    // Re-check doc existence in transaction for ultimate race-condition protection
    const subSnap = await transaction.get(submissionRef);
    if (subSnap.exists && subSnap.data()?.status === 'queued') {
      throw new Error('This song is already in the 365 queue.');
    }

    // Upsert song
    transaction.set(songRef, song, { merge: true });
    // Write submission
    transaction.set(submissionRef, newSubmission);
  });

  return { success: true, submission: newSubmission };
}
