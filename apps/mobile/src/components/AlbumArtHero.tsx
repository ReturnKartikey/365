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

const FlyingHeartItem: React.FC<{
  x: number;
  y: number;
  color: string;
  onDone: () => void;
}> = ({ x, y, color, onDone }) => {
  const scale = useSharedValue(0.18);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const tilt = useRef((Math.random() - 0.5) * 24).current;

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.3, { duration: 160, easing: Easing.out(Easing.cubic) }),
      withSpring(1.0, { damping: 9, stiffness: 220 })
    );
    translateY.value = withTiming(-95, { duration: 750, easing: Easing.out(Easing.quad) });
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
      { translateX: x - 31 },
      { translateY: y - 31 + translateY.value },
      { scale: scale.value },
      { rotate: `${tilt}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.flyingHeart, animatedStyle]} pointerEvents="none">
      <Heart size={62} color={color} fill={color} strokeWidth={1} />
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
  const artContainerRef = useRef<View>(null);

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
    const isDoubleTap = now - lastTapRef.current < 360;

    let x = artworkSize / 2;
    let y = artworkSize / 2;

    const nativeEv = e.nativeEvent as any;
    if (Platform.OS === 'web') {
      const domNode = artContainerRef.current as any;
      if (domNode && typeof domNode.getBoundingClientRect === 'function') {
        const rect = domNode.getBoundingClientRect();
        const clientX = nativeEv.clientX ?? nativeEv.pageX;
        const clientY = nativeEv.clientY ?? nativeEv.pageY;
        if (typeof clientX === 'number' && typeof clientY === 'number') {
          x = Math.max(16, Math.min(artworkSize - 16, clientX - rect.left));
          y = Math.max(16, Math.min(artworkSize - 16, clientY - rect.top));
        }
      } else if (typeof nativeEv.offsetX === 'number' && typeof nativeEv.offsetY === 'number') {
        x = Math.max(16, Math.min(artworkSize - 16, nativeEv.offsetX));
        y = Math.max(16, Math.min(artworkSize - 16, nativeEv.offsetY));
      }
    } else {
      if (typeof nativeEv.locationX === 'number' && !isNaN(nativeEv.locationX)) {
        x = Math.max(16, Math.min(artworkSize - 16, nativeEv.locationX));
        y = Math.max(16, Math.min(artworkSize - 16, nativeEv.locationY));
      }
    }

    if (isDoubleTap) {
      lastTapRef.current = 0;

      // Album tactile bounce
      artTapScale.value = withSequence(
        withTiming(0.96, { duration: 90 }),
        withSpring(1, { damping: 11, stiffness: 260 })
      );

      // Spawn flying heart at the exact tap coordinates
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
        <View ref={artContainerRef} collapsable={false}>
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
                color={colors.primary}
                onDone={() => removeHeart(h.id)}
              />
            ))}
          </Animated.View>
        </View>
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      web: {
        filter: 'drop-shadow(0px 4px 12px rgba(0, 0, 0, 0.45))',
      },
    }),
  },
});
