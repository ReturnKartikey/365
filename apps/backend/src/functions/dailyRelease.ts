import * as admin from 'firebase-admin';
import { DailySong, Submission, ManualSongSelector, AppConfig } from '@365/core';
import { dispatchFCMNotification } from './pushDispatcher.js';

const songSelector = new ManualSongSelector();

export async function executeDailyReleaseProcess(targetDateStr?: string): Promise<{
  success: boolean;
  publishedSong: DailySong | null;
  message: string;
}> {
  const db = admin.firestore();

  // 1. Determine target date (default to today in IST YYYY-MM-DD)
  const now = new Date();
  const dateFormatted =
    targetDateStr ||
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

  console.log(`[DailyRelease] Running release process for date: ${dateFormatted}`);

  // 2. Fetch config to know current day number sequence
  const configRef = db.collection('config').doc('app');
  const configSnap = await configRef.get();
  const config = (configSnap.data() as AppConfig | undefined) || {
    releaseTime: '19:00',
    timezone: 'Asia/Kolkata',
    lastDayNumber: 47,
  };

  const nextDayNumber = (config.lastDayNumber || 46) + 1;

  // 3. Check if there is already a scheduled or published song for targetDate
  const dailyDocRef = db.collection('dailySongs').doc(dateFormatted);
  const dailyDocSnap = await dailyDocRef.get();

  let scheduledSong: DailySong | null = null;
  if (dailyDocSnap.exists) {
    const existing = dailyDocSnap.data() as DailySong;
    if (existing.status === 'published') {
      console.log(`[DailyRelease] Song for ${dateFormatted} is already published.`);
      return {
        success: true,
        publishedSong: existing,
        message: 'Song is already published for today.',
      };
    }
    scheduledSong = existing;
  }

  // 4. Fetch queued submissions
  const queueSnap = await db
    .collection('submissions')
    .where('status', '==', 'queued')
    .orderBy('submittedAt', 'asc')
    .limit(20)
    .get();

  const activeQueue: Submission[] = queueSnap.docs.map((doc) => doc.data() as Submission);

  // 5. Run SongSelector interface
  const selectionResult = await songSelector.selectSong({
    targetDate: dateFormatted,
    dayNumber: scheduledSong?.dayNumber || nextDayNumber,
    scheduledSong,
    activeQueue,
  });

  if (!selectionResult.songSelected) {
    console.warn(`[DailyRelease] Graceful fallback: ${selectionResult.warningMessage}`);
    // Record alert in config/admin log so admin sees it, without crashing
    await db.collection('adminAlerts').add({
      type: 'EMPTY_DAILY_RELEASE_FALLBACK',
      date: dateFormatted,
      message: selectionResult.warningMessage,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: false,
      publishedSong: null,
      message: selectionResult.warningMessage || 'No song available for release today.',
    };
  }

  const selectedSong = selectionResult.songSelected;

  // 6. Transactionally update dailySong, mark submission selected, and increment config lastDayNumber
  await db.runTransaction(async (transaction) => {
    transaction.set(
      dailyDocRef,
      {
        ...selectedSong,
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'published',
      },
      { merge: true }
    );

    // If selected from queue, mark that submission as selected
    const matchingSubDoc = queueSnap.docs.find((d) => d.data().songId === selectedSong.songId);
    if (matchingSubDoc) {
      transaction.update(matchingSubDoc.ref, {
        status: 'selected',
        selectedDate: dateFormatted,
      });
    }

    transaction.set(
      configRef,
      {
        lastDayNumber: selectedSong.dayNumber,
      },
      { merge: true }
    );
  });

  // 7. Dispatch FCM Push Notifications
  try {
    // A. Submitter push: "🎉 Your song is today's 365."
    if (selectedSong.submitterId) {
      const submitterSnap = await db.collection('users').doc(selectedSong.submitterId).get();
      const submitterData = submitterSnap.data();

      if (submitterData?.fcmTokens && submitterData.fcmTokens.length > 0) {
        await dispatchFCMNotification(submitterData.fcmTokens, {
          title: '🎉 Your song is today\'s 365.',
          body: `"${selectedSong.song.title}" is today's community pick. Tap to see the daily ritual.`,
          data: {
            type: 'song_selected',
            songId: selectedSong.songId,
            dayNumber: selectedSong.dayNumber.toString(),
          },
        });
      }
    }

    // B. Daily release push: "🎧 Today's 365 is here." to all users with dailyRelease enabled
    const subscribersSnap = await db
      .collection('users')
      .where('notificationPrefs.dailyRelease', '==', true)
      .get();

    const allTokens: string[] = [];
    subscribersSnap.forEach((doc) => {
      const u = doc.data();
      if (Array.isArray(u.fcmTokens)) {
        allTokens.push(...u.fcmTokens);
      }
    });

    if (allTokens.length > 0) {
      await dispatchFCMNotification(allTokens, {
        title: '🎧 Today\'s 365 is here.',
        body: `Day ${selectedSong.dayNumber}: "${selectedSong.song.title}" by ${selectedSong.song.artist}. Tap to listen.`,
        data: {
          type: 'daily_release',
          songId: selectedSong.songId,
          dayNumber: selectedSong.dayNumber.toString(),
        },
      });
    }
  } catch (pushErr) {
    console.error('[DailyRelease] Push notification delivery error:', pushErr);
  }

  return {
    success: true,
    publishedSong: selectedSong,
    message: `Day ${selectedSong.dayNumber} successfully released.`,
  };
}
