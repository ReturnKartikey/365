import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { Search, X } from 'lucide-react-native';

export interface M3SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  autoFocus?: boolean;
}

export const M3SearchBar: React.FC<M3SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search song or artist...',
  onClear,
  autoFocus = false,
}) => {
  const { colors, shapes, typography } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Blinking typing cursor animation
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    if (isFocused && value.length === 0) {
      cursorOpacity.value = 1;
      cursorOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 460, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 460, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cursorOpacity.value = 0;
    }
  }, [isFocused, value]);

  const animatedCursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isFocused
            ? colors.surfaceContainerHighest
            : colors.surfaceContainerHigh,
          borderRadius: shapes.full,
          borderColor: isFocused ? colors.primary : 'transparent',
          borderWidth: 1.5,
        },
      ]}
    >
      <Search
        size={20}
        color={isFocused ? colors.primary : colors.onSurfaceVariant}
        style={styles.leadingIcon}
      />

      <View style={styles.inputWrap}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              color: colors.onSurface,
              fontSize: typography.bodyLarge.fontSize,
              fontFamily: typography.bodyLarge.fontFamilySans,
              // @ts-ignore - web outline removal
              outlineStyle: 'none',
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={isFocused ? '' : placeholder}
          placeholderTextColor={colors.onSurfaceVariant}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoFocus={autoFocus}
          autoCorrect={false}
          returnKeyType="search"
        />

        {/* Blinking Typing Cursor Feedback (|) when focused and empty */}
        {isFocused && value.length === 0 && (
          <Animated.View
            style={[
              styles.blinkingCursor,
              { backgroundColor: colors.primary },
              animatedCursorStyle,
            ]}
            pointerEvents="none"
          />
        )}
      </View>

      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => {
            onChangeText('');
            onClear?.();
            inputRef.current?.focus();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.clearButton}
        >
          <X size={18} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 54,
    marginVertical: 12,
  },
  leadingIcon: {
    marginRight: 12,
  },
  inputWrap: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  input: {
    width: '100%',
    height: '100%',
    padding: 0,
  },
  blinkingCursor: {
    position: 'absolute',
    left: 1,
    top: '50%',
    marginTop: -10,
    width: 2.2,
    height: 20,
    borderRadius: 1,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
});
