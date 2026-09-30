import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Share,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, Share2 } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { SongDataService } from '../../src/services/SongDataService';
import { M3Button } from '../../src/components/M3Button';

export default function ShareCardScreen() {
  const { dayNumber } = useLocalSearchParams<{ dayNumber: string }>();
  const { colors, typography, shapes } = useTheme();
  const router = useRouter();

  const num = parseInt(dayNumber || '47', 10);
  const songData = SongDataService.getDaySong(num) || SongDataService.getTodaySong();

  const handleShare = async () => {
    try {
      const shareUrl =
        songData.song.externalUrls.spotify ||
        songData.song.externalUrls.web ||
        `https://open.spotify.com/track/${songData.song.providerSongId}`;

      const message = `365 • DAY ${songData.dayNumber}
TODAY'S SONG: ${songData.song.title} — ${songData.song.artist}
Submitted by @${songData.submitterUsername}

One song. Every day. Listen here: ${shareUrl}`;

      await Share.share({
        message,
        url: Platform.OS === 'ios' ? shareUrl : undefined,
        title: `365 DAY ${songData.dayNumber} — ${songData.song.title}`,
      });
    } catch (e) {
      console.error('Error sharing card:', e);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Bar with Close Button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeButton, { backgroundColor: colors.surfaceContainerHigh }]}
        >
          <X size={20} color={colors.onSurface} />
        </TouchableOpacity>
        <Text
          style={[
            styles.screenHeader,
            {
              color: colors.onSurface,
              fontFamily: typography.labelLarge.fontFamilySans,
            },
          ]}
        >
          Share Ritual Card
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.container}>
        {/* The Magazine Editorial Share Card */}
        <View
          style={[
            styles.cardContainer,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.outlineVariant,
              borderRadius: shapes.extraLarge,
            },
          ]}
        >
          {/* Masthead */}
          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.brandLogo,
                {
                  color: colors.primary,
                  fontFamily: typography.displaySmall.fontFamilySerif,
                },
              ]}
            >
              365
            </Text>
            <View style={styles.headerRight}>
              <Text
                style={[
                  styles.dayLabel,
                  {
                    color: colors.onSurface,
                    fontFamily: typography.headlineSmall.fontFamilySerif,
                  },
                ]}
              >
                DAY {songData.dayNumber}
              </Text>
              <Text
                style={[
                  styles.subLabel,
                  {
                    color: colors.primary,
                    fontFamily: typography.labelSmall.fontFamilySans,
                  },
                ]}
              >
                TODAY'S SONG
              </Text>
            </View>
          </View>

          {/* Artwork */}
          <View style={styles.artFrame}>
            <Image
              source={{ uri: songData.song.artworkUrl }}
              style={[styles.albumArt, { borderRadius: shapes.large }]}
              resizeMode="cover"
            />
          </View>

          {/* Typography Details */}
          <View style={styles.cardBody}>
            <Text
              style={[
                styles.songTitle,
                {
                  color: colors.onSurface,
                  fontFamily: typography.headlineMedium.fontFamilySerif,
                },
              ]}
              numberOfLines={2}
            >
              {songData.song.title}
            </Text>
            <Text
              style={[
                styles.songArtist,
                {
                  color: colors.onSurfaceVariant,
                  fontFamily: typography.titleMedium.fontFamilySans,
                },
              ]}
              numberOfLines={1}
            >
              {songData.song.artist}
            </Text>

            {/* Submitter Credit */}
            <View style={styles.creditRow}>
              <Text
                style={[
                  styles.creditText,
                  {
                    color: colors.onSurfaceVariant,
                    fontFamily: typography.bodyMedium.fontFamilySans,
                  },
                ]}
              >
                Submitted by{' '}
                <Text
                  style={{
                    color: colors.primary,
                    fontFamily: typography.titleSmall.fontFamilySans,
                    fontWeight: '700',
                  }}
                >
                  @{songData.submitterUsername}
                </Text>
              </Text>
            </View>
          </View>

          {/* Card Footer Tagline */}
          <View
            style={[
              styles.cardFooter,
              {
                borderTopColor: colors.outlineVariant,
              },
            ]}
          >
            <Text
              style={[
                styles.footerTagline,
                {
                  color: colors.onSurfaceVariant,
                  fontFamily: typography.labelMedium.fontFamilySans,
                },
              ]}
            >
              One song. Every day.
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionWrap}>
          <M3Button
            label="Share with Friends"
            onPress={handleShare}
            size="large"
            icon={<Share2 size={20} color={colors.onPrimary} />}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenHeader: {
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  cardContainer: {
    padding: 24,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  brandLogo: {
    fontSize: 32,
    letterSpacing: -1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  dayLabel: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  subLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginTop: 2,
  },
  artFrame: {
    alignItems: 'center',
    marginVertical: 8,
  },
  albumArt: {
    width: '100%',
    aspectRatio: 1,
  },
  cardBody: {
    marginTop: 18,
    marginBottom: 12,
  },
  songTitle: {
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 16,
    marginBottom: 8,
  },
  creditRow: {
    marginTop: 6,
  },
  creditText: {
    fontSize: 14,
  },
  cardFooter: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 8,
    alignItems: 'center',
  },
  footerTagline: {
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  actionWrap: {
    marginTop: 24,
  },
});
