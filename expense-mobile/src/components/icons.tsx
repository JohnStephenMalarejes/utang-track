import React from 'react';
import { View } from 'react-native';
import { C } from '@/design/tokens';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function IconPlus({ size = 16, color = C.ink, strokeWidth = 2 }: IconProps) {
  const len = size * 0.65;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: len,
          height: strokeWidth,
          backgroundColor: color,
          borderRadius: strokeWidth / 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: strokeWidth,
          height: len,
          backgroundColor: color,
          borderRadius: strokeWidth / 2,
        }}
      />
    </View>
  );
}

export function IconClose({ size = 14, color = C.ink, strokeWidth = 1.8 }: IconProps) {
  const len = size * 0.72;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: len,
          height: strokeWidth,
          backgroundColor: color,
          borderRadius: strokeWidth / 2,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: len,
          height: strokeWidth,
          backgroundColor: color,
          borderRadius: strokeWidth / 2,
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  );
}

export function IconChevronRight({ size = 14, color = C.faint, strokeWidth = 1.75 }: IconProps) {
  const arm = size * 0.44;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: arm,
          height: arm,
          borderTopWidth: strokeWidth,
          borderRightWidth: strokeWidth,
          borderColor: color,
          transform: [{ rotate: '45deg' }, { translateX: -1.5 }, { translateY: 1.5 }],
        }}
      />
    </View>
  );
}

export function IconChevronLeft({ size = 16, color = C.ink, strokeWidth = 2 }: IconProps) {
  const arm = size * 0.44;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: arm,
          height: arm,
          borderBottomWidth: strokeWidth,
          borderLeftWidth: strokeWidth,
          borderColor: color,
          transform: [{ rotate: '45deg' }, { translateX: 1.5 }, { translateY: -1.5 }],
        }}
      />
    </View>
  );
}

export function IconSearch({ size = 16, color = C.muted, strokeWidth = 1.7 }: IconProps) {
  const circle = size * 0.62;
  const handle = size * 0.34;
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.08,
          left: size * 0.08,
          width: circle,
          height: circle,
          borderRadius: circle / 2,
          borderWidth: strokeWidth,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.14,
          right: size * 0.08,
          width: handle,
          height: strokeWidth,
          backgroundColor: color,
          borderRadius: strokeWidth / 2,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

export function IconFilter({ size = 16, color = C.ink }: IconProps) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'space-evenly', paddingVertical: 1 }}>
      <View style={{ height: 1.6, width: size * 0.88, backgroundColor: color, borderRadius: 1, alignSelf: 'center' }} />
      <View style={{ height: 1.6, width: size * 0.58, backgroundColor: color, borderRadius: 1, alignSelf: 'center' }} />
      <View style={{ height: 1.6, width: size * 0.3, backgroundColor: color, borderRadius: 1, alignSelf: 'center' }} />
    </View>
  );
}

export function IconCheck({ size = 14, color = C.surface, strokeWidth = 2 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.56,
          height: size * 0.32,
          borderLeftWidth: strokeWidth,
          borderBottomWidth: strokeWidth,
          borderColor: color,
          transform: [{ rotate: '-45deg' }, { translateY: -1 }],
        }}
      />
    </View>
  );
}

export function IconArrowUpRight({ size = 13, color = C.ink, strokeWidth = 1.7 }: IconProps) {
  const head = size * 0.48;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.14,
          right: size * 0.14,
          width: head,
          height: head,
          borderTopWidth: strokeWidth,
          borderRightWidth: strokeWidth,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.7,
          height: strokeWidth,
          backgroundColor: color,
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  );
}

export function IconMore({ size = 16, color = C.muted }: IconProps) {
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2.5 }}>
      <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
      <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
      <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
    </View>
  );
}

export function IconChart({ size = 17, color = C.ink }: IconProps) {
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2.2, paddingBottom: 2 }}>
      <View style={{ width: 2.4, height: size * 0.38, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 2.4, height: size * 0.72, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 2.4, height: size * 0.54, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

export function IconHome({ size = 18, color = C.ink }: IconProps) {
  const stroke = 1.65;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.52,
          height: size * 0.52,
          borderTopWidth: stroke,
          borderLeftWidth: stroke,
          borderColor: color,
          transform: [{ rotate: '45deg' }, { translateY: 2.5 }, { translateX: 2.5 }],
        }}
      />
      <View
        style={{
          width: size * 0.62,
          height: size * 0.38,
          borderLeftWidth: stroke,
          borderRightWidth: stroke,
          borderBottomWidth: stroke,
          borderColor: color,
          marginTop: -size * 0.16,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
        }}
      />
    </View>
  );
}

