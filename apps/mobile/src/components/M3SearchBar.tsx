import React, { useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
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
  const inputRef = useRef<TextInput>(null);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceContainerHigh,
          borderRadius: shapes.full,
        },
      ]}
    >
      <Search
        size={20}
        color={colors.onSurfaceVariant}
        style={styles.leadingIcon}
      />

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
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceVariant}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
      />

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
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
});
