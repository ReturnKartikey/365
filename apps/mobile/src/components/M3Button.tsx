import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface M3ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'tonal' | 'outlined' | 'text';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
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
          height: isLarge ? 56 : 46,
          minHeight: isLarge ? 56 : 46,
          paddingHorizontal: isLarge ? 28 : 20,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            style={[
              {
                color: textColor,
                fontSize: isLarge ? 15 : typography.labelLarge.fontSize,
                fontFamily: typography.labelLarge.fontFamilySans,
                fontWeight: '600',
                letterSpacing: 0.3,
                textAlign: 'center',
              },
              textStyle,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
