import { Platform, TextStyle } from 'react-native';

/**
 * Fintech Design Token System — Strict 90 / 10 Monochrome & Emerald
 * (with WCAG AA verified contrast and reserved semantic danger token for irreversible/error states).
 *
 * Benchmarks: Wise, Cash App, Mercury, Ramp, Copilot Money, Linear.
 */

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const R = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 20,
  sheet: 20,
  pill: 9999,
} as const;

export const METRICS = {
  screenPad: 20,
  touchMin: 44,
  rowMinHeight: 60,
  buttonHeight: 48,
} as const;

export interface LedgerColors {
  // Core canvas & surface layering
  paper: string;
  surface: string;
  sunken: string;

  // Monochrome ink hierarchy (WCAG AA compliant)
  ink: string;
  ink2: string;
  muted: string;
  faint: string;

  // 1px hairline borders
  line: string;
  lineStrong: string;

  // Semantic states
  owed: string;
  owedSoft: string;
  paid: string;
  paidFill: string;
  paidStrong: string;
  paidSoft: string;
  paidBorder: string;
  partial: string;
  partialSoft: string;
  partialBorder: string;

  // Reserved strictly for irreversible destructive confirmations, validation errors & error toasts
  danger: string;
  dangerSoft: string;
  dangerBorder: string;

  // Contrast on primary ink CTAs & badges
  onInk: string;
  onInkMuted: string;
  onInkFaint: string;
  inkTrack: string;
  inkBorder: string;
  scrim: string;

  // Elevated summary surface tokens
  cardBg: string;
  cardBorder: string;
  cardText: string;
  cardMuted: string;
  cardTrack: string;
  cardPillBg: string;
  cardBarFill: string;

  // Chime-inspired deep forest hero & soft mint highlight tokens
  heroBg: string;
  heroGradient: string;
  heroText: string;
  heroMuted: string;
  heroAccent: string;
  heroPillBg: string;
  heroPillBorder: string;
  forestInk: string;
  mintCardBg: string;
  mintCardBorder: string;
  mintCardInk: string;
  mintBadgeBg: string;
  mintBadgeIcon: string;
}

export interface AvatarTint {
  bg: string;
  border: string;
  text: string;
}

export const LIGHT_COLORS: LedgerColors = {
  paper: '#FAFAFA',
  surface: '#FFFFFF',
  sunken: '#F4F4F5',
  ink: '#09090B',
  ink2: '#52525B',
  muted: '#52525B',
  faint: '#71717A', // 4.6:1 on #FFFFFF (WCAG AA)
  line: '#E4E4E7',
  lineStrong: '#D4D4D8',

  owed: '#09090B',
  owedSoft: '#F4F4F5',
  paid: '#059669', // Emerald text on light/soft surfaces
  paidFill: '#10B981', // Non-text progress bars & status dots
  paidStrong: '#047857', // 5.48:1 with #FFFFFF text/icons (WCAG AA)
  paidSoft: '#ECFDF5',
  paidBorder: '#A7F3D0',
  partial: '#52525B',
  partialSoft: '#F4F4F5',
  partialBorder: '#E4E4E7',

  danger: '#DC2626', // 4.83:1 on #FFFFFF / with #FFFFFF (WCAG AA)
  dangerSoft: '#FEF2F2',
  dangerBorder: '#FECACA',

  onInk: '#FFFFFF',
  onInkMuted: 'rgba(255, 255, 255, 0.76)',
  onInkFaint: 'rgba(255, 255, 255, 0.48)',
  inkTrack: '#27272A',
  inkBorder: '#27272A',
  scrim: 'rgba(9, 9, 11, 0.44)',

  cardBg: '#FFFFFF',
  cardBorder: '#E4E4E7',
  cardText: '#09090B',
  cardMuted: '#52525B',
  cardTrack: '#F4F4F5',
  cardPillBg: '#F4F4F5',
  cardBarFill: '#10B981',

  heroBg: '#0B3522',
  heroGradient: 'linear-gradient(140deg, #102B1E 0%, #0D4D2E 45%, #12663D 74%, #0A3721 100%)',
  heroText: '#FFFFFF',
  heroMuted: 'rgba(255, 255, 255, 0.78)',
  heroAccent: '#34D399',
  heroPillBg: 'rgba(16, 185, 129, 0.14)',
  heroPillBorder: '#34D399',
  forestInk: '#0B3522',
  mintCardBg: '#C8F1E3',
  mintCardBorder: '#A7E6D0',
  mintCardInk: '#092B1B',
  mintBadgeBg: '#0B3522',
  mintBadgeIcon: '#34D399',
};

