import * as admin from 'firebase-admin';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data: {
    type: 'daily_release' | 'song_selected';
    songId: string;
    dayNumber: string;
    url?: string;
  };
}

/**
 * Dispatches push notifications to FCM tokens in batches of up to 500 tokens.
 */
export async function dispatchFCMNotification(
  tokens: string[],
  payload: PushNotificationPayload
): Promise<{ successCount: number; failureCount: number }> {
  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const messaging = admin.messaging();
  let successCount = 0;
  let failureCount = 0;

  // Process in batches of 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batchTokens = tokens.slice(i, i + BATCH_SIZE);

    const message: admin.messaging.MulticastMessage = {
      tokens: batchTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'daily_365_releases',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    try {
      const response = await messaging.sendEachForMulticast(message);
      successCount += response.successCount;
      failureCount += response.failureCount;
    } catch (err) {
      console.error('[PushDispatcher] Batch send error:', err);
      failureCount += batchTokens.length;
    }
  }

  return { successCount, failureCount };
}
