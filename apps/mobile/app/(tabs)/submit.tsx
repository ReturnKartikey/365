import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, AlertCircle, Music, Clock, Play, Pause, ExternalLink, Sparkles, X } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { useAuth } from '../../src/services/AuthContext';
import { SongDataService } from '../../src/services/SongDataService';
import { M3SearchBar } from '../../src/components/M3SearchBar';
import { M3Button } from '../../src/components/M3Button';
import { GlobalAudioService } from '../../src/services/AudioService';
import type { Song, Submission } from '@365/core';

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
      SongDataService.getUserSubmission(user.id).then((active) => {
        setUserActiveSubmission(active);
      });
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

  // Curated 25 songs to explore and listen immediately
  const featuredSongs = SongDataService.getFeaturedCatalog();

  // Hook audio playback state
  const [hookPlayingId, setHookPlayingId] = useState<string | null>(null);
  const [hookStatus, setHookStatus] = useState<'idle' | 'playing' | 'paused' | 'completed'>('idle');
  const hookTimerRef = useRef<any>(null);

  const stopSongHook = async () => {
    if (hookTimerRef.current) {
      clearTimeout(hookTimerRef.current);
      hookTimerRef.current = null;
    }
    await GlobalAudioService.stop();
    setHookPlayingId(null);
    setHookStatus('idle');
  };

  useEffect(() => {
    return () => {
      stopSongHook();
    };
  }, []);

  const playSongHook = async (song: Song) => {
    await stopSongHook();
    setHookPlayingId(song.id);
    setHookStatus('playing');

    const durationSeconds = 30;
    const previewUrl = song.metadata?.previewUrl || (song as any).previewUrl;

    if (previewUrl) {
      const ok = await GlobalAudioService.playPreview(previewUrl, (status) => {
        if (status.didJustFinish) {
          setHookStatus('completed');
          setHookPlayingId(null);
        }
      });
      if (!ok) {
        setHookStatus('idle');
        setHookPlayingId(null);
      }
    } else {
      setHookStatus('idle');
      setHookPlayingId(null);
    }

    hookTimerRef.current = setTimeout(async () => {
      await stopSongHook();
      setHookStatus('completed');
    }, durationSeconds * 1000);
  };

  const handleTogglePlay = async (song: Song, e?: any) => {
    e?.stopPropagation?.();
    if (hookPlayingId === song.id && hookStatus === 'playing') {
      await GlobalAudioService.pause();
      setHookStatus('paused');
    } else if (hookPlayingId === song.id && hookStatus === 'paused') {
      const previewUrl = song.metadata?.previewUrl || (song as any).previewUrl;
      if (previewUrl) {
        const ok = await GlobalAudioService.playPreview(previewUrl, (status) => {
          if (status.didJustFinish) {
            setHookStatus('completed');
            setHookPlayingId(null);
          }
        });
        if (ok) setHookStatus('playing');
      }
    } else {
      await playSongHook(song);
    }
  };

  const handleOpenSpotify = (song: Song, e?: any) => {
    e?.stopPropagation?.();
    const url =
      song.externalUrls?.spotify ||
      song.externalUrls?.web ||
      (song.providerSongId ? `https://open.spotify.com/track/${song.providerSongId}` : null) ||
      `https://open.spotify.com/search/${encodeURIComponent(song.title + ' ' + song.artist)}`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
      return;
    }

    try {
      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://open.spotify.com/search/${encodeURIComponent(song.title + ' ' + song.artist)}`);
      });
    } catch {
      Linking.openURL(`https://open.spotify.com/search/${encodeURIComponent(song.title + ' ' + song.artist)}`);
    }
  };

  const handleSelectSong = async (song: Song) => {
    if (selectedSong?.id === song.id) {
      // Toggle play / pause when already selected
      await handleTogglePlay(song);
    } else {
      setSelectedSong(song);
      await playSongHook(song);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionNote, setSubmissionNote] = useState('');

  useEffect(() => {
    if (user?.id && !user.isGuest) {
      SongDataService.getUserSubmission(user.id).then((sub) => {
        if (sub) {
          setUserActiveSubmission(sub);
        }
      });
    }
  }, [user?.id, user?.isGuest]);

  const handleConfirmSubmission = async () => {
    if (!selectedSong) return;

    // Check Guest requirement
    if (!user || user.isGuest) {
      setShowGuestPrompt(true);
      return;
    }

    try {
      setIsSubmitting(true);
      stopSongHook();

      // Submit via SongDataService (calls Supabase RPC submit_song when online)
      const result = await SongDataService.submitSong(
        selectedSong,
        user,
        submissionNote.trim() || undefined
      );

      if (result.success && result.submission) {
        setUserActiveSubmission(result.submission);
        setSelectedSong(null);
        setSubmissionNote('');
        setSearchQuery('');
        setSearchResults([]);
        setStatusMessage({
          type: 'success',
          title: 'In the 365 queue',
          description:
            'Your submission is now in the 365 listening pool. Songs are selected daily for the entire community.',
        });
      } else {
        const isAlreadySubmitted =
          result.errorCode === 'ACTIVE_SUBMISSION_EXISTS' ||
          result.error?.includes('active submission') ||
          result.error?.includes('365 queue');

        setStatusMessage({
          type: 'error',
          title: isAlreadySubmitted ? 'Please Wait' : 'Submission Unavailable',
          description: isAlreadySubmitted
            ? 'You already have an active submission in the 365 queue. You can submit a new song tomorrow.'
            : (result.error || 'Unable to submit this song.'),
        });
      }
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        title: 'Error',
        description: e?.message || 'Failed to submit song.',
      });
    } finally {
      setIsSubmitting(false);
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

  const renderSongRow = (item: Song) => {
    const isSelected = selectedSong?.id === item.id;
    const isPlaying = hookPlayingId === item.id && hookStatus === 'playing';

    return (
      <TouchableOpacity
        key={item.id}
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
            borderWidth: isSelected ? 1.5 : 0,
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

        <View style={styles.actionButtonsRow}>
          {/* Audio preview play/pause */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => handleTogglePlay(item, e)}
            style={[
              styles.iconButton,
              {
                backgroundColor: isPlaying
                  ? colors.primary
                  : colors.surfaceContainerHigh,
                borderRadius: shapes.full,
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isPlaying ? (
              <Pause size={15} color={colors.onPrimary} fill={colors.onPrimary} />
            ) : (
              <Play
                size={15}
                color={colors.onSurface}
                fill={colors.onSurface}
                style={{ marginLeft: 2 }}
              />
            )}
          </TouchableOpacity>

          {/* Direct Spotify link */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => handleOpenSpotify(item, e)}
            style={[
              styles.iconButton,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderRadius: shapes.full,
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ExternalLink size={14} color={colors.primary} />
          </TouchableOpacity>

          {/* Selected indicator */}
          {isSelected && (
            <View
              style={[
                styles.selectedCheck,
                { backgroundColor: colors.primary, borderRadius: shapes.full },
              ]}
            >
              <Check size={13} color={colors.onPrimary} strokeWidth={3} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
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

        {/* Search Results / Featured Catalog List */}
        {isSearching ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.resultsList,
              selectedSong ? { paddingBottom: 220 } : null,
            ]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => renderSongRow(item)}
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
          <View style={{ flex: 1, marginTop: 10 }}>
            <View style={styles.featuredHeader}>
              <Sparkles size={16} color={colors.primary} />
              <Text
                style={[
                  styles.featuredHeaderText,
                  {
                    color: colors.primary,
                    fontFamily: typography.labelLarge.fontFamilySans,
                  },
                ]}
              >
                Featured Library ({featuredSongs.length} Songs)
              </Text>
            </View>
            <FlatList
              data={featuredSongs}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.resultsList,
                selectedSong ? { paddingBottom: 220 } : null,
              ]}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => renderSongRow(item)}
            />
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
            <View style={styles.confirmContent}>
              <View style={styles.footerTrackMeta}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, marginRight: 10 }}>
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
                      Selected: "{selectedSong.title}"
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

                  {/* Close / Deselect */}
                  <TouchableOpacity
                    onPress={() => setSelectedSong(null)}
                    style={styles.closeDeselectButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={18} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>

                {/* Listen on Spotify Quick Pill */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={(e) => handleOpenSpotify(selectedSong, e)}
                  style={[
                    styles.spotifyPill,
                    {
                      backgroundColor: colors.surfaceContainerLow,
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                >
                  <ExternalLink size={13} color={colors.primary} />
                  <Text
                    style={[
                      styles.spotifyPillText,
                      {
                        color: colors.primary,
                        fontFamily: typography.labelMedium.fontFamilySans,
                      },
                    ]}
                  >
                    Listen on Spotify
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                value={submissionNote}
                onChangeText={setSubmissionNote}
                placeholder="Why this song? Add a note (optional)..."
                placeholderTextColor={colors.onSurfaceVariant + '88'}
                maxLength={140}
                style={[
                  styles.noteInput,
                  {
                    color: colors.onSurface,
                    backgroundColor: colors.surfaceContainer,
                    borderRadius: shapes.small,
                    fontFamily: typography.bodySmall.fontFamilySans,
                  },
                ]}
              />

              <M3Button
                label="Confirm Submission"
                onPress={handleConfirmSubmission}
                variant="filled"
                loading={isSubmitting}
              />
            </View>
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
    paddingBottom: 12,
    minHeight: 58,
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
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
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheck: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  featuredHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  closeDeselectButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotifyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  spotifyPillText: {
    fontSize: 12,
    fontWeight: '600',
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  confirmContent: {
    width: '100%',
    gap: 10,
  },
  noteInput: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  footerTrackMeta: {
    width: '100%',
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
