import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

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
        <Feather name="rotate-ccw" size={size} color={color} />
      </Animated.View>
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
