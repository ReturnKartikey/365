import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface M3ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'tonal' | 'outlined' | 'text';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'normal' | 'large';
}

export const M3Button: React.FC<M3ButtonProps> = ({
  label,
  onPress,
  variant = 'filled',
  icon,
  disabled = false,
  loading = false,
  style,
  textStyle,
  size = 'normal',
}) => {
  const { colors, shapes, typography } = useTheme();

  const isLarge = size === 'large';

  let containerBg = colors.primary;
  let textColor = colors.onPrimary;
  let borderWidth = 0;
  let borderColor = 'transparent';

  if (variant === 'tonal') {
    containerBg = colors.secondaryContainer;
    textColor = colors.onSecondaryContainer;
  } else if (variant === 'outlined') {
    containerBg = 'transparent';
    textColor = colors.primary;
    borderWidth = 1;
    borderColor = colors.outline;
  } else if (variant === 'text') {
    containerBg = 'transparent';
    textColor = colors.primary;
  }

  if (disabled) {
    containerBg = variant === 'filled' || variant === 'tonal' ? colors.surfaceContainerHighest : 'transparent';
    textColor = colors.onSurfaceVariant;
    borderColor = colors.outlineVariant;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: containerBg,
          borderRadius: shapes.full,
          borderWidth,
          borderColor,
          paddingVertical: isLarge ? 18 : 14,
          paddingHorizontal: isLarge ? 28 : 24,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              {
                color: textColor,
                fontSize: isLarge ? 16 : typography.labelLarge.fontSize,
                fontFamily: typography.labelLarge.fontFamilySans,
                fontWeight: '600',
                letterSpacing: 0.3,
                marginLeft: icon ? 8 : 0,
              },
              textStyle,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
