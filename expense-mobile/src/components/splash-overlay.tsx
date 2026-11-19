import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/context/theme-context';
import { R } from '@/design/tokens';

export function SplashOverlay({ ready }: { ready: boolean }) {
  const { C, T } = useAppTheme();
  const [minElapsed, setMinElapsed] = useState(false);
  const [unmounted, setUnmounted] = useState(false);

  const fade = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 0.85,
        duration: 850,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();

    const timer = setTimeout(() => {
      setMinElapsed(true);
    }, 950);

    return () => clearTimeout(timer);
  }, [scale, progress]);

  useEffect(() => {
    if (!ready || !minElapsed) return;

    Animated.timing(progress, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();

    Animated.timing(fade, {
      toValue: 0,
      duration: 280,
      delay: 80,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setUnmounted(true);
    });
  }, [ready, minElapsed, fade, progress]);

  if (unmounted) return null;

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      pointerEvents={ready && minElapsed ? 'none' : 'auto'}
      style={[styles.overlay, { backgroundColor: C.paper, opacity: fade }]}>
      <Animated.View style={[styles.centerBlock, { transform: [{ scale }] }]}>
        <View
          style={[
            styles.logoTile,
            { backgroundColor: '#FFFFFF', borderColor: C.line },
          ]}>
          <Image
            source={require('@/assets/images/logo-mark.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        <Text style={[styles.wordmark, { color: C.ink }]}>
          debt<Text style={[styles.wordmarkLight, { color: C.muted }]}> tracker</Text>
        </Text>
        <Text style={[T.micro, { marginTop: 6 }]}>Shared Expense Ledger</Text>
      </Animated.View>

      <View style={styles.bottomFooter}>
        <View style={[styles.progressTrack, { backgroundColor: C.sunken }]}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: C.ink, width: progressWidth },
            ]}
          />
        </View>
        <Text style={[styles.footerCaption, { color: C.faint }]}>Local SQLite · PHP (₱)</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    paddingHorizontal: 32,
  },
  centerBlock: {
    alignItems: 'center',
  },
  logoTile: {
    width: 72,
    height: 72,
    borderRadius: R.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  logo: {
    width: 44,
    height: 44,
  },
  wordmark: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.9,
  },
  wordmarkLight: {
    fontWeight: '400',
  },
  bottomFooter: {
    position: 'absolute',
    bottom: 48,
    width: 168,
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    width: '100%',
    height: 2.5,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  footerCaption: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
});
