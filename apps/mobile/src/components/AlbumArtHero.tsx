import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  useWindowDimensions,
  Platform,
  TouchableWithoutFeedback,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { Heart } from 'lucide-react-native';

interface AlbumArtHeroProps {
  artworkUrl: string;
  isNewRelease?: boolean;
  onLike?: () => void;
}

interface FlyingHeart {
  id: number;
  x: number;
  y: number;
}

const FlyingHeartItem: React.FC<{ x: number; y: number; onDone: () => void }> = ({
  x,
  y,
  onDone,
}) => {
  const scale = useSharedValue(0.2);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const tilt = useRef((Math.random() - 0.5) * 24).current;

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.35, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withSpring(1.05, { damping: 10, stiffness: 220 })
    );
    translateY.value = withTiming(-85, { duration: 750, easing: Easing.out(Easing.quad) });
    opacity.value = withDelay(
      380,
      withTiming(0, { duration: 370 }, (finished) => {
        if (finished) runOnJS(onDone)();
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x - 22 },
      { translateY: y - 22 + translateY.value },
      { scale: scale.value },
      { rotate: `${tilt}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.flyingHeart, animatedStyle]} pointerEvents="none">
      <Heart size={44} color="#FF3B30" fill="#FF3B30" strokeWidth={1} />
    </Animated.View>
  );
};

export const AlbumArtHero: React.FC<AlbumArtHeroProps> = ({
  artworkUrl,
  isNewRelease = false,
  onLike,
}) => {
  const { colors, shapes } = useTheme();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  // Responsive size optimized so title, artist, and buttons fit in view
  const artworkSize = Math.min(SCREEN_WIDTH - 56, Math.min(SCREEN_HEIGHT * 0.34, 280));

  // Reveal animation shared values
  const opacity = useSharedValue(isNewRelease ? 0 : 1);
  const scale = useSharedValue(isNewRelease ? 0.94 : 1);
  const artTapScale = useSharedValue(1);

  // Flying hearts state
  const [hearts, setHearts] = useState<FlyingHeart[]>([]);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    if (isNewRelease) {
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

  const handleDoubleTap = (e: GestureResponderEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 340) {
      // Double tap confirmed!
      lastTapRef.current = 0;
      const { locationX, locationY } = e.nativeEvent;
      const x = typeof locationX === 'number' ? locationX : artworkSize / 2;
      const y = typeof locationY === 'number' ? locationY : artworkSize / 2;

      // Album tactile bounce
      artTapScale.value = withSequence(
        withTiming(0.96, { duration: 90 }),
        withSpring(1, { damping: 11, stiffness: 260 })
      );

      // Spawn flying heart
      const heartId = Date.now() + Math.random();
      setHearts((prev) => [...prev, { id: heartId, x, y }]);
      onLike?.();
    } else {
      lastTapRef.current = now;
    }
  };

  const removeHeart = (id: number) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value * artTapScale.value }],
  }));

  return (
    <View style={styles.outerContainer}>
      {/* Tonal background glow / shadow derived from artwork palette */}
      <View
        style={[
          styles.tonalPlate,
          {
            width: artworkSize,
            height: artworkSize,
            borderRadius: shapes.extraLarge,
            backgroundColor: colors.surfaceContainerHighest,
          },
        ]}
      />

      <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <Animated.View
          style={[
            styles.artWrapper,
            {
              width: artworkSize,
              height: artworkSize,
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

          {/* Flying Hearts Layer */}
          {hearts.map((h) => (
            <FlyingHeartItem
              key={h.id}
              x={h.x}
              y={h.y}
              onDone={() => removeHeart(h.id)}
            />
          ))}
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
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
    position: 'relative',
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
        cursor: 'pointer',
      },
    }),
  },
  image: {
    width: '100%',
    height: '100%',
  },
  flyingHeart: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 99,
    ...Platform.select({
      ios: {
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      web: {
        filter: 'drop-shadow(0px 4px 12px rgba(255, 59, 48, 0.5))',
      },
    }),
  },
});
