import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

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
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
        >
          <Path
            d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Path
            d="M3 3v5h5"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
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
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
        >
          <Path
            d="M12 7v5l4 2"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </View>
    </View>
  );
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
