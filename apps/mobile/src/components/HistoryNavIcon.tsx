import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { History } from 'lucide-react-native';

interface HistoryNavIconProps {
  size?: number;
  color: string;
  rotation: Animated.SharedValue<number>;
}

export const HistoryNavIcon: React.FC<HistoryNavIconProps> = ({
  size = 22,
  color,
  rotation,
}) => {
  const animatedArrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
          },
        ]}
      >
        {/* Animated Arrow Circle: Rotates 360° around the center and returns to starting point */}
        <Animated.View
          style={[
            styles.layer,
            {
              width: size,
              height: size,
            },
            animatedArrowStyle,
          ]}
        >
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'block' }}
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </Animated.View>

        {/* Static Clock Hands: Stay completely still in the center */}
        <View
          style={[
            styles.layer,
            {
              width: size,
              height: size,
            },
          ]}
        >
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'block' }}
          >
            <path d="M12 7v5l4 2" />
          </svg>
        </View>
      </View>
    );
  }

  // Native fallback
  return <History size={size} color={color} />;
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
