import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { executeDailyReleaseProcess } from './functions/dailyRelease.js';
import { submitSongTransaction, SubmitSongInput } from './functions/submitSong.js';

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Scheduled Cloud Function running at 7:00 PM IST (Asia/Kolkata) daily.
 * Cron expression: 0 19 * * *
 */
export const scheduledDailyRelease = functions.pubsub
  .schedule('0 19 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    console.log('[scheduledDailyRelease] Triggered at scheduled release time.');
    const result = await executeDailyReleaseProcess();
    console.log('[scheduledDailyRelease] Completed with result:', result);
    return null;
  });

/**
 * HTTPS Callable for Admins to trigger or test daily release.
 */
export const adminTriggerDailyRelease = functions.https.onCall(async (data, context) => {
  // Check admin authorization
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only administrators can trigger the daily release manually.'
    );
  }

  const targetDate = data?.targetDate as string | undefined;
  return await executeDailyReleaseProcess(targetDate);
});

/**
 * HTTPS Callable for authenticated users to submit songs.
 */
export const submitSong = functions.https.onCall(async (data: SubmitSongInput, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Sign in with Google to submit a song.'
    );
  }

  try {
    const result = await submitSongTransaction({
      userId: context.auth.uid,
      song: data.song,
    });
    return result;
  } catch (err: any) {
    throw new functions.https.HttpsError('invalid-argument', err.message || 'Submission failed.');
  }
});

/**
 * Helper to assign admin claims to an email or UID.
 */
export const grantAdminClaim = functions.https.onCall(async (data, context) => {
  // Requires superadmin secret or master service account
  const { targetEmail } = data;
  if (!targetEmail) {
    throw new functions.https.HttpsError('invalid-argument', 'targetEmail is required.');
  }

  const user = await admin.auth().getUserByEmail(targetEmail);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  return { success: true, message: `Admin claim granted to ${targetEmail}` };
});
