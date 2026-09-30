import * as admin from 'firebase-admin';
import { SAMPLE_FALLBACK_TRACKS } from '@365/core';

if (!admin.apps.length) {
  // Use default credentials or emulator
  admin.initializeApp();
}

const db = admin.firestore();

async function runSeed() {
  console.log('--- Seeding 365 Firestore Database ---');

  // 1. Config
  console.log('Setting config/app...');
  await db.collection('config').doc('app').set({
    releaseTime: '19:00',
    timezone: 'Asia/Kolkata',
    lastDayNumber: 47,
  });

  // 2. Users
  console.log('Seeding users...');
  const users = [
    {
      id: 'usr_maya',
      authProvider: 'google',
      displayName: 'Maya Lin',
      username: 'maya',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      isGuest: false,
      isBanned: false,
      notificationPrefs: { dailyRelease: true, songSelected: true },
      fcmTokens: ['token_maya_1'],
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'usr_julian',
      authProvider: 'google',
      displayName: 'Julian K',
      username: 'juliank',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      isGuest: false,
      isBanned: false,
      notificationPrefs: { dailyRelease: true, songSelected: true },
      fcmTokens: ['token_julian_1'],
      createdAt: '2026-09-02T00:00:00Z',
      updatedAt: '2026-09-02T00:00:00Z',
    },
    {
      id: 'usr_tariq',
      authProvider: 'google',
      displayName: 'Tariq N',
      username: 'tariq',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      isGuest: false,
      isBanned: false,
      notificationPrefs: { dailyRelease: true, songSelected: true },
      fcmTokens: ['token_tariq_1'],
      createdAt: '2026-09-03T00:00:00Z',
      updatedAt: '2026-09-03T00:00:00Z',
    },
  ];

  for (const user of users) {
    await db.collection('users').doc(user.id).set(user, { merge: true });
  }

  // 3. Songs Catalog
  console.log('Seeding catalog songs...');
  for (const song of SAMPLE_FALLBACK_TRACKS) {
    await db.collection('songs').doc(song.id).set(song, { merge: true });
  }

  // 4. Daily Songs (Published History)
  console.log('Seeding published daily songs...');
  const dailyHistory = [
    {
      id: '2026-09-30',
      date: '2026-09-30',
      dayNumber: 47,
      songId: SAMPLE_FALLBACK_TRACKS[0].id,
      song: SAMPLE_FALLBACK_TRACKS[0],
      submitterId: 'usr_maya',
      submitterUsername: 'maya',
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
      publishedAt: '2026-09-28T13:30:00Z',
      status: 'published',
    },
  ];

  for (const daily of dailyHistory) {
    await db.collection('dailySongs').doc(daily.id).set(daily, { merge: true });
  }

  // 5. Queued Submissions
  console.log('Seeding queued community submissions...');
  const queueItems = [
    {
      id: `sub_${SAMPLE_FALLBACK_TRACKS[2].id}`,
      songId: SAMPLE_FALLBACK_TRACKS[2].id,
      song: SAMPLE_FALLBACK_TRACKS[2],
      userId: 'usr_julian',
      submitterUsername: 'juliank',
      submitterDisplayName: 'Julian K',
      submittedAt: '2026-09-30T09:00:00Z',
      status: 'queued',
    },
    {
      id: `sub_${SAMPLE_FALLBACK_TRACKS[3].id}`,
      songId: SAMPLE_FALLBACK_TRACKS[3].id,
      song: SAMPLE_FALLBACK_TRACKS[3],
      userId: 'usr_tariq',
      submitterUsername: 'tariq',
      submitterDisplayName: 'Tariq N',
      submittedAt: '2026-09-30T10:15:00Z',
      status: 'queued',
    },
  ];

  for (const queueItem of queueItems) {
    await db.collection('submissions').doc(queueItem.id).set(queueItem, { merge: true });
  }

  // 6. Moderation Reports
  console.log('Seeding moderation reports...');
  await db.collection('reports').doc('rep_example_1').set({
    id: 'rep_example_1',
    reporterId: 'usr_maya',
    targetType: 'user',
    targetId: 'usr_spammer_99',
    reason: 'Suspicious bot submission pattern',
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  console.log('--- 365 Firestore Seed Completed Successfully! ---');
}

runSeed().catch((err) => {
  console.error('Seed execution error:', err);
  process.exit(1);
});
