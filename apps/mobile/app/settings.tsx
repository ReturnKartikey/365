import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Moon, Bell, Shield, LogOut, Flag } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { useAuth } from '../src/services/AuthContext';
import { SongDataService } from '../src/services/SongDataService';
import { M3Button } from '../src/components/M3Button';
import { M3Switch } from '../src/components/M3Switch';
import { M3Toast } from '../src/components/M3Toast';

export default function SettingsScreen() {
  const { colors, typography, shapes, mode, setMode, isDark } = useTheme();
  const { user, signOut, updateNotificationPrefs } = useAuth();
  const router = useRouter();

  // Explicit policy modal
  const [showPolicy, setShowPolicy] = useState(false);
  // Report modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportTarget, setReportTarget] = useState<'song' | 'user'>('song');

  // Acknowledgment toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleToggleDailyNotification = (val: boolean) => {
    updateNotificationPrefs({ dailyRelease: val });
  };

  const handleToggleSongNotification = (val: boolean) => {
    updateNotificationPrefs({ songSelected: val });
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/welcome');
  };

  const handleSendReport = async () => {
    if (!reportReason.trim()) return;

    await SongDataService.reportContent({
      reporterId: user?.id || 'anonymous',
      targetType: reportTarget,
      targetId: 'current_daily_song',
      reason: reportReason.trim(),
    });

    setReportReason('');
    setShowReportModal(false);
    setToastMessage('Report submitted. Thank you for keeping 365 safe.');
    setShowToast(true);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <Text
          style={[
            styles.title,
            {
              color: colors.onBackground,
              fontFamily: typography.headlineSmall.fontFamilySerif,
            },
          ]}
        >
          Settings
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: colors.surfaceContainerHigh }]}
        >
          <X size={20} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View
          style={[
            styles.userSection,
            {
              backgroundColor: colors.surfaceContainerLow,
              borderRadius: shapes.large,
            },
          ]}
        >
          <Text
            style={[
              styles.userDisplayName,
              {
                color: colors.onSurface,
                fontFamily: typography.titleMedium.fontFamilySans,
              },
            ]}
          >
            {user?.displayName || 'Guest Listener'}
          </Text>
          <Text
            style={[
              styles.userHandle,
              {
                color: colors.primary,
                fontFamily: typography.bodyMedium.fontFamilySans,
              },
            ]}
          >
            @{user?.username || 'guest'}
          </Text>
          {user?.isGuest && (
            <Text
              style={[
                styles.guestNote,
                {
                  color: colors.onSurfaceVariant,
                  fontFamily: typography.bodySmall.fontFamilySans,
                },
              ]}
            >
              Sign in with Google on the Submit tab to add songs to the community queue.
            </Text>
          )}
        </View>

        {/* Appearance Section */}
        <View style={styles.sectionBlock}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.primary,
                fontFamily: typography.labelLarge.fontFamilySans,
              },
            ]}
          >
            APPEARANCE
          </Text>

          <View
            style={[
              styles.settingRow,
              {
                backgroundColor: colors.surfaceContainerLow,
                borderRadius: shapes.medium,
              },
            ]}
          >
            <View style={styles.settingLabelWrap}>
              <View style={styles.settingIconContainer}>
                <Moon size={18} color={colors.onSurfaceVariant} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.settingMainText,
                    {
                      color: colors.onSurface,
                      fontFamily: typography.bodyLarge.fontFamilySans,
                    },
                  ]}
                >
                  Dark Theme
                </Text>
                <Text
                  style={[
                    styles.settingSubText,
                    {
                      color: colors.onSurfaceVariant,
                      fontFamily: typography.bodySmall.fontFamilySans,
                    },
                  ]}
                >
                  Derived from album artwork palette
                </Text>
              </View>
            </View>

            <M3Switch
              value={isDark}
              onValueChange={(val) => setMode(val ? 'dark' : 'light')}
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.sectionBlock}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.primary,
                fontFamily: typography.labelLarge.fontFamilySans,
              },
            ]}
          >
            NOTIFICATIONS
          </Text>

          <View
            style={[
              styles.settingRow,
              {
                backgroundColor: colors.surfaceContainerLow,
                borderRadius: shapes.medium,
                marginBottom: 8,
              },
            ]}
          >
            <View style={styles.settingLabelWrap}>
              <View style={styles.settingIconContainer}>
                <Bell size={18} color={colors.onSurfaceVariant} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.settingMainText,
                    {
                      color: colors.onSurface,
                      fontFamily: typography.bodyLarge.fontFamilySans,
                    },
                  ]}
                >
                  Daily Release
                </Text>
                <Text
                  style={[
                    styles.settingSubText,
                    {
                      color: colors.onSurfaceVariant,
                      fontFamily: typography.bodySmall.fontFamilySans,
                    },
                  ]}
                >
                  🎧 Today's 365 is here. (7:00 PM IST)
                </Text>
              </View>
            </View>

            <M3Switch
              value={user?.notificationPrefs?.dailyRelease ?? true}
              onValueChange={handleToggleDailyNotification}
            />
          </View>

          <View
            style={[
              styles.settingRow,
              {
                backgroundColor: colors.surfaceContainerLow,
                borderRadius: shapes.medium,
              },
            ]}
          >
            <View style={styles.settingLabelWrap}>
              <View style={styles.settingIconContainer}>
                <Bell size={18} color={colors.onSurfaceVariant} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.settingMainText,
                    {
                      color: colors.onSurface,
                      fontFamily: typography.bodyLarge.fontFamilySans,
                    },
                  ]}
                >
                  Song Selection
                </Text>
                <Text
                  style={[
                    styles.settingSubText,
                    {
                      color: colors.onSurfaceVariant,
                      fontFamily: typography.bodySmall.fontFamilySans,
                    },
                  ]}
                >
                  🎉 Your song is today's 365.
                </Text>
              </View>
            </View>

            <M3Switch
              value={user?.notificationPrefs?.songSelected ?? true}
              onValueChange={handleToggleSongNotification}
            />
          </View>
        </View>

        {/* Content & Moderation */}
        <View style={styles.sectionBlock}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.primary,
                fontFamily: typography.labelLarge.fontFamilySans,
              },
            ]}
          >
            COMMUNITY & POLICY
          </Text>

          <TouchableOpacity
            onPress={() => setShowPolicy(true)}
            style={[
              styles.actionItem,
              {
                backgroundColor: colors.surfaceContainerLow,
                borderRadius: shapes.medium,
                marginBottom: 8,
              },
            ]}
          >
            <Shield size={18} color={colors.onSurfaceVariant} />
            <Text
              style={[
                styles.actionItemText,
                {
                  color: colors.onSurface,
                  fontFamily: typography.bodyLarge.fontFamilySans,
                },
              ]}
            >
              Explicit Content Policy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowReportModal(true)}
            style={[
              styles.actionItem,
              {
                backgroundColor: colors.surfaceContainerLow,
                borderRadius: shapes.medium,
              },
            ]}
          >
            <Flag size={18} color={colors.onSurfaceVariant} />
            <Text
              style={[
                styles.actionItemText,
                {
                  color: colors.onSurface,
                  fontFamily: typography.bodyLarge.fontFamilySans,
                },
              ]}
            >
              Report a Song or User
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out / Exit */}
        <View style={{ marginTop: 24 }}>
          <M3Button
            label="Sign Out"
            onPress={handleSignOut}
            variant="outlined"
            icon={<LogOut size={18} color={colors.primary} />}
          />
        </View>
      </ScrollView>

      {/* Content & Safety Policy Overlay */}
      {showPolicy && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowPolicy(false)}
          />
          <View
            style={[
              styles.modalDialog,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.outlineVariant,
                borderRadius: shapes.extraLarge,
              },
            ]}
          >
            <Text
              style={[
                styles.modalHeading,
                {
                  color: colors.onSurface,
                  fontFamily: 'Fraunces_700Bold',
                },
              ]}
            >
              Content & Safety Policy
            </Text>

            <ScrollView style={{ maxHeight: 360, marginVertical: 10 }} showsVerticalScrollIndicator={false}>
              <View style={styles.policyItem}>
                <Text style={[styles.policyItemTitle, { color: colors.primary, fontFamily: typography.titleSmall.fontFamilySans }]}>
                  1. One Global Song Ritual
                </Text>
                <Text style={[styles.policyItemBody, { color: colors.onSurfaceVariant, fontFamily: typography.bodyMedium.fontFamilySans }]}>
                  Every selected song is heard by the entire global 365 community simultaneously. Submissions are curated for discovery, melody, and musical craft—never shock value, spam, or promotional campaigns.
                </Text>
              </View>

              <View style={styles.policyItem}>
                <Text style={[styles.policyItemTitle, { color: colors.primary, fontFamily: typography.titleSmall.fontFamilySans }]}>
                  2. Explicit Music & Metadata
                </Text>
                <Text style={[styles.policyItemBody, { color: colors.onSurfaceVariant, fontFamily: typography.bodyMedium.fontFamilySans }]}>
                  All audio streams through licensed catalog providers (Spotify). Official explicit catalog tags are strictly preserved, allowing listeners to stay informed before playing.
                </Text>
              </View>

              <View style={styles.policyItem}>
                <Text style={[styles.policyItemTitle, { color: colors.primary, fontFamily: typography.titleSmall.fontFamilySans }]}>
                  3. Zero-Tolerance Violations
                </Text>
                <Text style={[styles.policyItemBody, { color: colors.onSurfaceVariant, fontFamily: typography.bodyMedium.fontFamilySans }]}>
                  Submissions, titles, or submitter handles promoting hate speech, targeted harassment, violence, defamation, or illegal acts are rejected on sight and trigger an instant, permanent account ban.
                </Text>
              </View>

              <View style={styles.policyItem}>
                <Text style={[styles.policyItemTitle, { color: colors.primary, fontFamily: typography.titleSmall.fontFamilySans }]}>
                  4. Community Reporting
                </Text>
                <Text style={[styles.policyItemBody, { color: colors.onSurfaceVariant, fontFamily: typography.bodyMedium.fontFamilySans }]}>
                  Any daily release or submitter can be flagged directly via the in-app reporting tool. Community reports are reviewed by moderators within 24 hours.
                </Text>
              </View>
            </ScrollView>

            <View style={{ marginTop: 8 }}>
              <M3Button label="Understood" onPress={() => setShowPolicy(false)} variant="filled" />
            </View>
          </View>
        </View>
      )}

      {/* Report Overlay */}
      {showReportModal && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowReportModal(false)}
          />
          <View
            style={[
              styles.modalDialog,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.outlineVariant,
                borderRadius: shapes.extraLarge,
              },
            ]}
          >
            <Text
              style={[
                styles.modalHeading,
                {
                  color: colors.onSurface,
                  fontFamily: 'Fraunces_700Bold',
                },
              ]}
            >
              Submit Report
            </Text>

            <TextInput
              placeholder="Describe the issue (e.g. copyright, harassment, explicit violation)..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              style={[
                styles.reportInput,
                {
                  color: colors.onSurface,
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.outlineVariant,
                  borderRadius: shapes.medium,
                },
              ]}
            />

            <View style={{ marginTop: 18, gap: 10 }}>
              <M3Button label="Submit Report" onPress={handleSendReport} variant="filled" />
              <M3Button label="Cancel" onPress={() => setShowReportModal(false)} variant="text" />
            </View>
          </View>
        </View>
      )}

      {/* Material You 3 Acknowledgment Toast with Animated Tick */}
      <M3Toast
        visible={showToast}
        title="Submitted"
        message={toastMessage}
        onDismiss={() => setShowToast(false)}
      />
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
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 26,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  userSection: {
    padding: 16,
    marginBottom: 24,
  },
  userDisplayName: {
    fontSize: 18,
  },
  userHandle: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: '600',
  },
  guestNote: {
    fontSize: 12,
    marginTop: 8,
  },
  sectionBlock: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  settingLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  settingIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  settingMainText: {
    fontSize: 15,
  },
  settingSubText: {
    fontSize: 12,
    marginTop: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  actionItemText: {
    fontSize: 15,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 9999,
  },
  modalDialog: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.5)',
      },
    }),
  },
  modalHeading: {
    fontSize: 22,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  reportInput: {
    height: 100,
    borderWidth: 1,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 14,
    marginTop: 12,
  },
  policyItem: {
    marginBottom: 14,
  },
  policyItemTitle: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 3,
  },
  policyItemBody: {
    fontSize: 13,
    lineHeight: 19,
  },
});
