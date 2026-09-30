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
import { Settings, ExternalLink, Share2, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { useAuth } from '../../src/services/AuthContext';
import { SongDataService } from '../../src/services/SongDataService';
import { AlbumArtHero } from '../../src/components/AlbumArtHero';
import { M3Button } from '../../src/components/M3Button';
import { DailySong } from '@365/core';

export default function TodayScreen() {
  const { colors, typography, setSeedColor } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [todayData, setTodayData] = useState<DailySong>(SongDataService.getTodaySong());
  const [isNewRelease, setIsNewRelease] = useState(true);

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

  // Format date: e.g. "Wednesday, September 30"
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(todayData.date));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Editorial Header */}
      <View style={styles.headerBar}>
        <View>
          <Text
            style={[
              styles.headerBrand,
              {
                color: colors.onBackground,
                fontFamily: typography.headlineSmall.fontFamilySerif,
              },
            ]}
          >
            365
          </Text>
          <Text
            style={[
              styles.headerTagline,
              {
                color: colors.onSurfaceVariant,
                fontFamily: typography.labelSmall.fontFamilySans,
              },
            ]}
          >
            One song. Every day.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/settings')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[styles.iconButton, { backgroundColor: colors.surfaceContainerHigh }]}
        >
          <Settings size={20} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

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

        {/* Editorial Date and Day Display */}
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
            DAY {todayData.dayNumber}
          </Text>
          <Text
            style={[
              styles.dateDisplay,
              {
                color: colors.onSurfaceVariant,
                fontFamily: typography.bodyMedium.fontFamilySans,
              },
            ]}
          >
            {formattedDate}
          </Text>
        </View>

        {/* Hero Album Artwork with Reveal Animation */}
        <AlbumArtHero
          artworkUrl={todayData.song.artworkUrl}
          isNewRelease={isNewRelease}
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
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.actionControlsSection}>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerBrand: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  headerTagline: {
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  celebrationCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    marginTop: 8,
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
    marginTop: 12,
    marginBottom: 4,
  },
  dayNumberDisplay: {
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  dateDisplay: {
    fontSize: 14,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  songInfoSection: {
    marginVertical: 14,
  },
  songTitle: {
    fontSize: 30,
    lineHeight: 38,
    marginBottom: 6,
  },
  songArtist: {
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 10,
  },
  attributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  attributionText: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
  actionControlsSection: {
    marginTop: 20,
    gap: 12,
  },
  primaryListenButton: {
    width: '100%',
  },
  secondarySubmitButton: {
    width: '100%',
  },
});
