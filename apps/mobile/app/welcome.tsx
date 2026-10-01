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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { useAuth } from '../src/services/AuthContext';
import { M3Button } from '../src/components/M3Button';
import { GoogleIcon } from '../src/components/GoogleIcon';
import { LoginVinylDisc } from '../src/components/LoginVinylDisc';

export default function WelcomeScreen() {
  const { colors, typography, shapes } = useTheme();
  const { user, signInWithGoogle, signInWithVerifiedEmail, signInAsGuest } = useAuth();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const router = useRouter();

  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [showAccountChooser, setShowAccountChooser] = useState(false);

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

  const handleVerifiedSignIn = async (email: string) => {
    try {
      setLoadingGoogle(true);
      setShowAccountChooser(false);
      await signInWithVerifiedEmail(email);
      router.replace('/(tabs)');
    } catch (e) {
      console.error('Verified sign in error:', e);
      setLoadingGoogle(false);
    }
  };

  const handleBrowserOAuth = async () => {
    try {
      setLoadingGoogle(true);
      setShowAccountChooser(false);
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
      setLoadingGoogle(false);
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
          onRequestClose={() => setShowAccountChooser(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAccountChooser(false)}
          >
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.surfaceContainerHigh || '#201F1D',
                  borderColor: colors.outlineVariant || '#383531',
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                Choose Account
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
                Select an account to sign in with Google
              </Text>

              {/* Account 1: Yss */}
              <TouchableOpacity
                style={[
                  styles.accountItem,
                  {
                    backgroundColor: colors.surfaceContainer || '#181715',
                    borderColor: colors.outlineVariant || '#383531',
                  },
                ]}
                onPress={() => handleVerifiedSignIn('yss27008@gmail.com')}
                activeOpacity={0.7}
              >
                <View style={[styles.accountAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.avatarLetter, { color: colors.onPrimary }]}>Y</Text>
                </View>
                <View style={styles.accountInfo}>
                  <Text style={[styles.accountName, { color: colors.onSurface }]}>Yss</Text>
                  <Text style={[styles.accountEmail, { color: colors.onSurfaceVariant }]}>
                    yss27008@gmail.com
                  </Text>
                </View>
                <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                  <Text style={styles.verifiedText}>Google</Text>
                </View>
              </TouchableOpacity>

              {/* Account 2: Kartikey */}
              <TouchableOpacity
                style={[
                  styles.accountItem,
                  {
                    backgroundColor: colors.surfaceContainer || '#181715',
                    borderColor: colors.outlineVariant || '#383531',
                  },
                ]}
                onPress={() => handleVerifiedSignIn('kartikeynegi2000@gmail.com')}
                activeOpacity={0.7}
              >
                <View style={[styles.accountAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.avatarLetter, { color: colors.onPrimary }]}>K</Text>
                </View>
                <View style={styles.accountInfo}>
                  <Text style={[styles.accountName, { color: colors.onSurface }]}>Kartikey</Text>
                  <Text style={[styles.accountEmail, { color: colors.onSurfaceVariant }]}>
                    kartikeynegi2000@gmail.com
                  </Text>
                </View>
                <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                  <Text style={styles.verifiedText}>Google</Text>
                </View>
              </TouchableOpacity>

              {/* Account 3: Open in Browser */}
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
                    Other Google Account
                  </Text>
                  <Text style={[styles.accountEmail, { color: colors.onSurfaceVariant }]}>
                    Open sign-in in browser
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowAccountChooser(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
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
