import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
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
  const { signInWithGoogle, signInAsGuest } = useAuth();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
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
            onPress={handleGoogleSignIn}
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
});
