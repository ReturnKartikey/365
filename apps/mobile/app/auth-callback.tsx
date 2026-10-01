import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthCallbackScreen() {
  const [deepLink, setDeepLink] = useState<string>('');
  const [redirected, setRedirected] = useState<boolean>(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const targetScheme = 'exp://192.168.1.36:8081/--/auth/callback';
      const fullLink = targetScheme + search + hash;
      setDeepLink(fullLink);

      // Attempt automatic redirect after slight delay
      const timer = setTimeout(() => {
        try {
          window.location.href = fullLink;
          setRedirected(true);
        } catch (e) {
          console.warn('Auto redirect failed, awaiting manual user tap:', e);
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleManualOpen = () => {
    if (typeof window !== 'undefined' && deepLink) {
      window.location.href = deepLink;
      setRedirected(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brandTitle}>365</Text>
        <Text style={styles.headline}>Authentication Successful</Text>
        <Text style={styles.subtitle}>
          Your Google account has been verified. Tap below to return to the 365 app.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleManualOpen} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Open 365 App</Text>
        </TouchableOpacity>

        {redirected && (
          <Text style={styles.statusText}>Opening the 365 app in Expo Go...</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1E1E1E',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  brandTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#D4A373',
    marginBottom: 16,
    fontFamily: 'serif',
  },
  headline: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F8F5EE',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#A8A29E',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#D4A373',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 100,
    width: '100%',
    alignItems: 'center',
    elevation: 3,
  },
  buttonText: {
    color: '#1A1816',
    fontSize: 16,
    fontWeight: '700',
  },
  statusText: {
    marginTop: 16,
    fontSize: 13,
    color: '#86EFAC',
  },
});