export const DARK_COLORS: LedgerColors = {
  paper: '#09090B',
  surface: '#111113',
  sunken: '#18181B',
  ink: '#FAFAFA',
  ink2: '#D4D4D8',
  muted: '#A1A1AA', // 7.5:1 on #111113 (WCAG AA/AAA)
  faint: '#71717A', // 4.1:1 on #111113 (UI icon AA)
  line: '#27272A',
  lineStrong: '#3F3F46',

  owed: '#FAFAFA',
  owedSoft: '#18181B',
  paid: '#34D399', // High-contrast emerald text on obsidian
  paidFill: '#10B981',
  paidStrong: '#047857',
  paidSoft: '#052E1F',
  paidBorder: '#065F46',
  partial: '#A1A1AA',
  partialSoft: '#18181B',
  partialBorder: '#27272A',

  danger: '#F87171',
  dangerSoft: '#2A1215',
  dangerBorder: '#5C1F26',

  onInk: '#09090B',
  onInkMuted: 'rgba(9, 9, 11, 0.72)',
  onInkFaint: 'rgba(9, 9, 11, 0.44)',
  inkTrack: '#27272A',
  inkBorder: '#3F3F46',
  scrim: 'rgba(0, 0, 0, 0.72)',

  cardBg: '#111113',
  cardBorder: '#27272A',
  cardText: '#FAFAFA',
  cardMuted: '#A1A1AA',
  cardTrack: '#27272A',
  cardPillBg: '#18181B',
  cardBarFill: '#10B981',

  heroBg: '#072417',
  heroGradient: 'linear-gradient(140deg, #071911 0%, #0A3822 48%, #0E4D2F 76%, #061D12 100%)',
  heroText: '#FFFFFF',
  heroMuted: 'rgba(255, 255, 255, 0.76)',
  heroAccent: '#34D399',
  heroPillBg: 'rgba(52, 211, 153, 0.14)',
  heroPillBorder: '#34D399',
  forestInk: '#FAFAFA',
  mintCardBg: '#0C2B1E',
  mintCardBorder: '#164E37',
  mintCardInk: '#ECFDF5',
  mintBadgeBg: '#061A11',
  mintBadgeIcon: '#34D399',
};

/**
 * Monochrome neutral monogram surfaces — zero pastel circles.
 */
export const AVATAR_TINTS_LIGHT: AvatarTint[] = [
  { bg: '#F4F4F5', border: '#E4E4E7', text: '#09090B' },
];

export const AVATAR_TINTS_DARK: AvatarTint[] = [
  { bg: '#18181B', border: '#27272A', text: '#FAFAFA' },
];

export function pickAvatarTint(_seed: string, tints: AvatarTint[]): AvatarTint {
  return tints[0];
}

export const C = LIGHT_COLORS;

export const MonoFont = Platform.select({
  ios: 'ui-monospace',
  android: 'monospace',
  default: 'monospace',
});

export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export function makeTypography(colors: LedgerColors) {
  return {
    display: {
      fontSize: 44,
      fontWeight: '700',
      letterSpacing: -1.32,
      color: colors.ink,
      ...tabular,
    } as TextStyle,
    title: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.84,
      color: colors.ink,
    } as TextStyle,
    heading: {
      fontSize: 17,
      fontWeight: '600',
      letterSpacing: -0.4,
      color: colors.ink,
    } as TextStyle,
    body: {
      fontSize: 15,
      fontWeight: '400',
      color: colors.ink,
    } as TextStyle,
    bodyStrong: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.ink,
      letterSpacing: -0.2,
    } as TextStyle,
    small: {
      fontSize: 13,
      fontWeight: '400',
      color: colors.muted,
    } as TextStyle,
    micro: {
      fontSize: 11.5,
      fontWeight: '600',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.muted,
    } as TextStyle,
    amount: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.ink,
      letterSpacing: -0.3,
      ...tabular,
    } as TextStyle,
  };
}

export type LedgerTypography = ReturnType<typeof makeTypography>;

export const T = makeTypography(LIGHT_COLORS);

export const bottomSafePad = Platform.OS === 'ios' ? 28 : 20;
