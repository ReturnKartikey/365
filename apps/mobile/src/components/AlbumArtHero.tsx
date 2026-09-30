import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';

interface AlbumArtHeroProps {
  artworkUrl: string;
  isNewRelease?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = Math.min(SCREEN_WIDTH - 48, 380);

export const AlbumArtHero: React.FC<AlbumArtHeroProps> = ({ artworkUrl, isNewRelease = false }) => {
  const { colors, shapes } = useTheme();

  // Reveal animation shared values
  const opacity = useSharedValue(isNewRelease ? 0 : 1);
  const scale = useSharedValue(isNewRelease ? 0.94 : 1);

  useEffect(() => {
    if (isNewRelease) {
      // Subtle, tasteful M3 emphasized reveal
      opacity.value = withDelay(
        220,
        withTiming(1, {
          duration: 450,
          easing: Easing.bezier(0.2, 0.0, 0.0, 1.0),
        })
      );
      scale.value = withDelay(
        220,
        withTiming(1, {
          duration: 500,
          easing: Easing.bezier(0.05, 0.7, 0.1, 1.0),
        })
      );
    } else {
      opacity.value = 1;
      scale.value = 1;
    }
  }, [artworkUrl, isNewRelease]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.outerContainer}>
      {/* Tonal background glow / shadow derived from artwork palette */}
      <View
        style={[
          styles.tonalPlate,
          {
            width: ARTWORK_SIZE,
            height: ARTWORK_SIZE,
            borderRadius: shapes.extraLarge,
            backgroundColor: colors.surfaceContainerHighest,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.artWrapper,
          {
            width: ARTWORK_SIZE,
            height: ARTWORK_SIZE,
            borderRadius: shapes.extraLarge,
            borderColor: colors.outlineVariant,
          },
          animatedStyle,
        ]}
      >
        <Image
          source={{ uri: artworkUrl }}
          style={[
            styles.image,
            {
              borderRadius: shapes.extraLarge,
            },
          ]}
          resizeMode="cover"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
    position: 'relative',
  },
  tonalPlate: {
    position: 'absolute',
    top: 6,
    opacity: 0.7,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.28,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      },
    }),
  },
  artWrapper: {
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.24,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 16px 36px rgba(0,0,0,0.25)',
      },
    }),
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
