import { Slot, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MobileShell } from '@/components/mobile-shell';
import { SplashOverlay } from '@/components/splash-overlay';
import { LedgerProvider, useLedger } from '@/context/ledger-context';
import { ThemeProvider, useAppTheme } from '@/context/theme-context';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const { user, authLoading, loading, error } = useLedger();
  const { C, isDark } = useAppTheme();
  const pathname = usePathname();
  const router = useRouter();

  const ready = !authLoading && (!user || !loading);

  useEffect(() => {
    if (!authLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [authLoading]);

  useEffect(() => {
    if (authLoading) return;
    const onAuthRoute = pathname === '/login' || pathname === '/register';
    if (!user && !onAuthRoute) {
      router.replace('/login');
    } else if (user && onAuthRoute) {
      router.replace('/');
    }
  }, [authLoading, user, pathname, router]);

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {error && !user ? (
        <View style={[styles.errorWrap, { backgroundColor: C.paper }]}>
          <Text style={[styles.errorTitle, { color: C.ink }]}>Database Error</Text>
          <Text style={[styles.errorBody, { color: C.owed }]}>{error}</Text>
        </View>
      ) : (
        <MobileShell>
          <Slot />
        </MobileShell>
      )}
      <SplashOverlay ready={ready} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LedgerProvider>
            <AppContent />
          </LedgerProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  errorBody: {
    fontSize: 13.5,
    textAlign: 'center',
  },
});
