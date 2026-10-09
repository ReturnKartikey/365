import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Sparkles, Play, X, Disc } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { NotificationService } from '../services/NotificationService';

export interface InAppNotificationData {
  id: string;
  type: 'daily_release' | 'song_selected';
  title: string;
  subtitle?: string;
  body: string;
  dayNumber?: number;
  songTitle?: string;
  artist?: string;
  artworkUrl?: string;
}

export function M3NotificationBanner() {
  const insets = useSafeAreaInsets();
  const { colors, typography, shapes } = useTheme();
  const router = useRouter();

  const [notification, setNotification] = useState<InAppNotificationData | null>(null);
  const translateY = useSharedValue(-160);
  const opacity = useSharedValue(0);

  const dismiss = () => {
    translateY.value = withTiming(-160, { duration: 250 }, () => {
      runOnJS(setNotification)(null);
    });
    opacity.value = withTiming(0, { duration: 200 });
  };

  const showNotification = (data: InAppNotificationData) => {
    setNotification(data);
    translateY.value = withSpring(insets.top + 10, {
      damping: 15,
      stiffness: 120,
    });
    opacity.value = withTiming(1, { duration: 250 });

    // Auto-dismiss after 6.5 seconds
    setTimeout(() => {
      dismiss();
    }, 6500);
  };

  useEffect(() => {
    // Direct in-app subscription (handles local & system bridged events across all platforms & Expo Go)
    const unsubInApp = NotificationService.subscribeInApp((event) => {
      showNotification(event);
    });

    return () => {
      unsubInApp();
    };
  }, [insets.top]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!notification) return null;

  const isDailyDrop = notification.type === 'daily_release';
  const artwork =
    notification.artworkUrl ||
    'https://i.scdn.co/image/ab67616d0000b27341ad669e4bf67119e34e5672';

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.92}
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceContainerHigh || '#201F1D',
            borderColor: colors.outlineVariant || '#383531',
            borderRadius: shapes.extraLarge || 24,
          },
        ]}
        onPress={() => {
          dismiss();
          router.push('/(tabs)');
        }}
      >
        {/* Top Header Pill: Brand & Timestamp (Android 14/15 Material You Heads-Up Style) */}
        <View style={styles.headerRow}>
          <View style={styles.brandTag}>
            <Disc size={13} color={colors.primary} />
            <Text style={[styles.brandText, { color: colors.primary }]}>
              365 RITUAL
            </Text>
          </View>
          <View style={styles.dot} />
          <Text style={[styles.timeText, { color: colors.onSurfaceVariant }]}>
            7:00 PM IST • Today
          </Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={(e) => {
              e.stopPropagation();
              dismiss();
            }}
          >
            <X size={14} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Content Row: Track Artwork & Editorial Copy */}
        <View style={styles.contentRow}>
          <Image source={{ uri: artwork }} style={styles.artwork} />
          <View style={styles.textContainer}>
            <Text
              style={[
                styles.title,
                {
                  color: colors.onSurface,
                  fontFamily: typography.headlineSmall.fontFamilySerif || 'serif',
                },
              ]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text
              style={[
                styles.body,
                {
                  color: colors.onSurfaceVariant,
                  fontFamily: typography.bodySmall.fontFamilySans,
                },
              ]}
              numberOfLines={2}
            >
              {notification.body ||
                (isDailyDrop
                  ? 'Discover today’s shared track chosen for the entire community.'
                  : 'Your submitted song is now featured globally.')}
            </Text>
          </View>
        </View>

        {/* Action Button: Listen Now */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.listenBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              dismiss();
              router.push('/(tabs)');
            }}
          >
            <Play size={12} color={colors.onPrimary} fill={colors.onPrimary} />
            <Text style={[styles.listenBtnText, { color: colors.onPrimary }]}>
              Listen Now
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    zIndex: 9999,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  brandText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#777',
    marginHorizontal: 8,
  },
  timeText: {
    fontSize: 11,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  body: {
    fontSize: 12,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  listenBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
