import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, AlertCircle, Music, Clock } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { useAuth } from '../../src/services/AuthContext';
import { SongDataService } from '../../src/services/SongDataService';
import { M3SearchBar } from '../../src/components/M3SearchBar';
import { M3Button } from '../../src/components/M3Button';
import { Song, Submission } from '@365/core';

export default function SubmitScreen() {
  const { colors, typography, shapes } = useTheme();
  const { user, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  // Status alerts & modals
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    title: string;
    description: string;
  } | null>(null);

  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [userActiveSubmission, setUserActiveSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    if (user) {
      const active = SongDataService.getUserSubmission(user.id);
      setUserActiveSubmission(active);
    }
  }, [user, statusMessage]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await SongDataService.searchCatalog(searchQuery);
        setSearchResults(results);
      } catch (e) {
        console.error('Search catalog error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
  };

  const handleConfirmSubmission = () => {
    if (!selectedSong) return;

    // Check Guest requirement
    if (!user || user.isGuest) {
      setShowGuestPrompt(true);
      return;
    }

    // Submit via SongDataService
    const result = SongDataService.submitSong(selectedSong, user);

    if (result.success && result.submission) {
      setUserActiveSubmission(result.submission);
      setSelectedSong(null);
      setSearchQuery('');
      setSearchResults([]);
      setStatusMessage({
        type: 'success',
        title: 'In the 365 queue',
        description:
          'Your submission is now in the 365 listening pool. Songs are selected daily for the entire community.',
      });
    } else {
      setStatusMessage({
        type: 'error',
        title: 'Submission Unavailable',
        description: result.error || 'Unable to submit this song.',
      });
    }
  };

  const handleGuestUpgrade = async () => {
    try {
      await signInWithGoogle();
      setShowGuestPrompt(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Header */}
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
            Submit a Song
          </Text>
          <Text
            style={[
              styles.screenSubtitle,
              {
                color: colors.onSurfaceVariant,
                fontFamily: typography.bodyMedium.fontFamilySans,
              },
            ]}
          >
            Share one song you want the world to hear.
          </Text>
        </View>

        {/* Existing Active Submission Banner */}
        {userActiveSubmission && (
          <View
            style={[
              styles.activeQueueBanner,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.outlineVariant,
                borderRadius: shapes.large,
              },
            ]}
          >
            <View style={styles.bannerRow}>
              <Image
                source={{ uri: userActiveSubmission.song.artworkUrl }}
                style={[styles.smallArtwork, { borderRadius: shapes.medium }]}
              />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={styles.statusPill}>
                  <Clock size={12} color={colors.primary} />
                  <Text
                    style={[
                      styles.statusPillText,
                      {
                        color: colors.primary,
                        fontFamily: typography.labelSmall.fontFamilySans,
                      },
                    ]}
                  >
                    In the 365 queue
                  </Text>
                </View>
                <Text
                  style={[
                    styles.activeTitle,
                    {
                      color: colors.onSurface,
                      fontFamily: typography.titleSmall.fontFamilySans,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {userActiveSubmission.song.title}
                </Text>
                <Text
                  style={[
                    styles.activeArtist,
                    {
                      color: colors.onSurfaceVariant,
                      fontFamily: typography.bodySmall.fontFamilySans,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {userActiveSubmission.song.artist}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Search Bar */}
        <M3SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search song or artist..."
        />

        {/* Search Results List */}
        {isSearching ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.resultsList}
            renderItem={({ item }) => {
              const isSelected = selectedSong?.id === item.id;
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSelectSong(item)}
                  style={[
                    styles.resultItem,
                    {
                      backgroundColor: isSelected
                        ? colors.secondaryContainer
                        : colors.surfaceContainerLow,
                      borderRadius: shapes.large,
                      borderColor: isSelected ? colors.primary : 'transparent',
                      borderWidth: isSelected ? 1 : 0,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: item.artworkUrl }}
                    style={[styles.resultArtwork, { borderRadius: shapes.medium }]}
                  />
                  <View style={styles.resultDetails}>
                    <Text
                      style={[
                        styles.trackTitle,
                        {
                          color: isSelected ? colors.onSecondaryContainer : colors.onSurface,
                          fontFamily: typography.titleMedium.fontFamilySans,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.trackArtist,
                        {
                          color: isSelected ? colors.onSecondaryContainer : colors.onSurfaceVariant,
                          fontFamily: typography.bodyMedium.fontFamilySans,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.artist}
                    </Text>
                  </View>
                  {isSelected && (
                    <View
                      style={[
                        styles.checkBadge,
                        { backgroundColor: colors.primary, borderRadius: shapes.full },
                      ]}
                    >
                      <Check size={16} color={colors.onPrimary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        ) : searchQuery.length > 0 ? (
          <View style={styles.centerState}>
            <Text
              style={[
                styles.emptyText,
                {
                  color: colors.onSurfaceVariant,
                  fontFamily: typography.bodyMedium.fontFamilySans,
                },
              ]}
            >
              No songs found matching "{searchQuery}"
            </Text>
          </View>
        ) : (
          <View style={styles.emptyPromptState}>
            <Music size={36} color={colors.outlineVariant} />
            <Text
              style={[
                styles.emptyPromptText,
                {
                  color: colors.onSurfaceVariant,
                  fontFamily: typography.bodyMedium.fontFamilySans,
                },
              ]}
            >
              Type a track or artist name to explore the catalog and submit.
            </Text>
          </View>
        )}

        {/* Selected Song Confirm Bar */}
        {selectedSong && (
          <View
            style={[
              styles.confirmFooter,
              {
                backgroundColor: colors.surfaceContainerHighest,
                borderTopColor: colors.outlineVariant,
              },
            ]}
          >
            <View style={styles.footerTrackMeta}>
              <Text
                style={[
                  styles.confirmingTitle,
                  {
                    color: colors.onSurface,
                    fontFamily: typography.titleSmall.fontFamilySans,
                  },
                ]}
                numberOfLines={1}
              >
                Submit "{selectedSong.title}"
              </Text>
              <Text
                style={[
                  styles.confirmingArtist,
                  {
                    color: colors.onSurfaceVariant,
                    fontFamily: typography.bodySmall.fontFamilySans,
                  },
                ]}
                numberOfLines={1}
              >
                by {selectedSong.artist}
              </Text>
            </View>

            <M3Button
              label="Confirm Submission"
              onPress={handleConfirmSubmission}
              variant="filled"
            />
          </View>
        )}
      </View>

      {/* Guest Mode Gate Modal */}
      <Modal
        visible={showGuestPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGuestPrompt(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalDialog,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderRadius: shapes.extraLarge,
              },
            ]}
          >
            <AlertCircle size={32} color={colors.primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text
              style={[
                styles.modalHeading,
                {
                  color: colors.onSurface,
                  fontFamily: typography.headlineSmall.fontFamilySerif,
                },
              ]}
            >
              Sign In Required
            </Text>
            <Text
              style={[
                styles.modalBody,
                {
                  color: colors.onSurfaceVariant,
                  fontFamily: typography.bodyMedium.fontFamilySans,
                },
              ]}
            >
              Sign in with Google to submit a song. This maintains queue integrity and community ritual quality.
            </Text>

            <View style={{ marginTop: 24, gap: 10 }}>
              <M3Button
                label="Sign in with Google"
                onPress={handleGuestUpgrade}
                variant="filled"
              />
              <M3Button
                label="Cancel"
                onPress={() => setShowGuestPrompt(false)}
                variant="text"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Alert Modal (Success / Duplicate / Exists) */}
      <Modal
        visible={statusMessage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusMessage(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalDialog,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderRadius: shapes.extraLarge,
              },
            ]}
          >
            <Text
              style={[
                styles.modalHeading,
                {
                  color: statusMessage?.type === 'success' ? colors.primary : colors.onSurface,
                  fontFamily: typography.headlineSmall.fontFamilySerif,
                },
              ]}
            >
              {statusMessage?.title}
            </Text>
            <Text
              style={[
                styles.modalBody,
                {
                  color: colors.onSurfaceVariant,
                  fontFamily: typography.bodyMedium.fontFamilySans,
                },
              ]}
            >
              {statusMessage?.description}
            </Text>

            <View style={{ marginTop: 24 }}>
              <M3Button
                label="Done"
                onPress={() => setStatusMessage(null)}
                variant="filled"
              />
            </View>
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
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 28,
  },
  screenSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  activeQueueBanner: {
    padding: 14,
    borderWidth: 1,
    marginVertical: 10,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallArtwork: {
    width: 52,
    height: 52,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  activeArtist: {
    fontSize: 13,
  },
  resultsList: {
    paddingBottom: 110,
    paddingTop: 4,
    gap: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  resultArtwork: {
    width: 56,
    height: 56,
  },
  resultDetails: {
    flex: 1,
    marginLeft: 14,
  },
  trackTitle: {
    fontSize: 16,
  },
  trackArtist: {
    fontSize: 13,
    marginTop: 2,
  },
  checkBadge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyPromptState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyPromptText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerTrackMeta: {
    flex: 1,
    marginRight: 12,
  },
  confirmingTitle: {
    fontSize: 15,
  },
  confirmingArtist: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modalDialog: {
    width: '100%',
    padding: 24,
  },
  modalHeading: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
