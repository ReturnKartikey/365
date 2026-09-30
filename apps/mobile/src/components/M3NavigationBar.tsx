import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { Disc3, Plus, History, LucideIcon } from 'lucide-react-native';

export type TabKey = 'today' | 'submit' | 'history';

interface M3NavigationBarProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

interface NavItemProps {
  tabKey: TabKey;
  label: string;
  icon: LucideIcon;
  isSelected: boolean;
  onPress: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const M3NavItem: React.FC<NavItemProps> = ({ label, icon: IconComponent, isSelected, onPress }) => {
  const { colors, shapes, typography } = useTheme();

  // Material You pill animation values
  const indicatorScaleX = useSharedValue(isSelected ? 1 : 0.4);
  const indicatorOpacity = useSharedValue(isSelected ? 1 : 0);
  const iconScale = useSharedValue(isSelected ? 1 : 0.94);
  const itemPressScale = useSharedValue(1);

  useEffect(() => {
    if (isSelected) {
      indicatorScaleX.value = withSpring(1, { damping: 14, stiffness: 180 });
      indicatorOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
      iconScale.value = withSpring(1.08, { damping: 12, stiffness: 220 });
    } else {
      indicatorScaleX.value = withTiming(0.4, { duration: 150 });
      indicatorOpacity.value = withTiming(0, { duration: 150 });
      iconScale.value = withTiming(0.94, { duration: 150 });
    }
  }, [isSelected]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    transform: [{ scaleX: indicatorScaleX.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value * itemPressScale.value }],
  }));

  const handlePressIn = () => {
    itemPressScale.value = withSpring(0.92, { damping: 10, stiffness: 300 });
  };

  const handlePressOut = () => {
    itemPressScale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.88}
      style={styles.destinationItem}
    >
      <View style={styles.indicatorContainer}>
        {/* Animated Material You Pill */}
        <Animated.View
          style={[
            styles.activeIndicator,
            {
              backgroundColor: colors.secondaryContainer,
              borderRadius: shapes.full,
            },
            animatedIndicatorStyle,
          ]}
        />

        {/* Icon with spring animation */}
        <Animated.View style={[styles.iconLayer, animatedIconStyle]}>
          <IconComponent
            size={22}
            color={isSelected ? colors.onSecondaryContainer : colors.onSurfaceVariant}
          />
        </Animated.View>
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
        {label}
      </Text>
    </AnimatedTouchable>
  );
};

export const M3NavigationBar: React.FC<M3NavigationBarProps> = ({ currentTab, onSelectTab }) => {
  const { colors } = useTheme();
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
        {tabs.map((tab) => (
          <M3NavItem
            key={tab.key}
            tabKey={tab.key}
            label={tab.label}
            icon={tab.icon}
            isSelected={currentTab === tab.key}
            onPress={() => onSelectTab(tab.key)}
          />
        ))}
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
  indicatorContainer: {
    width: 64,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 4,
  },
  activeIndicator: {
    position: 'absolute',
    width: 64,
    height: 32,
  },
  iconLayer: {
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
