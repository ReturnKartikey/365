import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  useWindowDimensions,
  AppState,
  Modal,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Sparkles, UserPlus, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { useAuth } from '../src/services/AuthContext';
import { M3Button } from '../src/components/M3Button';
import { GoogleIcon } from '../src/components/GoogleIcon';
import { LoginVinylDisc } from '../src/components/LoginVinylDisc';

interface SavedAccount {
  name: string;
  username: string;
  email: string;
  avatar?: string;
}

const SAVED_ACCOUNTS: SavedAccount[] = [
  {
    name: 'Kartikey Negi',
    username: '@kartikeynegi',
    email: 'kartikeynegi2000@gmail.com',
    avatar: 'https://lh3.googleusercontent.com/a/ACg8ocJStECLLVvUkPElTtjP_PWjg4YDxhHXtC1S1ccpUBcPp2gfkP1E=s96-c',
  },
  {
    name: 'Yss',
    username: '@yss',
    email: 'yss27008@gmail.com',
    avatar: 'https://lh3.googleusercontent.com/a/ACg8ocIYwGGTBhG4HP6lo6YLKgFNC-r7D6YuvyWa27tWHu0qeeVtzjE9=s96-c',
  },
  {
    name: 'Kartikey Negi (Work)',
    username: '@kartikeywork',
    email: 'kartikeynegi2000.work@gmail.com',
    avatar: 'https://lh3.googleusercontent.com/a/ACg8ocJStECLLVvUkPElTtjP_PWjg4YDxhHXtC1S1ccpUBcPp2gfkP1E=s96-c',
  },
  {
    name: 'Kannu Bhati',
    username: '@kannubhati',
    email: 'kannubhati03@gmail.com',
  },
];

