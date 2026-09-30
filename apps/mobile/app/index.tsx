import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/services/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F1115', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#C67D5A" size="large" />
      </View>
    );
  }

  // If user is signed in (or guest session active), go straight to Today's ritual; else show Welcome
  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/welcome" />;
}
