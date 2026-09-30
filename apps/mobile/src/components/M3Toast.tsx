import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { Check } from 'lucide-react-native';

interface M3ToastProps {
  visible: boolean;
  title?: string;
  message?: string;
  onDismiss: () => void;
  durationMs?: number;
}

export const M3Toast: React.FC<M3ToastProps> = ({
  visible,
  title = 'Submitted',
  message = 'Thank you for keeping 365 safe and thoughtful.',
  onDismiss,
  durationMs = 3200,
}) => {
  const { colors, typography, shapes } = useTheme();

  const translateY = useSharedValue(60);
  const opacity = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const circleScale = useSharedValue(0.4);

  useEffect(() => {
    let timer: any;
    if (visible) {
      // Reset animation values
      translateY.value = 60;
      opacity.value = 0;
      circleScale.value = 0.4;
      checkScale.value = 0;

      // Enter toast
      translateY.value = withSpring(0, { damping: 15, stiffness: 180 });
      opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });

      // Material You 3 spring checkmark animation
      circleScale.value = withSequence(
        withTiming(1.2, { duration: 200, easing: Easing.out(Easing.cubic) }),
        withSpring(1.0, { damping: 12, stiffness: 220 })
      );
      checkScale.value = withSequence(
        withTiming(0, { duration: 100 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );

      // Auto dismiss timer
      timer = setTimeout(() => {
        handleDismiss();
      }, durationMs);
    } else {
      translateY.value = withTiming(40, { duration: 180 });
      opacity.value = withTiming(0, { duration: 180 });
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible]);

  const handleDismiss = () => {
    translateY.value = withTiming(50, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(onDismiss)();
      }
    });
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  const animatedCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        animatedContainerStyle,
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handleDismiss}
        style={[
          styles.toastContainer,
          {
            backgroundColor: colors.surfaceContainerHighest,
            borderColor: colors.outlineVariant,
            borderRadius: shapes.large,
          },
        ]}
      >
        {/* Material You 3 Animated Checkmark Circle */}
        <Animated.View
          style={[
            styles.checkCircle,
            { backgroundColor: colors.primary },
            animatedCircleStyle,
          ]}
        >
          <Animated.View style={animatedCheckStyle}>
            <Check size={18} color={colors.onPrimary} strokeWidth={3} />
          </Animated.View>
        </Animated.View>

        <View style={styles.textWrap}>
          <Text
            style={[
              styles.title,
              {
                color: colors.onSurface,
                fontFamily: typography.titleSmall.fontFamilySans,
              },
            ]}
          >
            {title}
          </Text>
          {message ? (
            <Text
              style={[
                styles.message,
                {
                  color: colors.onSurfaceVariant,
                  fontFamily: typography.bodySmall.fontFamilySans,
                },
              ]}
              numberOfLines={2}
            >
              {message}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastContainer: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    fontSize: 15,
  },
  message: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
});
