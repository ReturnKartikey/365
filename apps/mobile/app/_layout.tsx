import 'react-native-gesture-handler';
import React, { Component, ErrorInfo } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { AuthProvider } from '../src/services/AuthContext';
import { NotificationService } from '../src/services/NotificationService';

class RootErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RootErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#121316', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#E8A282', fontSize: 24, fontWeight: '700', marginBottom: 12 }}>365</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
            Something went wrong during launch.
          </Text>
          <Text style={{ color: '#A09FA0', fontSize: 12, textAlign: 'center', marginBottom: 24 }}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#C67D5A', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function RootNav() {
  const { colors, isDark } = useTheme();

  React.useEffect(() => {
    NotificationService.initialize().catch(console.warn);
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="share/[dayNumber]"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    'NType82-Regular': require('../assets/fonts/NType82-Regular.otf'),
    'NType82-Headline': require('../assets/fonts/NType82-Headline.otf'),
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#121316', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#C67D5A" size="large" />
      </View>
    );
  }

  return (
    <RootErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#121316' }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <RootNav />
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </RootErrorBoundary>
  );
}
