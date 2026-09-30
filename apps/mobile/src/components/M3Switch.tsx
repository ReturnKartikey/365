import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { Check } from 'lucide-react-native';

interface M3SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const M3Switch: React.FC<M3SwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
}) => {
  const { colors } = useTheme();

  // M3 switch dimensions: Track 52x32dp, Thumb 16dp -> 24dp
  const TRACK_WIDTH = 52;
  const TRACK_HEIGHT = 32;

  const anim = useSharedValue(value ? 1 : 0);
  const isPressing = useSharedValue(0);

  useEffect(() => {
    anim.value = withSpring(value ? 1 : 0, {
      damping: 18,
      stiffness: 240,
    });
  }, [value]);

  const handlePressIn = () => {
    isPressing.value = withTiming(1, { duration: 100 });
  };

  const handlePressOut = () => {
    isPressing.value = withTiming(0, { duration: 100 });
  };

  // Track style
  const animatedTrackStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      anim.value,
      [0, 1],
      [colors.surfaceContainerHighest, colors.primary]
    );

    const borderColor = interpolateColor(
      anim.value,
      [0, 1],
      [colors.outline, colors.primary]
    );

    return {
      backgroundColor: bgColor,
      borderColor: borderColor,
    };
  });

  // Thumb position, size, and color
  const animatedThumbStyle = useAnimatedStyle(() => {
    // Horizontal translation across the track (leaves 2px padding inside the 2px border)
    // Inner width is 48px. Thumb is 24px. Range: 2px (left) to 22px (right).
    const translateX = 2 + anim.value * 20;

    // Scale from 16/24 (0.667) when unchecked to 1.0 (24px) when checked
    const baseScale = (16 / 24) + anim.value * (1 - 16 / 24);
    const pressMultiplier = isPressing.value ? 1.06 : 1.0;
    const finalScale = baseScale * pressMultiplier;

    const thumbBg = interpolateColor(
      anim.value,
      [0, 1],
      [colors.outline, colors.onPrimary]
    );

    return {
      transform: [
        { translateX },
        { scale: finalScale },
      ],
      backgroundColor: thumbBg,
    };
  });

  // Check icon inside thumb: perfectly scales and fades in on check
  const animatedCheckStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ scale: Math.max(0.001, anim.value) }],
  }));

  return (
    <AnimatedTouchable
      activeOpacity={0.9}
      onPress={() => onValueChange(!value)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.track,
        animatedTrackStyle,
        {
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          borderRadius: TRACK_HEIGHT / 2,
        },
      ]}
    >
      <Animated.View style={[styles.thumb, animatedThumbStyle]}>
        <Animated.View style={[styles.checkIconWrapper, animatedCheckStyle]}>
          <Check size={14} color={colors.primary} strokeWidth={2.8} />
        </Animated.View>
      </Animated.View>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  track: {
    borderWidth: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    left: 0,
    top: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkIconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
