import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../src/services/supabase';
import queryString from 'query-string';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const processAuth = async () => {
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const hash = window.location.hash || '';
          const search = window.location.search || '';

          const hashParams = queryString.parse(hash.replace(/^#/, ''));
          const searchParams = queryString.parse(search.replace(/^\?/, ''));

          // Case 1: Implicit grant with hash tokens
          if (hashParams.access_token && hashParams.refresh_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token: hashParams.access_token as string,
              refresh_token: hashParams.refresh_token as string,
            });

            if (error) throw error;
            if (isMounted) {
              setStatus('success');
              router.replace('/(tabs)');
            }
            return;
          }

          // Case 2: PKCE authorization code grant
          if (searchParams.code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(
              searchParams.code as string
            );

            if (error) throw error;
            if (isMounted) {
              setStatus('success');
              router.replace('/(tabs)');
            }
            return;
          }
        }

        // Case 3: Check existing session or fallback
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          setStatus('success');
          router.replace('/(tabs)');
        } else {
          // No tokens found, wait briefly and redirect to welcome
          setTimeout(() => {
            if (isMounted) router.replace('/welcome');
          }, 1200);
        }
      } catch (err: any) {
        console.error('[AuthCallback] Error completing authentication:', err);
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err?.message || 'Authentication verification failed.');
        }
      }
    };

    processAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brandTitle}>365</Text>

        {status === 'verifying' && (
          <>
            <ActivityIndicator size="large" color="#D4A373" style={{ marginBottom: 20 }} />
            <Text style={styles.headline}>Signing You In...</Text>
            <Text style={styles.subtitle}>
              Verifying your Google credentials with 365. Just a moment.
            </Text>
          </>
        )}

        {status === 'success' && (
          <>
            <Text style={styles.headline}>Welcome to 365</Text>
            <Text style={styles.subtitle}>
              Authentication successful! Entering today's listening ritual...
            </Text>
          </>
        )}

        {status === 'error' && (
          <>
            <Text style={[styles.headline, { color: '#F87171' }]}>Sign-In Failed</Text>
            <Text style={styles.subtitle}>
              {errorMessage || 'Unable to complete sign-in. Please try again.'}
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace('/welcome')}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>Return to Sign In</Text>
            </TouchableOpacity>
          </>
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
    marginBottom: 20,
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
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#D4A373',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 9999,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1412',
  },
});
