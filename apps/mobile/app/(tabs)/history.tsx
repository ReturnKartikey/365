import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExternalLink, X, Calendar } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { SongDataService } from '../../src/services/SongDataService';
import { M3Button } from '../../src/components/M3Button';
import { DailySong } from '@365/core';

export default function HistoryScreen() {
  const { colors, typography, shapes } = useTheme();
  const [historyItems] = useState<DailySong[]>(SongDataService.getHistory());
  const [activeDetailSong, setActiveDetailSong] = useState<DailySong | null>(null);

  const handleListen = async (song: DailySong) => {
    const url =
      song.song.externalUrls.spotify ||
      song.song.externalUrls.web ||
      `https://open.spotify.com/track/${song.song.providerSongId}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen || Platform.OS === 'web') {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://open.spotify.com/search/${encodeURIComponent(song.song.title)}`);
      }
    } catch {
      Linking.openURL(`https://open.spotify.com/search/${encodeURIComponent(song.song.title)}`);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Archive Masthead */}
        <View style={styles.header}>
          <Text
            style={[
              styles.screenTitle,
              {
                color: colors.onBackground,
                fontFamily: typography.headlineMedium.fontFamilySerif,
              },
            ]}
          >
            History
          </Text>
        </View>

        {/* List of Days */}
        <FlatList
          data={historyItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const formattedDate = new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
            }).format(new Date(item.date));

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setActiveDetailSong(item)}
                style={[
                  styles.historyCard,
                  {
                    backgroundColor: colors.surfaceContainerLow,
                    borderRadius: shapes.large,
                  },
                ]}
              >
                <Image
                  source={{ uri: item.song.artworkUrl }}
                  style={[styles.artThumb, { borderRadius: shapes.medium }]}
                />

                <View style={styles.cardInfo}>
                  <View style={styles.dayBadgeRow}>
                    <Text
                      style={[
                        styles.dayBadge,
                        {
                          color: colors.primary,
                          fontFamily: typography.labelSmall.fontFamilySans,
                        },
                      ]}
                    >
                      DAY {item.dayNumber}
                    </Text>
                    <Text
                      style={[
                        styles.dateBadge,
                        {
                          color: colors.onSurfaceVariant,
                          fontFamily: typography.labelSmall.fontFamilySans,
                        },
                      ]}
                    >
                      • {formattedDate}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.songTitle,
                      {
                        color: colors.onSurface,
                        fontFamily: typography.titleMedium.fontFamilySans,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.song.title}
                  </Text>
                  <Text
                    style={[
                      styles.songArtist,
                      {
                        color: colors.onSurfaceVariant,
                        fontFamily: typography.bodyMedium.fontFamilySans,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.song.artist}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Song Detail Bottom Sheet Modal */}
      <Modal
        visible={activeDetailSong !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveDetailSong(null)}
      >
        <View style={styles.sheetOverlay}>
          <View
            style={[
              styles.sheetContent,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderTopLeftRadius: shapes.extraLarge,
                borderTopRightRadius: shapes.extraLarge,
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View style={[styles.dragHandle, { backgroundColor: colors.outlineVariant }]} />
              <TouchableOpacity
                onPress={() => setActiveDetailSong(null)}
                style={styles.closeSheetBtn}
              >
                <X size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {activeDetailSong && (
              <View style={styles.sheetBody}>
                <Image
                  source={{ uri: activeDetailSong.song.artworkUrl }}
                  style={[styles.sheetArtwork, { borderRadius: shapes.large }]}
                />

                <Text
                  style={[
                    styles.sheetDayTitle,
                    {
                      color: colors.primary,
                      fontFamily: typography.headlineSmall.fontFamilySerif,
                    },
                  ]}
                >
                  DAY {activeDetailSong.dayNumber}
                </Text>

                <Text
                  style={[
                    styles.sheetSongTitle,
                    {
                      color: colors.onSurface,
                      fontFamily: typography.headlineSmall.fontFamilySerif,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {activeDetailSong.song.title}
                </Text>

                <Text
                  style={[
                    styles.sheetSongArtist,
                    {
                      color: colors.onSurfaceVariant,
                      fontFamily: typography.titleMedium.fontFamilySans,
                    },
                  ]}
                >
                  {activeDetailSong.song.artist}
                </Text>

                <Text
                  style={[
                    styles.sheetAttribution,
                    {
                      color: colors.onSurfaceVariant,
                      fontFamily: typography.bodySmall.fontFamilySans,
                    },
                  ]}
                >
                  Submitted by @{activeDetailSong.submitterUsername}
                </Text>

                <View style={{ marginTop: 24, width: '100%' }}>
                  <M3Button
                    label="Listen on Spotify"
                    onPress={() => handleListen(activeDetailSong)}
                    icon={<ExternalLink size={20} color={colors.onPrimary} />}
                    size="large"
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  superLabel: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 28,
  },
  listContent: {
    paddingBottom: 32,
    gap: 12,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  artThumb: {
    width: 60,
    height: 60,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  dayBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dayBadge: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateBadge: {
    fontSize: 12,
  },
  songTitle: {
    fontSize: 16,
  },
  songArtist: {
    fontSize: 13,
    marginTop: 2,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 12,
    alignItems: 'center',
  },
  sheetHeader: {
    width: '100%',
    alignItems: 'center',
    position: 'relative',
    height: 28,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  closeSheetBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 4,
  },
  sheetBody: {
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
  },
  sheetArtwork: {
    width: 180,
    height: 180,
    marginBottom: 16,
  },
  sheetDayTitle: {
    fontSize: 20,
    marginBottom: 4,
  },
  sheetSongTitle: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 4,
  },
  sheetSongArtist: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  sheetAttribution: {
    fontSize: 13,
  },
});
