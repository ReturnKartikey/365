import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

interface GoogleIconProps {
  size?: number;
  color?: string;
}

export const GoogleIcon: React.FC<GoogleIconProps> = ({ size = 18, color = '#FFFFFF' }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <AntDesign name="google" size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
