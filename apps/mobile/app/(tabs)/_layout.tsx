import React from 'react';
import { Tabs } from 'expo-router';
import { M3NavigationBar, TabKey } from '../../src/components/M3NavigationBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
