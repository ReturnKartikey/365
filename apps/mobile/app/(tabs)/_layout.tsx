import React from 'react';
import { Easing } from 'react-native';
import { Tabs } from 'expo-router';
import { M3NavigationBar, TabKey } from '../../src/components/M3NavigationBar';

import { useTheme } from '../../src/theme/ThemeContext';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        lazy: false,
        freezeOnBlur: false,
        animation: 'shift',
        sceneStyle: {
          backgroundColor: colors.background,
        },
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: 120,
            easing: Easing.out(Easing.quad),
          },
        },
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            backgroundColor: colors.background,
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-16, 0, 16],
                }),
              },
            ],
          },
        }),
      }}
      tabBar={({ state, navigation }) => {
        const routeName = state.routes[state.index].name;
        const currentTab: TabKey =
          routeName === 'index' ? 'today' : (routeName as TabKey);

        const handleSelectTab = (tab: TabKey) => {
          const targetName = tab === 'today' ? 'index' : tab;
          navigation.navigate(targetName);
        };

        return (
          <M3NavigationBar
            currentTab={currentTab}
            onSelectTab={handleSelectTab}
          />
        );
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="submit" options={{ title: 'Submit' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
    </Tabs>
  );
}
