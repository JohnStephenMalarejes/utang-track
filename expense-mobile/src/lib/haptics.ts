import { Platform, Vibration } from 'react-native';

/**
 * Lightweight, safe tactile feedback helper.
 * Uses subtle short pulses on Android and no-ops cleanly on iOS/Web
 * (avoids iOS's harsh fixed 400ms Vibration fallback).
 */
export function hapticLight() {
  if (Platform.OS === 'android') {
    try {
      Vibration.vibrate(10);
    } catch {
      // ignore if permission/hardware unavailable
    }
  }
}

export function hapticSuccess() {
  if (Platform.OS === 'android') {
    try {
      Vibration.vibrate(16);
    } catch {
      // ignore
    }
  }
}

export function hapticWarning() {
  if (Platform.OS === 'android') {
    try {
      Vibration.vibrate([0, 14, 40, 14]);
    } catch {
      // ignore
    }
  }
}