export default function WelcomeScreen() {
  const { colors, typography, shapes } = useTheme();
  const { user, signInWithGoogle, signInWithVerifiedEmail, signInAsGuest } = useAuth();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const router = useRouter();

  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [showAccountChooser, setShowAccountChooser] = useState(false);
  const [signingInEmail, setSigningInEmail] = useState<string | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setLoadingGoogle(false);
      }
    });
    return () => sub.remove();
  }, []);

  const handleGoogleSignInPress = () => {
    setShowAccountChooser(true);
  };

  const handleBrowserOAuth = async () => {
    setShowAccountChooser(false);
    try {
      setLoadingGoogle(true);
      await signInWithGoogle();
    } catch (e: any) {
      console.warn('Google sign-in error:', e);
      setLoadingGoogle(false);
    }
  };

  const handleVerifiedSignIn = async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setAuthError('Please enter a valid Google email address');
      return;
    }
    try {
      setAuthError(null);
      setSigningInEmail(trimmed);
      setLoadingGoogle(true);
      await signInWithVerifiedEmail(trimmed);
      setShowAccountChooser(false);
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('Verified sign in error:', e);
      setLoadingGoogle(false);
      setSigningInEmail(null);
      setAuthError(e?.message || 'Could not sign in with this account. Please try again.');
    }
  };

  const handleGuestSignIn = async () => {
    try {
      setLoadingGuest(true);
      await signInAsGuest();
      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGuest(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* 1. Material You Vinyl Disc with ambient radial aura */}
        <LoginVinylDisc primaryColor={colors.primary} />

        {/* 2. Editorial Header & Manifesto (Left Column) */}
        <View style={styles.contentColumn}>
          {/* Subtle star accent */}
          <View style={styles.sparkleRow}>
            <Sparkles size={18} color={colors.primary} />
          </View>

          {/* Large Editorial Brand Title in exact Fraunces serif matching Today's 30 September */}
          <Text
            style={[
              styles.brandTitle,
              {
                color: colors.onBackground,
                fontFamily: 'Fraunces_700Bold',
              },
            ]}
          >
            365
          </Text>

          {/* Tagline in NType 82 font with split color */}
          <View style={styles.taglineWrapper}>
            <Text
              style={[
                styles.ntypeTagline,
                {
                  fontFamily: 'NType82-Headline',
                },
              ]}
            >
              <Text style={{ color: colors.onBackground }}>One song. </Text>
              <Text style={{ color: colors.primary }}>Every day.</Text>
            </Text>
          </View>

          {/* Clean human-crafted manifesto */}
          <Text
            style={[
              styles.manifestoText,
              {
                color: colors.onSurfaceVariant,
                fontFamily: typography.bodyMedium.fontFamilySans,
                maxWidth: Math.min(310, SCREEN_WIDTH * 0.72),
              },
            ]}
          >
            Discover one song daily, chosen by listeners. No algorithms, no endless scrolling. Just
            one track to experience together today.
          </Text>
        </View>

        {/* 3. Balanced Action Buttons */}
        <View style={styles.actionsSection}>
          <M3Button
            label="Continue with Google"
            icon={<GoogleIcon size={19} color={colors.onPrimary} />}
            onPress={handleGoogleSignInPress}
            loading={loadingGoogle}
            size="large"
            style={[styles.actionButton, { borderRadius: shapes.extraLarge }]}
          />

          <M3Button
            label="Continue as Guest"
            onPress={handleGuestSignIn}
            variant="tonal"
            loading={loadingGuest}
            size="large"
            style={[
              styles.actionButton,
              {
                borderRadius: shapes.extraLarge,
                backgroundColor: colors.surfaceContainerHigh,
                borderWidth: 1,
                borderColor: colors.outlineVariant,
              },
            ]}
            textStyle={{ color: colors.onSurface }}
          />

        </View>

        {/* 4. Google Account Chooser Modal (Direct Supabase Auth Bridge) */}
        <Modal
          visible={showAccountChooser}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!signingInEmail) {
              setShowAccountChooser(false);
              setShowAddAccount(false);
              setAuthError(null);
            }
          }}
        >
          <View style={styles.modalOverlay}>
            {/* Absolute backdrop: click outside to dismiss */}
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => {
                if (!signingInEmail) {
                  setShowAccountChooser(false);
                  setShowAddAccount(false);
                  setAuthError(null);
                }
              }}
            />

            {/* Modal Card - pure View container so inner Touchables receive touch events directly */}
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.surfaceContainerHigh || '#201F1D',
                  borderColor: colors.outlineVariant || '#383531',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                <GoogleIcon size={22} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                  Sign in with Google
                </Text>
              </View>
              <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
                Choose a saved account or add a new one to continue to 365
              </Text>

              {/* Error banner if any */}
              {authError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{authError}</Text>
                </View>
              )}

              {/* Section Header: Saved Logins */}
              <Text style={[styles.sectionHeading, { color: colors.primary }]}>
                SAVED LOGINS
              </Text>

              <ScrollView
                style={{ maxHeight: 220 }}
                contentContainerStyle={{ gap: 8 }}
                showsVerticalScrollIndicator={false}
              >
                {SAVED_ACCOUNTS.map((acc) => (
                  <TouchableOpacity
                    key={acc.email}
                    style={[
                      styles.accountItem,
                      {
                        backgroundColor: colors.surfaceContainer || '#181715',
                        borderColor:
                          signingInEmail === acc.email
                            ? colors.primary
                            : colors.outlineVariant || '#383531',
                      },
                    ]}
                    onPress={() => handleVerifiedSignIn(acc.email)}
                    activeOpacity={0.7}
                    disabled={Boolean(signingInEmail)}
                  >
                    {acc.avatar ? (
                      <Image source={{ uri: acc.avatar }} style={styles.accountAvatar} />
                    ) : (
                      <View
                        style={[
                          styles.accountAvatar,
                          { backgroundColor: colors.surfaceContainerHigh || '#282624' },
                        ]}
                      >
                        <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                          {acc.name.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.accountInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.accountName, { color: colors.onSurface }]}>
                          {acc.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.primary, opacity: 0.9 }}>
                          {acc.username}
                        </Text>
                      </View>
                      <Text style={[styles.accountEmail, { color: colors.onSurfaceVariant }]}>
                        {acc.email}
                      </Text>
                    </View>
                    {signingInEmail === acc.email ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <View
                        style={[
                          styles.verifiedBadge,
                          { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
                        ]}
                      >
                        <Text style={styles.verifiedText}>Google</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Section Header: ADD ANOTHER ACCOUNT */}
              <Text style={[styles.sectionHeading, { color: colors.primary, marginTop: 4 }]}>
                ADD ANOTHER ACCOUNT
              </Text>

              {showAddAccount ? (
                <View
                  style={[
                    styles.addAccountBox,
                    {
                      backgroundColor: colors.surfaceContainer || '#181715',
                      borderColor: colors.outlineVariant || '#383531',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 6 }}>
                    Enter any Google email address:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput
                      style={[
                        styles.addAccountInput,
                        {
                          color: colors.onSurface,
                          borderColor: colors.outlineVariant || '#383531',
                          backgroundColor: colors.surfaceContainerHigh || '#201F1D',
                        },
                      ]}
                      placeholder="yourname@gmail.com"
                      placeholderTextColor={colors.onSurfaceVariant ? `${colors.onSurfaceVariant}66` : '#777'}
                      value={newEmail}
                      onChangeText={setNewEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                    <TouchableOpacity
                      style={[
                        styles.addAccountSubmitBtn,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={() => handleVerifiedSignIn(newEmail)}
                      disabled={Boolean(signingInEmail) || !newEmail.trim()}
                      activeOpacity={0.8}
                    >
                      {signingInEmail === newEmail.trim().toLowerCase() ? (
                        <ActivityIndicator size="small" color={colors.onPrimary} />
                      ) : (
                        <ArrowRight size={18} color={colors.onPrimary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.accountItem,
                    {
                      backgroundColor: colors.surfaceContainer || '#181715',
                      borderColor: colors.outlineVariant || '#383531',
                    },
                  ]}
                  onPress={() => setShowAddAccount(true)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.accountAvatar,
                      { backgroundColor: colors.surfaceContainerHigh || '#282624' },
                    ]}
                  >
                    <UserPlus size={18} color={colors.primary} />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={[styles.accountName, { color: colors.onSurface }]}>
                      Add Google Account
                    </Text>
                    <Text style={[styles.accountEmail, { color: colors.onSurfaceVariant }]}>
                      Sign in with another email address
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Option: Standard Browser OAuth */}
              <TouchableOpacity
                style={[
                  styles.accountItem,
                  {
                    backgroundColor: colors.surfaceContainer || '#181715',
                    borderColor: colors.outlineVariant || '#383531',
                  },
                ]}
                onPress={handleBrowserOAuth}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.accountAvatar,
                    { backgroundColor: colors.surfaceContainerHigh || '#282624' },
                  ]}
                >
                  <GoogleIcon size={18} color={colors.primary} />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={[styles.accountName, { color: colors.onSurface }]}>
                    Browser Google Sign-In
                  </Text>
                  <Text style={[styles.accountEmail, { color: colors.onSurfaceVariant }]}>
                    Open full Google account chooser in browser
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowAccountChooser(false);
                  setShowAddAccount(false);
                  setAuthError(null);
                }}
              >
                <Text style={[styles.modalCancelText, { color: colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  contentColumn: {
    zIndex: 2,
    paddingTop: 12,
  },
  sparkleRow: {
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 86,
    lineHeight: 90,
    letterSpacing: -2,
  },
  taglineWrapper: {
    marginTop: 12,
    marginBottom: 18,
  },
  ntypeTagline: {
    fontSize: 28,
    lineHeight: 35,
    letterSpacing: -0.2,
    ...Platform.select({
      web: {
        fontFamily: "'NType82-Headline', 'NType82-Regular', 'Space Grotesk', system-ui, sans-serif",
      } as any,
    }),
  },
  manifestoText: {
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0.15,
    opacity: 0.88,
  },
  actionsSection: {
    zIndex: 2,
    paddingBottom: 8,
    gap: 12,
  },
  actionButton: {
    width: '100%',
    marginVertical: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 8,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '700',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '600',
  },
  accountEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 11,
    color: '#22c55e',
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 4,
    marginBottom: -4,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 12,
    padding: 10,
  },
  errorBannerText: {
    color: '#f87171',
    fontSize: 12,
    lineHeight: 16,
  },
  addAccountBox: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  addAccountInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  addAccountSubmitBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancel: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
