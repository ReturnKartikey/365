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

  // M3 switch dimensions: Track 52x32, Thumb 16->24
  const TRACK_WIDTH = 52;
  const TRACK_HEIGHT = 32;
  const THUMB_UNCHECKED = 16;
  const THUMB_CHECKED = 24;

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

  // Thumb position and size
  const animatedThumbStyle = useAnimatedStyle(() => {
    // Left offset when unchecked: 6px. Right offset when checked: 52 - 24 - 4 = 24px.
    const translateX = 6 + anim.value * (TRACK_WIDTH - THUMB_CHECKED - 8);
    // Expand thumb when checked (16 -> 24) and slightly expand on press
    const size = THUMB_UNCHECKED + anim.value * (THUMB_CHECKED - THUMB_UNCHECKED) + isPressing.value * 2;
    const top = (TRACK_HEIGHT - size) / 2;

    const thumbBg = interpolateColor(
      anim.value,
      [0, 1],
      [colors.outline, colors.onPrimary]
    );

    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      transform: [{ translateX }],
      top,
      backgroundColor: thumbBg,
    };
  });

  // Check icon inside thumb
  const animatedCheckStyle = useAnimatedStyle(() => ({
    opacity: withTiming(anim.value, { duration: 120 }),
    transform: [{ scale: anim.value }],
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
          <Check size={13} color={colors.primary} strokeWidth={3} />
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