export function IconReceipt({ size = 18, color = C.ink }: IconProps) {
  const stroke = 1.6;
  return (
    <View
      style={{
        width: size * 0.68,
        height: size * 0.8,
        borderWidth: stroke,
        borderColor: color,
        borderRadius: 2.5,
        justifyContent: 'space-evenly',
        paddingHorizontal: 2.5,
        paddingVertical: 2,
      }}>
      <View style={{ height: 1.4, backgroundColor: color, width: '100%' }} />
      <View style={{ height: 1.4, backgroundColor: color, width: '75%' }} />
      <View style={{ height: 1.4, backgroundColor: color, width: '55%' }} />
    </View>
  );
}

export function IconWallet({ size = 18, color = C.ink }: IconProps) {
  const stroke = 1.6;
  return (
    <View
      style={{
        width: size * 0.82,
        height: size * 0.62,
        borderWidth: stroke,
        borderColor: color,
        borderRadius: 3,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 2.5,
      }}>
      <View style={{ width: 3.5, height: 3.5, borderRadius: 1.75, backgroundColor: color }} />
    </View>
  );
}

export function IconUsers({ size = 18, color = C.ink }: IconProps) {
  const stroke = 1.6;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
      <View
        style={{
          width: size * 0.34,
          height: size * 0.34,
          borderRadius: size * 0.17,
          borderWidth: stroke,
          borderColor: color,
        }}
      />
      <View
        style={{
          width: size * 0.68,
          height: size * 0.28,
          borderTopLeftRadius: size * 0.25,
          borderTopRightRadius: size * 0.25,
          borderTopWidth: stroke,
          borderLeftWidth: stroke,
          borderRightWidth: stroke,
          borderColor: color,
        }}
      />
    </View>
  );
}

export function IconSettings({ size = 16, color = C.ink }: IconProps) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'space-evenly', paddingVertical: 1.5 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ width: size * 0.52, height: 1.6, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: 4, height: 4, borderRadius: 2, borderWidth: 1.5, borderColor: color }} />
        <View style={{ width: size * 0.16, height: 1.6, backgroundColor: color, borderRadius: 1 }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ width: size * 0.16, height: 1.6, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: 4, height: 4, borderRadius: 2, borderWidth: 1.5, borderColor: color }} />
        <View style={{ width: size * 0.52, height: 1.6, backgroundColor: color, borderRadius: 1 }} />
      </View>
    </View>
  );
}

export function IconCalendar({ size = 16, color = C.ink }: IconProps) {
  const stroke = 1.55;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.84,
          height: size * 0.78,
          borderWidth: stroke,
          borderColor: color,
          borderRadius: 2.5,
          overflow: 'hidden',
        }}>
        <View style={{ height: size * 0.24, borderBottomWidth: stroke, borderBottomColor: color }} />
      </View>
      <View
        style={{
          position: 'absolute',
          top: 0.5,
          left: size * 0.28,
          width: stroke,
          height: size * 0.2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 0.5,
          right: size * 0.28,
          width: stroke,
          height: size * 0.2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export function IconChevronDown({ size = 12, color = C.ink, strokeWidth = 1.75 }: IconProps) {
  const arm = size * 0.45;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: arm,
          height: arm,
          borderBottomWidth: strokeWidth,
          borderRightWidth: strokeWidth,
          borderColor: color,
          transform: [{ rotate: '45deg' }, { translateY: -1.5 }, { translateX: -1.5 }],
        }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Category Monochrome Line Icons                                      */
/* ------------------------------------------------------------------ */

/** Breakfast — minimalist coffee mug */
export function IconBreakfast({ size = 16, color = C.ink, strokeWidth = 1.55 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Steam lines */}
      <View style={{ flexDirection: 'row', gap: 2.5, marginBottom: 1.5, marginRight: 2 }}>
        <View style={{ width: strokeWidth, height: size * 0.16, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: strokeWidth, height: size * 0.2, backgroundColor: color, borderRadius: 1 }} />
      </View>
      {/* Cup + handle */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: size * 0.56,
            height: size * 0.44,
            borderWidth: strokeWidth,
            borderColor: color,
            borderBottomLeftRadius: size * 0.18,
            borderBottomRightRadius: size * 0.18,
            borderTopLeftRadius: 1.5,
            borderTopRightRadius: 1.5,
          }}
        />
        <View
          style={{
            width: size * 0.2,
            height: size * 0.24,
            borderWidth: strokeWidth,
            borderLeftWidth: 0,
            borderColor: color,
            borderTopRightRadius: size * 0.12,
            borderBottomRightRadius: size * 0.12,
            marginLeft: -strokeWidth,
            marginBottom: 2,
          }}
        />
      </View>
    </View>
  );
}

