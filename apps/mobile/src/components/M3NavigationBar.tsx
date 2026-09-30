import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Disc3, Plus, History, LucideIcon } from 'lucide-react-native';

export type TabKey = 'today' | 'submit' | 'history';

interface M3NavigationBarProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

export const M3NavigationBar: React.FC<M3NavigationBarProps> = ({ currentTab, onSelectTab }) => {
  const { colors, shapes, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const tabs: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
    { key: 'today', label: 'Today', icon: Disc3 },
    { key: 'submit', label: 'Submit', icon: Plus },
    { key: 'history', label: 'History', icon: History },
  ];

  return (
    <View
      style={[
        styles.barContainer,
        {
          backgroundColor: colors.surfaceContainer,
          borderTopColor: colors.outlineVariant,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View style={styles.destinationsRow}>
        {tabs.map((tab) => {
          const isSelected = currentTab === tab.key;
          const IconComponent = tab.icon;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onSelectTab(tab.key)}
              activeOpacity={0.7}
              style={styles.destinationItem}
            >
              <View
                style={[
                  styles.activeIndicator,
                  {
                    backgroundColor: isSelected ? colors.secondaryContainer : 'transparent',
                    borderRadius: shapes.full,
                  },
                ]}
              >
                <IconComponent
                  size={22}
                  color={isSelected ? colors.onSecondaryContainer : colors.onSurfaceVariant}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: isSelected ? colors.onSurface : colors.onSurfaceVariant,
                    fontFamily: typography.labelSmall.fontFamilySans,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  barContainer: {
    borderTopWidth: 1,
    paddingTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  destinationsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  destinationItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  activeIndicator: {
    width: 64,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
