import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useAppTheme } from '@/context/theme-context';
import { hapticLight } from '@/lib/haptics';

const ACTION_WIDTH = 92;
const FULL_SWIPE_THRESHOLD = 148;

interface SwipeableRowProps {
  children: React.ReactNode;
  actionLabel: string;
  actionTone: 'paid' | 'owed';
  actionIcon?: React.ReactNode;
  onAction: () => void;
  disabled?: boolean;
}

/**
 * Horizontal left-swipe row built on react-native-gesture-handler + Reanimated.
 * Configured with activeOffsetX + failOffsetY so vertical ScrollView gestures stay effortless.
 */
export function SwipeableRow({
  children,
  actionLabel,
  actionTone,
  actionIcon,
  onAction,
  disabled = false,
}: SwipeableRowProps) {
  const { C } = useAppTheme();
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const actionBg = actionTone === 'paid' ? C.paid : C.owed;

  const triggerAction = () => {
    hapticLight();
    onAction();
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-14, 14])
    .failOffsetY([-10, 10])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;
      // Clamp between -FULL_SWIPE_THRESHOLD - 24 and 0
      translateX.value = Math.max(-(FULL_SWIPE_THRESHOLD + 24), Math.min(0, next));
    })
    .onEnd((e) => {
      const projected = translateX.value + e.velocityX * 0.08;
      if (projected <= -FULL_SWIPE_THRESHOLD) {
        translateX.value = withSpring(0, { damping: 20, stiffness: 220 });
        runOnJS(triggerAction)();
      } else if (projected <= -ACTION_WIDTH * 0.45) {
        translateX.value = withSpring(-ACTION_WIDTH, { damping: 20, stiffness: 240 });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 240 });
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const actionStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, Math.abs(translateX.value) / ACTION_WIDTH);
    return {
      opacity: 0.45 + progress * 0.55,
    };
  });

  function handleActionPress() {
    translateX.value = withSpring(0, { damping: 20, stiffness: 240 });
    triggerAction();
  }

  return (
    <View style={[styles.container, { backgroundColor: actionBg }]}>
      <Animated.View style={[styles.actionRail, actionStyle]}>
        <Pressable
          accessibilityLabel={actionLabel}
          onPress={handleActionPress}
          style={[styles.actionBtn, { width: ACTION_WIDTH }]}>
          {actionIcon}
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[{ backgroundColor: C.surface }, rowStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  actionRail: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
