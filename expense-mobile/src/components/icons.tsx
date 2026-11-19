import { SymbolView, SymbolViewProps } from 'expo-symbols';
import React from 'react';
import { C } from '@/design/tokens';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function AppSymbol({
  name,
  size = 18,
  color = C.ink,
  weight = 'medium',
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color?: string;
  weight?: 'regular' | 'medium' | 'semibold';
}) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      type="monochrome"
      weight={weight}
      resizeMode="scaleAspectFit"
    />
  );
}

export function IconPlus({ size = 16, color = C.ink }: IconProps) {
  return <AppSymbol name={{ ios: 'plus', android: 'add', web: 'add' }} size={size} color={color} weight="semibold" />;
}

export function IconClose({ size = 14, color = C.ink }: IconProps) {
  return <AppSymbol name={{ ios: 'xmark', android: 'close', web: 'close' }} size={size} color={color} weight="medium" />;
}

export function IconChevronRight({ size = 14, color = C.faint }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
      size={size}
      color={color}
      weight="semibold"
    />
  );
}

export function IconChevronLeft({ size = 16, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
      size={size}
      color={color}
      weight="semibold"
    />
  );
}

export function IconChevronDown({ size = 14, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }}
      size={size}
      color={color}
      weight="semibold"
    />
  );
}

export function IconSearch({ size = 16, color = C.muted }: IconProps) {
  return <AppSymbol name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={size} color={color} />;
}

export function IconFilter({ size = 16, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'line.3.horizontal.decrease', android: 'filter_list', web: 'filter_list' }}
      size={size}
      color={color}
    />
  );
}

export function IconCheck({ size = 14, color = C.surface }: IconProps) {
  return <AppSymbol name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={size} color={color} weight="semibold" />;
}

export function IconArrowUpRight({ size = 13, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }}
      size={size}
      color={color}
    />
  );
}

export function IconMore({ size = 18, color = C.muted }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
      size={size}
      color={color}
    />
  );
}

export function IconChart({ size = 18, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' }}
      size={size}
      color={color}
    />
  );
}

export function IconHome({ size = 20, color = C.ink }: IconProps) {
  return <AppSymbol name={{ ios: 'house', android: 'home', web: 'home' }} size={size} color={color} />;
}

export function IconReceipt({ size = 20, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'doc.text', android: 'receipt_long', web: 'receipt_long' }}
      size={size}
      color={color}
    />
  );
}

export function IconWallet({ size = 20, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'creditcard', android: 'account_balance_wallet', web: 'account_balance_wallet' }}
      size={size}
      color={color}
    />
  );
}

export function IconUsers({ size = 20, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'person.2', android: 'group', web: 'group' }}
      size={size}
      color={color}
    />
  );
}

export function IconUserPlus({ size = 18, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'person.badge.plus', android: 'person_add', web: 'person_add' }}
      size={size}
      color={color}
    />
  );
}

export function IconEdit({ size = 16, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
      size={size}
      color={color}
    />
  );
}

export function IconAlertCircle({ size = 16, color = C.danger }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'exclamationmark.circle', android: 'error_outline', web: 'error_outline' }}
      size={size}
      color={color}
    />
  );
}

export function IconSettings({ size = 18, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'slider.horizontal.3', android: 'settings', web: 'settings' }}
      size={size}
      color={color}
    />
  );
}

export function IconCalendar({ size = 18, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
      size={size}
      color={color}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Category Vector Icons (Native SF Symbols / Material Symbols)        */
/* ------------------------------------------------------------------ */

export function IconBreakfast({ size = 18, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'cup.and.saucer', android: 'coffee', web: 'coffee' }}
      size={size}
      color={color}
    />
  );
}

export function IconLunch({ size = 18, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'takeoutbag.and.cup.and.straw', android: 'ramen_dining', web: 'ramen_dining' }}
      size={size}
      color={color}
    />
  );
}

export function IconDinner({ size = 18, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }}
      size={size}
      color={color}
    />
  );
}

export function IconSnack({ size = 18, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'birthday.cake', android: 'cookie', web: 'cookie' }}
      size={size}
      color={color}
    />
  );
}

export function IconPreWorkout({ size = 18, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'dumbbell', android: 'fitness_center', web: 'fitness_center' }}
      size={size}
      color={color}
    />
  );
}

export function IconOtherCategory({ size = 18, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'tag', android: 'label', web: 'label' }}
      size={size}
      color={color}
    />
  );
}

export function IconTrash({ size = 17, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'trash', android: 'delete', web: 'delete' }}
      size={size}
      color={color}
    />
  );
}

export function IconSun({ size = 16, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'sun.max', android: 'light_mode', web: 'light_mode' }}
      size={size}
      color={color}
    />
  );
}

export function IconMoon({ size = 16, color = C.ink }: IconProps) {
  return (
    <AppSymbol
      name={{ ios: 'moon', android: 'dark_mode', web: 'dark_mode' }}
      size={size}
      color={color}
    />
  );
}
