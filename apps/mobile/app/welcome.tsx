import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { useAuth } from '../src/services/AuthContext';
import { M3Button } from '../src/components/M3Button';

export default function WelcomeScreen() {
  const { colors, typography } = useTheme();
  const { signInWithGoogle, signInAsGuest } = useAuth();
  const router = useRouter();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoadingGoogle(true);
      await signInWithGoogle();
      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
    } finally {
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
        {/* Editorial Masthead */}
        <View style={styles.mastheadSection}>
          <Text
            style={[
              styles.superTitle,
              {
                color: colors.primary,
                fontFamily: typography.labelMedium.fontFamilySans,
              },
            ]}
          >
            DAILY MUSIC RITUAL
          </Text>

          <Text
            style={[
              styles.logoTitle,
              {
                color: colors.onBackground,
                fontFamily: typography.displayLarge.fontFamilySerif,
              },
            ]}
          >
            365
          </Text>

          <Text
            style={[
              styles.tagline,
              {
                color: colors.onSurfaceVariant,
                fontFamily: typography.titleLarge.fontFamilySans,
              },
            ]}
          >
            One song. Every day.
          </Text>
        </View>

        {/* Minimal Editorial Divider / Quote */}
        <View style={styles.manifestoSection}>
          <View style={[styles.rule, { backgroundColor: colors.outlineVariant }]} />
          <Text
            style={[
              styles.manifestoText,
              {
                color: colors.onSurfaceVariant,
                fontFamily: typography.bodyMedium.fontFamilySans,
              },
            ]}
          >
            A collective listening ritual. Chosen from listener submissions.
            No endless feeds, no algorithms, no distractions.
          </Text>
          <View style={[styles.rule, { backgroundColor: colors.outlineVariant }]} />
        </View>

        {/* Primary Action Buttons */}
        <View style={styles.actionsSection}>
          <M3Button
            label="Continue with Google"
            onPress={handleGoogleSignIn}
            loading={loadingGoogle}
            size="large"
            style={styles.actionButton}
          />

          <M3Button
            label="Continue as Guest"
            onPress={handleGuestSignIn}
            variant="tonal"
            loading={loadingGuest}
            size="large"
            style={styles.actionButton}
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
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 32,
    justifyContent: 'space-between',
  },
  mastheadSection: {
    paddingTop: 48,
  },
  superTitle: {
    fontSize: 13,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    fontWeight: '700',
  },
  logoTitle: {
    fontSize: 78,
    lineHeight: 84,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 22,
    marginTop: 8,
    fontWeight: '500',
  },
  manifestoSection: {
    paddingVertical: 24,
  },
  rule: {
    height: 1,
    width: '100%',
    marginVertical: 18,
    opacity: 0.6,
  },
  manifestoText: {
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  actionsSection: {
    paddingBottom: 24,
  },
  actionButton: {
    marginVertical: 8,
  },
});