/** Lunch — clean bowl with lid / horizon */
export function IconLunch({ size = 16, color = C.ink, strokeWidth = 1.55 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.78, height: strokeWidth, backgroundColor: color, borderRadius: 1, marginBottom: 1 }} />
      <View
        style={{
          width: size * 0.72,
          height: size * 0.42,
          borderWidth: strokeWidth,
          borderTopWidth: 0,
          borderColor: color,
          borderBottomLeftRadius: size * 0.36,
          borderBottomRightRadius: size * 0.36,
        }}
      />
      <View style={{ width: size * 0.36, height: strokeWidth, backgroundColor: color, borderRadius: 1, marginTop: 1.5 }} />
    </View>
  );
}

/** Dinner — covered cloche / dome plate */
export function IconDinner({ size = 16, color = C.ink, strokeWidth = 1.55 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.18,
          height: size * 0.14,
          borderRadius: size * 0.09,
          backgroundColor: color,
          marginBottom: -1,
        }}
      />
      <View
        style={{
          width: size * 0.72,
          height: size * 0.42,
          borderWidth: strokeWidth,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: size * 0.36,
          borderTopRightRadius: size * 0.36,
        }}
      />
      <View style={{ width: size * 0.86, height: strokeWidth, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

/** Snack — minimal pastry / cookie circle with crumb dots */
export function IconSnack({ size = 16, color = C.ink, strokeWidth = 1.55 }: IconProps) {
  const d = size * 0.72;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: d,
          height: d,
          borderRadius: d / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          position: 'relative',
        }}>
        <View style={{ position: 'absolute', top: 2.5, left: 3, width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
        <View style={{ position: 'absolute', bottom: 2.5, left: 4.5, width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
        <View style={{ position: 'absolute', top: 4.5, right: 2.5, width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
      </View>
    </View>
  );
}

/** Pre-workout — geometric dumbbell */
export function IconPreWorkout({ size = 16, color = C.ink, strokeWidth = 1.6 }: IconProps) {
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 2.2, height: size * 0.36, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 2.4, height: size * 0.58, backgroundColor: color, borderRadius: 1, marginLeft: 1.5 }} />
      <View style={{ width: size * 0.32, height: strokeWidth, backgroundColor: color }} />
      <View style={{ width: 2.4, height: size * 0.58, backgroundColor: color, borderRadius: 1, marginRight: 1.5 }} />
      <View style={{ width: 2.2, height: size * 0.36, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

/** Other — crisp minimal diamond tag */
export function IconOtherCategory({ size = 16, color = C.ink, strokeWidth = 1.55 }: IconProps) {
  const s = size * 0.54;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: s,
          height: s,
          borderWidth: strokeWidth,
          borderColor: color,
          borderRadius: 2,
          transform: [{ rotate: '45deg' }],
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View style={{ width: 2.2, height: 2.2, borderRadius: 1.1, backgroundColor: color }} />
      </View>
    </View>
  );
}

/** Trash — minimal delete bin for swipe actions */
export function IconTrash({ size = 15, color = C.ink, strokeWidth = 1.55 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.32, height: strokeWidth, backgroundColor: color, borderRadius: 1, marginBottom: 1.5 }} />
      <View style={{ width: size * 0.74, height: strokeWidth, backgroundColor: color, borderRadius: 1, marginBottom: 1 }} />
      <View
        style={{
          width: size * 0.56,
          height: size * 0.52,
          borderWidth: strokeWidth,
          borderTopWidth: 0,
          borderColor: color,
          borderBottomLeftRadius: 2.5,
          borderBottomRightRadius: 2.5,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-evenly',
          paddingVertical: 1.5,
        }}>
        <View style={{ width: 1.2, height: '75%', backgroundColor: color }} />
        <View style={{ width: 1.2, height: '75%', backgroundColor: color }} />
      </View>
    </View>
  );
}

/** Sun — light theme icon */
export function IconSun({ size = 14, color = C.ink, strokeWidth = 1.5 }: IconProps) {
  const core = size * 0.44;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: core,
          height: core,
          borderRadius: core / 2,
          borderWidth: strokeWidth,
          borderColor: color,
        }}
      />
      {[0, 45, 90, 135].map((deg) => (
        <View
          key={deg}
          style={{
            position: 'absolute',
            width: size * 0.9,
            height: strokeWidth,
            flexDirection: 'row',
            justifyContent: 'space-between',
            transform: [{ rotate: `${deg}deg` }],
          }}>
          <View style={{ width: 2, height: strokeWidth, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 2, height: strokeWidth, backgroundColor: color, borderRadius: 1 }} />
        </View>
      ))}
    </View>
  );
}

/** Moon — dark theme icon */
export function IconMoon({ size = 14, color = C.ink, strokeWidth = 1.5 }: IconProps) {
  const d = size * 0.68;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: d,
          height: d,
          borderRadius: d / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: 'transparent',
          borderRightColor: 'transparent',
          transform: [{ rotate: '25deg' }],
        }}
      />
    </View>
  );
}
