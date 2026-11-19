import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';

const SPLASH_BG = '#0E4328';
const WORDMARK_COLOR = '#26C87E';

export function SplashOverlay({ ready }: { ready: boolean }) {
  const [minElapsed, setMinElapsed] = useState(false);
  const [unmounted, setUnmounted] = useState(false);

  const fade = useRef(new Animated.Value(1)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(wordmarkOpacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      setMinElapsed(true);
    }, 950);

    return () => clearTimeout(timer);
  }, [scale, wordmarkOpacity]);

  useEffect(() => {
    if (!ready || !minElapsed) return;

    Animated.timing(fade, {
      toValue: 0,
      duration: 280,
      delay: 80,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setUnmounted(true);
    });
  }, [ready, minElapsed, fade]);

  if (unmounted) return null;

  return (
    <Animated.View
      pointerEvents={ready && minElapsed ? 'none' : 'auto'}
      style={[styles.overlay, { opacity: fade }]}>
      <StatusBar style="light" />
      <Animated.View
        style={{
          opacity: wordmarkOpacity,
          transform: [{ scale }],
        }}>
        <Text style={styles.wordmark}>Solvent</Text>
      </Animated.View>
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
    backgroundColor: SPLASH_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    paddingHorizontal: 32,
  },
  wordmark: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.8,
    color: WORDMARK_COLOR,
  },
});
