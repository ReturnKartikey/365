import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Settings, ExternalLink, Share2, Sparkles, Heart } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { useAuth } from '../../src/services/AuthContext';
import { SongDataService } from '../../src/services/SongDataService';
import { AlbumArtHero } from '../../src/components/AlbumArtHero';
import { M3Button } from '../../src/components/M3Button';
import { HookPlayButton } from '../../src/components/HookPlayButton';
import { DailySong } from '@365/core';

export default function TodayScreen() {
  const { colors, typography, setSeedColor } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [todayData, setTodayData] = useState<DailySong>(SongDataService.getTodaySong());
  const [isNewRelease, setIsNewRelease] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const song = SongDataService.getTodaySong();
    setTodayData(song);
    // Dynamically update Material You theme palette using dominant album art color
    if (song?.song?.metadata?.palette?.dominant) {
      setSeedColor(song.song.metadata.palette.dominant);
    }
  }, [setSeedColor]);

  const handleListen = async () => {
    const url =
      todayData.song.externalUrls.spotify ||
      todayData.song.externalUrls.web ||
      `https://open.spotify.com/track/${todayData.song.providerSongId}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen || Platform.OS === 'web') {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://open.spotify.com/search/${encodeURIComponent(todayData.song.title)}`);
      }
    } catch (e) {
      console.warn('Could not open Spotify URL, falling back to web search:', e);
      Linking.openURL(`https://open.spotify.com/search/${encodeURIComponent(todayData.song.title)}`);
    }
  };

  const isUserSubmitter = user && user.username === todayData.submitterUsername;

  // Format date: e.g. "30 September"
  const dateObj = new Date(todayData.date);
  const day = dateObj.getDate();
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(dateObj);
  const monthDayDate = `${day} ${monthName}`;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Submitter Celebration Card if today's song was submitted by current user */}
        {isUserSubmitter && (
          <View
            style={[
              styles.celebrationCard,
              {
                backgroundColor: colors.primaryContainer,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <View style={styles.celebrationRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.celebrationTitle,
                    {
                      color: colors.onPrimaryContainer,
                      fontFamily: typography.titleMedium.fontFamilySans,
                    },
                  ]}
                >
                  🎉 Your song is today's 365!
                </Text>
                <Text
                  style={[
                    styles.celebrationSubtitle,
                    {
                      color: colors.onPrimaryContainer,
                      fontFamily: typography.bodySmall.fontFamilySans,
                    },
                  ]}
                >
                  Selected from community submissions for Day {todayData.dayNumber}.
                </Text>
              </View>
              <M3Button
                label="Share Card"
                onPress={() => router.push(`/share/${todayData.dayNumber}`)}
                variant="filled"
                icon={<Share2 size={16} color={colors.onPrimary} />}
              />
            </View>
          </View>
        )}

        {/* Editorial Date Display with Settings Icon */}
        <View style={styles.metaSection}>
          <Text
            style={[
              styles.dayNumberDisplay,
              {
                color: colors.primary,
                fontFamily: typography.displayMedium.fontFamilySerif,
              },
            ]}
          >
            {monthDayDate}
          </Text>

          <TouchableOpacity
            onPress={() => router.push('/settings')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[styles.iconButton, { backgroundColor: colors.surfaceContainerHigh }]}
          >
            <Settings size={18} color={colors.onSurface} />
          </TouchableOpacity>
        </View>

        {/* Hero Album Artwork with Reveal Animation and Double-Tap Like */}
        <AlbumArtHero
          artworkUrl={todayData.song.artworkUrl}
          isNewRelease={isNewRelease}
          onLike={() => setIsLiked(true)}
        />

        {/* Song & Artist Information */}
        <View style={styles.songInfoSection}>
          <Text
            style={[
              styles.songTitle,
              {
                color: colors.onBackground,
                fontFamily: typography.headlineLarge.fontFamilySerif,
              },
            ]}
            numberOfLines={2}
          >
            {todayData.song.title}
          </Text>

          <Text
            style={[
              styles.songArtist,
              {
                color: colors.onSurfaceVariant,
                fontFamily: typography.titleLarge.fontFamilySans,
              },
            ]}
            numberOfLines={1}
          >
            {todayData.song.artist}
          </Text>

          {/* Submitter Attribution */}
          <View style={styles.attributionRow}>
            <Text
              style={[
                styles.attributionText,
                {
                  color: colors.onSurfaceVariant,
                  fontFamily: typography.bodyMedium.fontFamilySans,
                },
              ]}
            >
              Submitted by{' '}
              <Text
                style={{
                  color: colors.onSurface,
                  fontFamily: typography.titleSmall.fontFamilySans,
                  fontWeight: '600',
                }}
              >
                @{todayData.submitterUsername}
              </Text>
            </Text>
            {isLiked && (
              <View style={styles.likedBadge}>
                <Heart size={14} color="#FF3B30" fill="#FF3B30" />
              </View>
            )}
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.actionControlsSection}>
          {/* Instagram-style Hook Play Button */}
          <HookPlayButton
            song={todayData.song}
            durationSeconds={15}
            style={styles.hookPlayButton}
          />

          <M3Button
            label="Listen on Spotify"
            onPress={handleListen}
            size="large"
            icon={<ExternalLink size={20} color={colors.onPrimary} />}
            style={styles.primaryListenButton}
          />

          <M3Button
            label="Submit a song"
            onPress={() => router.push('/(tabs)/submit')}
            variant="tonal"
            style={styles.secondarySubmitButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 4,
  },
  celebrationCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    marginTop: 4,
  },
  celebrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  celebrationTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  celebrationSubtitle: {
    fontSize: 12,
    opacity: 0.85,
  },
  metaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 2,
  },
  dayNumberDisplay: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  dateDisplay: {
    fontSize: 13,
    letterSpacing: 0.2,
    marginTop: 1,
  },
  songInfoSection: {
    marginVertical: 10,
  },
  songTitle: {
    fontSize: 26,
    lineHeight: 32,
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 6,
  },
  attributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  likedBadge: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attributionText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  actionControlsSection: {
    marginTop: 14,
    gap: 10,
  },
  hookPlayButton: {
    width: '100%',
  },
  primaryListenButton: {
    width: '100%',
  },
  secondarySubmitButton: {
    width: '100%',
  },
});
