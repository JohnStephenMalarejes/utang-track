import { Platform, TextStyle } from 'react-native';

/**
 * Design tokens — "Ledger" direction (Light & Night Ledger).
 * Warm paper, near-black ink, hairline rules and tabular figures.
 * Colour is reserved for meaning: brick = owed, green = paid, ochre = partial.
 */
export interface LedgerColors {
  paper: string;
  surface: string;
  sunken: string;
  ink: string;
  ink2: string;
  muted: string;
  faint: string;
  line: string;
  lineStrong: string;

  owed: string;
  owedSoft: string;
  paid: string;
  paidSoft: string;
  partial: string;
  partialSoft: string;
  partialBorder: string;

  onInk: string;
  onInkMuted: string;
  onInkFaint: string;
  inkTrack: string;
  inkBorder: string;
  scrim: string;

  // Elevated dark focal statement cards (stay deep obsidian in both themes)
  cardBg: string;
  cardBorder: string;
  cardText: string;
  cardMuted: string;
  cardTrack: string;
  cardPillBg: string;
  cardBarFill: string;
}

export interface AvatarTint {
  bg: string;
  border: string;
  text: string;
}

export const LIGHT_COLORS: LedgerColors = {
  paper: '#F6F4EF',
  surface: '#FFFFFF',
  sunken: '#EDEAE2',
  ink: '#141310',
  ink2: '#3A3830',
  muted: '#747067',
  faint: '#A6A196',
  line: '#E5E1D8',
  lineStrong: '#D0CBBF',

  owed: '#B83B1D',
  owedSoft: '#F7E4DF',
  paid: '#1E6B4B',
  paidSoft: '#DFEFE7',
  partial: '#9E630B',
  partialSoft: '#F5E9D3',
  partialBorder: '#E5CE9E',

  onInk: '#F6F4EF',
  onInkMuted: 'rgba(246, 244, 239, 0.62)',
  onInkFaint: 'rgba(246, 244, 239, 0.35)',
  inkTrack: '#2D2B24',
  inkBorder: '#27251F',
  scrim: 'rgba(20, 19, 16, 0.46)',

  cardBg: '#141310',
  cardBorder: '#27251F',
  cardText: '#F6F4EF',
  cardMuted: 'rgba(246, 244, 239, 0.64)',
  cardTrack: '#2D2B24',
  cardPillBg: '#26241E',
  cardBarFill: '#4EB384',
};

export const DARK_COLORS: LedgerColors = {
  paper: '#12110F',
  surface: '#1B1A17',
  sunken: '#26241F',
  ink: '#F2EFE8',
  ink2: '#CCC7BC',
  muted: '#969084',
  faint: '#6B665D',
  line: '#2D2B26',
  lineStrong: '#403D36',

  owed: '#E56A4C',
  owedSoft: '#351F1A',
  paid: '#4EB384',
  paidSoft: '#162C22',
  partial: '#E5A23C',
  partialSoft: '#312615',
  partialBorder: '#574323',

  onInk: '#141310',
  onInkMuted: 'rgba(20, 19, 16, 0.66)',
  onInkFaint: 'rgba(20, 19, 16, 0.38)',
  inkTrack: '#34312A',
  inkBorder: '#3B3830',
  scrim: 'rgba(0, 0, 0, 0.68)',

  cardBg: '#23211C',
  cardBorder: '#3A372F',
  cardText: '#F4F1EA',
  cardMuted: 'rgba(244, 241, 234, 0.64)',
  cardTrack: '#36332C',
  cardPillBg: '#312E28',
  cardBarFill: '#4EB384',
};

/**
 * Muted, earthy editorial avatar tints derived deterministically per member.
 */
export const AVATAR_TINTS_LIGHT: AvatarTint[] = [
  { bg: '#F4E6DF', border: '#E4CDC2', text: '#8C4328' }, // terracotta
  { bg: '#E3EFE8', border: '#CBE0D3', text: '#245B43' }, // sage
  { bg: '#E5EAF0', border: '#CED7E2', text: '#354E6B' }, // slate
  { bg: '#F3ECD8', border: '#E2D6B6', text: '#7D5817' }, // ochre
  { bg: '#EDE6F0', border: '#DBD0E0', text: '#5B3F6B' }, // plum
  { bg: '#EAE7E0', border: '#D7D2C6', text: '#4B473D' }, // stone
];

export const AVATAR_TINTS_DARK: AvatarTint[] = [
  { bg: '#31221C', border: '#4A342B', text: '#E59B7E' }, // terracotta
  { bg: '#1B2C24', border: '#2B4438', text: '#7BC9A4' }, // sage
  { bg: '#1E2732', border: '#303F50', text: '#8FB2D9' }, // slate
  { bg: '#302819', border: '#4A3E26', text: '#E2BC72' }, // ochre
  { bg: '#2A2230', border: '#42354C', text: '#C5A2D8' }, // plum
  { bg: '#282621', border: '#3E3B33', text: '#C9C4B8' }, // stone
];

export function pickAvatarTint(seed: string, tints: AvatarTint[]): AvatarTint {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % tints.length;
  return tints[idx];
}

export const C = LIGHT_COLORS;

export const R = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
};

export const MonoFont = Platform.select({
  ios: 'ui-monospace',
  android: 'monospace',
  default: 'monospace',
});

export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export function makeTypography(colors: LedgerColors) {
  return {
    display: {
      fontSize: 40,
      fontWeight: '700',
      letterSpacing: -1.4,
      color: colors.ink,
      ...tabular,
    } as TextStyle,
    title: {
      fontSize: 26,
      fontWeight: '700',
      letterSpacing: -0.7,
      color: colors.ink,
    } as TextStyle,
    heading: {
      fontSize: 17,
      fontWeight: '600',
      letterSpacing: -0.2,
      color: colors.ink,
    } as TextStyle,
    body: {
      fontSize: 15,
      fontWeight: '400',
      color: colors.ink,
    } as TextStyle,
    bodyStrong: {
      fontSize: 14.5,
      fontWeight: '600',
      color: colors.ink,
      letterSpacing: -0.1,
    } as TextStyle,
    small: {
      fontSize: 12.5,
      fontWeight: '400',
      color: colors.muted,
    } as TextStyle,
    micro: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.0,
      textTransform: 'uppercase',
      color: colors.muted,
    } as TextStyle,
    amount: {
      fontSize: 14.5,
      fontWeight: '600',
      color: colors.ink,
      letterSpacing: -0.2,
      ...tabular,
    } as TextStyle,
  };
}

export type LedgerTypography = ReturnType<typeof makeTypography>;

export const T = makeTypography(LIGHT_COLORS);

export const bottomSafePad = Platform.OS === 'ios' ? 28 : 18;
