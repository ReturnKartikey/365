import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/services/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import WelcomeScreen from './welcome';

export default function Index() {
  const { user, isLoading } = useAuth();

  React.useEffect(() => {
    try {
      const { NativeModules } = require('react-native');
      console.log('ALL_EXPO_MODULES:', JSON.stringify(Object.keys((globalThis as any).expo?.modules || {})));
      console.log('ALL_RN_MODULES:', JSON.stringify(Object.keys(NativeModules || {})));
    } catch (e) {
      console.log('PROBE_ERROR:', e);
    }
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#121316', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#C67D5A" size="large" />
      </View>
    );
  }

  // If user is signed in (or guest session active), go straight to Today's ritual; else show Welcome directly
  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <WelcomeScreen />;
}
