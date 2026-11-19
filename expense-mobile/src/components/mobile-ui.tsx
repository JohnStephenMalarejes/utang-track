import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconAlertCircle,
  IconArrowUpRight,
  IconBreakfast,
  IconCalendar,
  IconChart,
  IconCheck,
  IconClose,
  IconDinner,
  IconEdit,
  IconLunch,
  IconOtherCategory,
  IconPlus,
  IconPreWorkout,
  IconReceipt,
  IconSearch,
  IconSnack,
  IconTrash,
  IconUserPlus,
  IconUsers,
  IconWallet,
} from '@/components/icons';
import { useAppTheme } from '@/context/theme-context';
import {
  bottomSafePad,
  C as LIGHT_C,
  METRICS,
  MonoFont,
  pickAvatarTint,
  R,
  tabular,
} from '@/design/tokens';
import { SettlementStatus, STATUS_LABELS } from '@/lib/constants';
import { hapticLight } from '@/lib/haptics';

export const BrandColors = LIGHT_C;
export { MonoFont };

const SCREEN_HEIGHT = Dimensions.get('window').height;

/* ------------------------------------------------------------------ */
/* NumericDoneBar — iOS InputAccessoryView for decimal-pad dismissal   */
/* ------------------------------------------------------------------ */

export function NumericDoneBar({ nativeID }: { nativeID: string }) {
  const { C } = useAppTheme();
  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View
        style={[
          styles.doneBar,
          { backgroundColor: C.surface, borderTopColor: C.line },
        ]}>
        <Pressable
          onPress={() => {
            hapticLight();
            Keyboard.dismiss();
          }}
          style={({ pressed }) => [
            styles.doneBtn,
            { backgroundColor: C.ink },
            pressed && { opacity: 0.85 },
          ]}>
          <Text style={[styles.doneBtnText, { color: C.onInk }]}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

/* ------------------------------------------------------------------ */
/* ErrorBanner — Unmistakable validation & error feedback              */
/* ------------------------------------------------------------------ */

export function ErrorBanner({ message }: { message: string }) {
  const { C } = useAppTheme();
  if (!message) return null;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.errorBanner,
        { backgroundColor: C.dangerSoft, borderColor: C.dangerBorder },
      ]}>
      <IconAlertCircle size={17} color={C.danger} />
      <Text style={[styles.errorBannerText, { color: C.danger }]}>{message}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* BottomSheet — Draggable native sheet (handle + header pan target)  */
/* ------------------------------------------------------------------ */

export function BottomSheet({
  open,
  onClose,
  dismissible = true,
  maxHeight = '92%',
  avoidKeyboard = false,
  header,
  children,
}: {
  open: boolean;
  onClose: () => void;
  dismissible?: boolean;
  maxHeight?: `${number}%`;
  avoidKeyboard?: boolean;
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { C } = useAppTheme();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (open) {
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 28, stiffness: 300, mass: 0.9 });
    }
  }, [open, translateY, backdropOpacity]);

  const finishClose = () => {
    if (dismissible) {
      onClose();
    }
  };

  const animateClose = () => {
    if (!dismissible) return;
    hapticLight();
    backdropOpacity.value = withTiming(0, { duration: 160 });
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(finishClose)();
    });
  };

  const pan = Gesture.Pan()
    .enabled(dismissible)
    .activeOffsetY([6, 999])
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
        backdropOpacity.value = Math.max(0.2, 1 - e.translationY / 420);
      }
    })
    .onEnd((e) => {
      if (e.translationY > 96 || e.velocityY > 700) {
        backdropOpacity.value = withTiming(0, { duration: 160 });
        translateY.value = withTiming(
          SCREEN_HEIGHT,
          { duration: 190, easing: Easing.in(Easing.cubic) },
          (finished) => {
            if (finished) runOnJS(finishClose)();
          }
        );
      } else {
        backdropOpacity.value = withTiming(1, { duration: 150 });
        translateY.value = withSpring(0, { damping: 26, stiffness: 290 });
      }
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const body = (
    <View style={styles.bsBackdrop}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: C.scrim },
          backdropAnimatedStyle,
        ]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.bsCard,
          {
            maxHeight,
            backgroundColor: C.surface,
            borderColor: C.line,
          },
          sheetAnimatedStyle,
        ]}>
        {/* Combined handle + optional header gives a comfortable 64px+ drag zone */}
        <GestureDetector gesture={pan}>
          <View>
            <View style={styles.bsHandleArea}>
              <View style={[styles.bsHandle, { backgroundColor: C.lineStrong }]} />
            </View>
            {header}
          </View>
        </GestureDetector>
        {children}
      </Animated.View>
    </View>
  );

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={animateClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {avoidKeyboard ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}>
            {body}
          </KeyboardAvoidingView>
        ) : (
          body
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar — Crisp monochrome monogram tile                             */
/* ------------------------------------------------------------------ */

export function initials(name = ''): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  id,
  size = 'md',
}: {
  name: string;
  id?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { avatarTints } = useAppTheme();
  const dim = size === 'sm' ? 32 : size === 'lg' ? 48 : 40;
  const radius = size === 'sm' ? 8 : size === 'lg' ? 12 : 10;
  const fontSize = size === 'sm' ? 11.5 : size === 'lg' ? 16 : 13;
  const tint = pickAvatarTint(id || name || '?', avatarTints);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: dim,
          height: dim,
          borderRadius: radius,
          backgroundColor: tint.bg,
          borderColor: tint.border,
        },
      ]}>
      <Text style={[styles.avatarText, { fontSize, color: tint.text }]}>{initials(name)}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* BigMoney — Single-line auto-scaling tabular hero peso figure        */
/* ------------------------------------------------------------------ */

const wholeFormatter = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 });

export function BigMoney({
  cents,
  size = 44,
  light = false,
}: {
  cents: number;
  size?: number;
  light?: boolean;
}) {
  const { C } = useAppTheme();
  const abs = Math.abs(cents || 0);
  const whole = wholeFormatter.format(Math.floor(abs / 100));
  const frac = String(abs % 100).padStart(2, '0');
  const smallSize = Math.round(size * 0.46);
  const primaryColor = light ? C.cardText : C.ink;
  const secondaryColor = light ? C.cardMuted : C.muted;

  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.58}
      style={[
        styles.bigMoneyWhole,
        {
          fontSize: size,
          lineHeight: Math.round(size * 1.12),
          letterSpacing: Number((-size * 0.03).toFixed(2)),
          color: primaryColor,
        },
      ]}>
      <Text style={[styles.bigMoneySign, { fontSize: smallSize, color: secondaryColor }]}>
        {cents < 0 ? '−₱' : '₱'}
      </Text>
      {whole}
      <Text style={[styles.bigMoneyFrac, { fontSize: smallSize, color: secondaryColor }]}>
        .{frac}
      </Text>
    </Text>
  );
}

/* ------------------------------------------------------------------ */
/* CategoryGlyph — Native vector icon inside monochrome tile           */
/* ------------------------------------------------------------------ */

export function CategoryGlyph({
  category,
  whiteBg = false,
}: {
  category: string;
  whiteBg?: boolean;
}) {
  const { C } = useAppTheme();
  const iconColor = C.ink;

  const renderIcon = () => {
    switch (category) {
      case 'Breakfast':
        return <IconBreakfast size={18} color={iconColor} />;
      case 'Lunch':
        return <IconLunch size={18} color={iconColor} />;
      case 'Dinner':
        return <IconDinner size={18} color={iconColor} />;
      case 'Snack':
        return <IconSnack size={18} color={iconColor} />;
      case 'Pre-workout':
        return <IconPreWorkout size={18} color={iconColor} />;
      default:
        return <IconOtherCategory size={18} color={iconColor} />;
    }
  };

  return (
    <View
      style={[
        styles.categoryGlyph,
        {
          backgroundColor: whiteBg ? C.surface : C.sunken,
          borderColor: C.line,
        },
      ]}>
      {renderIcon()}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* StatusText — Emerald for Settled, Monochrome for Unpaid/Partial     */
/* ------------------------------------------------------------------ */

export function StatusText({
  status,
  short = true,
}: {
  status: SettlementStatus | string;
  short?: boolean;
}) {
  const { C } = useAppTheme();

  const statusMap: Record<
    string,
    { text: string; dot: string; hollow?: boolean; short: string }
  > = {
    unsettled: { text: C.muted, dot: C.ink2, hollow: true, short: 'Unpaid' },
    partial: { text: C.ink2, dot: C.ink2, short: 'Partial' },
    settled: { text: C.paid, dot: C.paidFill, short: 'Settled' },
    none: { text: C.muted, dot: C.muted, short: '—' },
  };

  const cfg = statusMap[status] ?? statusMap.none;
  const label = short ? cfg.short : STATUS_LABELS[status] ?? status;

  return (
    <View style={styles.statusRow}>
      <View
        style={[
          styles.statusDot,
          cfg.hollow
            ? { borderWidth: 1.5, borderColor: cfg.dot, backgroundColor: 'transparent' }
            : { backgroundColor: cfg.dot },
        ]}
      />
      <Text style={[styles.statusLabel, { color: cfg.text }]}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* PageTitleBar & SectionLabel                                         */
/* ------------------------------------------------------------------ */

export function PageTitleBar({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const { C, T } = useAppTheme();
  return (
    <View style={styles.pageTitleBar}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={[T.micro, { marginBottom: 4 }]}>{eyebrow}</Text> : null}
        <Text style={T.title}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.pageSubtitle, { color: C.muted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right ? <View style={styles.pageTitleActions}>{right}</View> : null}
    </View>
  );
}

export function SectionLabel({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const { C } = useAppTheme();
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={[styles.sectionLabelText, { color: C.muted }]}>{children}</Text>
      {action}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* ListGroup & ListRow — 1px hairline ledger list (60px+ rows)         */
/* ------------------------------------------------------------------ */

export function ListGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { C } = useAppTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View
      style={[
        styles.listGroup,
        { backgroundColor: C.surface, borderColor: C.line },
        style,
      ]}>
      {items.map((child, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <View style={[styles.hairlineDivider, { backgroundColor: C.line }]} />}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
}

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  children,
  onPress,
}: {
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  onPress?: () => void;
}) {
  const { C } = useAppTheme();
  const content = (
    <View style={styles.listRowInner}>
      {leading}
      <View style={styles.listRowBody}>
        <Text style={[styles.listRowTitle, { color: C.ink }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.listRowSubtitle, { color: C.muted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </View>
      {trailing}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && { backgroundColor: C.sunken }]}>
        {content}
      </Pressable>
    );
  }
  return content;
}

export function Amount({
  value,
  caption,
  tone = 'default',
}: {
  value: string;
  caption?: string;
  tone?: 'default' | 'owed' | 'paid' | 'muted';
}) {
  const { C } = useAppTheme();
  const color =
    tone === 'owed'
      ? C.ink
      : tone === 'paid'
        ? C.paid
        : tone === 'muted'
          ? C.muted
          : C.ink;

  const captionColor = tone === 'paid' ? C.paid : C.muted;

  return (
    <View style={styles.amountWrap}>
      <Text numberOfLines={1} style={[styles.amountValue, { color }]}>
        {value}
      </Text>
      {caption ? <Text style={[styles.amountCaption, { color: captionColor }]}>{caption}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* UnderlineTabs & ChipRow                                             */
/* ------------------------------------------------------------------ */

export function UnderlineTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { C } = useAppTheme();
  return (
    <View style={[styles.underlineTabsWrap, { borderBottomColor: C.line }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.underlineTabsScroll}>
        {tabs.map((t) => {
          const active = value === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => {
                hapticLight();
                onChange(t.id);
              }}
              style={styles.underlineTabBtn}>
              <View style={styles.underlineTabLabelRow}>
                <Text
                  style={[
                    styles.underlineTabText,
                    { color: C.muted },
                    active && { fontWeight: '600', color: C.ink },
                  ]}>
                  {t.label}
                </Text>
                {t.count != null && (
                  <View
                    style={[
                      styles.underlineTabPill,
                      { backgroundColor: active ? C.ink : C.sunken },
                    ]}>
                    <Text
                      style={[
                        styles.underlineTabCount,
                        { color: active ? C.onInk : C.muted },
                      ]}>
                      {t.count}
                    </Text>
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.underlineBar,
                  active && { backgroundColor: C.ink },
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
}) {
  const { C } = useAppTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRowScroll}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value || '__all__'}
            onPress={() => {
              hapticLight();
              onChange(o.value);
            }}
            style={({ pressed }) => [
              styles.chip,
              active
                ? { backgroundColor: C.ink, borderColor: C.ink }
                : { backgroundColor: C.surface, borderColor: C.line },
              pressed && { opacity: 0.82 },
            ]}>
            <Text style={[styles.chipText, { color: active ? C.onInk : C.ink2 }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/* SearchField & Touch-Safe Buttons (44px ergonomic targets)           */
/* ------------------------------------------------------------------ */

export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search…',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  const { C } = useAppTheme();
  return (
    <View
      style={[
        styles.searchFieldWrap,
        { backgroundColor: C.surface, borderColor: C.line },
      ]}>
      <IconSearch size={16} color={C.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
        style={[styles.searchInput, { color: C.ink }]}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Pressable
          accessibilityLabel="Clear search"
          hitSlop={10}
          onPress={() => onChangeText('')}
          style={styles.searchClearBtn}>
          <IconClose size={13} color={C.muted} />
        </Pressable>
      )}
    </View>
  );
}

export function HeaderActionButton({
  icon,
  onPress,
  solid = false,
  accessibilityLabel,
}: {
  icon: React.ReactNode;
  onPress: () => void;
  solid?: boolean;
  accessibilityLabel?: string;
}) {
  const { C } = useAppTheme();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        hapticLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.headerSquareBtn,
        solid
          ? { backgroundColor: C.ink }
          : { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
        pressed && { opacity: 0.8 },
      ]}>
      {icon}
    </Pressable>
  );
}

export function HeaderPlusButton({ onPress }: { onPress: () => void }) {
  const { C } = useAppTheme();
  return (
    <HeaderActionButton
      solid
      accessibilityLabel="Add new"
      onPress={onPress}
      icon={<IconPlus size={18} color={C.onInk} />}
    />
  );
}

export function ExportPillButton({
  label = 'Export',
  onPress,
  dark = false,
}: {
  label?: string;
  onPress: () => void;
  dark?: boolean;
}) {
  const { C } = useAppTheme();
  return (
    <Pressable
      hitSlop={4}
      onPress={() => {
        hapticLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.exportPill,
        dark
          ? { backgroundColor: C.sunken, borderColor: C.line }
          : { backgroundColor: C.surface, borderColor: C.line },
        pressed && { backgroundColor: C.sunken },
      ]}>
      <Text style={[styles.exportPillText, { color: C.ink }]}>{label}</Text>
      <IconArrowUpRight size={13} color={C.muted} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* SplitBar & MiniMeter — Emerald payoff progress fills                */
/* ------------------------------------------------------------------ */

export function SplitBar({
  value,
  dark = false,
}: {
  value: number;
  dark?: boolean;
}) {
  const { C } = useAppTheme();
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const progress = useSharedValue(pct);

  useEffect(() => {
    progress.value = withTiming(pct, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [pct, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View
      style={[
        styles.splitBarTrack,
        { backgroundColor: dark ? C.cardTrack : C.sunken },
      ]}>
      <Animated.View
        style={[
          styles.splitBarFill,
          { backgroundColor: C.paidFill },
          fillStyle,
        ]}
      />
    </View>
  );
}

export function MiniMeter({ value }: { value: number }) {
  const { C } = useAppTheme();
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const progress = useSharedValue(pct);

  useEffect(() => {
    progress.value = withTiming(pct, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });
  }, [pct, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View style={[styles.miniMeterTrack, { backgroundColor: C.sunken }]}>
      <Animated.View
        style={[
          styles.miniMeterFill,
          { backgroundColor: pct > 0 ? C.paidFill : C.lineStrong },
          fillStyle,
        ]}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Helper: Map semantic code to native vector icon (no "EX"/"PY" text) */
/* ------------------------------------------------------------------ */

function CodeVectorIcon({
  code,
  color,
  size = 18,
}: {
  code?: string;
  color: string;
  size?: number;
}) {
  switch (code) {
    case 'EX':
      return <IconReceipt size={size} color={color} />;
    case 'PY':
      return <IconWallet size={size} color={color} />;
    case 'MB':
      return <IconUserPlus size={size} color={color} />;
    case 'CHECK':
    case 'OK':
      return <IconCheck size={size} color={color} />;
    case 'ED':
      return <IconEdit size={size} color={color} />;
    case 'RM':
      return <IconTrash size={size} color={color} />;
    case 'CL':
      return <IconCalendar size={size} color={color} />;
    case 'RP':
      return <IconChart size={size} color={color} />;
    case '00':
      return <IconSearch size={size} color={color} />;
    default:
      return <IconUsers size={size} color={color} />;
  }
}

/* ------------------------------------------------------------------ */
/* MobileEmpty & PaginationBar                                         */
/* ------------------------------------------------------------------ */

export function MobileEmpty({
  code = '—',
  title,
  description,
  actionLabel,
  onAction,
}: {
  code?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { C } = useAppTheme();
  const isPositive = code === 'OK';
  return (
    <View style={styles.emptyWrap}>
      <View
        style={[
          styles.emptyBadge,
          {
            backgroundColor: isPositive ? C.paidSoft : C.sunken,
            borderColor: isPositive ? C.paidBorder : C.line,
          },
        ]}>
        <CodeVectorIcon code={code} color={isPositive ? C.paid : C.ink} size={20} />
      </View>
      <Text style={[styles.emptyTitle, { color: C.ink }]}>{title}</Text>
      {description ? (
        <Text style={[styles.emptyDesc, { color: C.muted }]}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={() => {
            hapticLight();
            onAction();
          }}
          style={({ pressed }) => [
            styles.emptyBtn,
            { backgroundColor: C.ink },
            pressed && { opacity: 0.85 },
          ]}>
          <Text style={[styles.emptyBtnText, { color: C.onInk }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (nextPage: number) => void;
}) {
  const { C } = useAppTheme();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <View style={styles.paginationRow}>
      <Text style={[styles.paginationInfo, { color: C.muted }]}>
        {from}–{to} of {total}
      </Text>
      <View style={styles.paginationBtns}>
        <Pressable
          disabled={page <= 1}
          onPress={() => onPageChange(page - 1)}
          style={[
            styles.pageBtn,
            { backgroundColor: C.sunken, borderColor: C.line },
            page <= 1 && styles.pageBtnDisabled,
          ]}>
          <Text style={[styles.pageBtnText, { color: page <= 1 ? C.faint : C.ink }]}>
            Previous
          </Text>
        </Pressable>
        <Pressable
          disabled={page >= pageCount}
          onPress={() => onPageChange(page + 1)}
          style={[
            styles.pageBtn,
            { backgroundColor: C.sunken, borderColor: C.line },
            page >= pageCount && styles.pageBtnDisabled,
          ]}>
          <Text style={[styles.pageBtnText, { color: page >= pageCount ? C.faint : C.ink }]}>
            Next
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* ActionSheetModal & ConfirmModal — Native Draggable Bottom Sheets    */
/* ------------------------------------------------------------------ */

export interface SheetActionItem {
  label: string;
  description?: string;
  code?: string;
  primary?: boolean;
  destructive?: boolean;
  onSelect: () => void;
}

export function ActionSheetModal({
  open,
  onClose,
  title,
  description,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  actions: (SheetActionItem | null | false | undefined)[];
}) {
  const { C } = useAppTheme();
  const insets = useSafeAreaInsets();
  const validActions = actions.filter(Boolean) as SheetActionItem[];

  const sheetHeader =
    title || description ? (
      <View style={[styles.sheetHeader, { borderBottomColor: C.line }]}>
        {title ? (
          <Text style={[styles.sheetTitle, { color: C.ink }]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {description ? (
          <Text style={[styles.sheetDesc, { color: C.muted }]} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
    ) : undefined;

  return (
    <BottomSheet open={open} onClose={onClose} header={sheetHeader}>
      <View style={{ paddingBottom: Math.max(insets.bottom, bottomSafePad) }}>
        <View style={styles.sheetActionsList}>
          {validActions.map((a, idx) => {
            const badgeBg = a.destructive
              ? C.dangerSoft
              : a.primary
                ? C.ink
                : C.sunken;
            const badgeBorder = a.destructive
              ? C.dangerBorder
              : a.primary
                ? C.ink
                : C.line;
            const iconColor = a.destructive
              ? C.danger
              : a.primary
                ? C.onInk
                : C.ink;

            return (
              <React.Fragment key={a.label}>
                {idx > 0 && <View style={[styles.hairlineDivider, { backgroundColor: C.line }]} />}
                <Pressable
                  onPress={() => {
                    hapticLight();
                    onClose();
                    setTimeout(() => a.onSelect(), 120);
                  }}
                  style={({ pressed }) => [
                    styles.sheetActionRow,
                    pressed && { backgroundColor: C.sunken },
                  ]}>
                  {a.code ? (
                    <View
                      style={[
                        styles.sheetActionBadge,
                        { backgroundColor: badgeBg, borderColor: badgeBorder },
                      ]}>
                      <CodeVectorIcon code={a.code} color={iconColor} size={18} />
                    </View>
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.sheetActionLabel,
                        { color: a.destructive ? C.danger : C.ink },
                      ]}>
                      {a.label}
                    </Text>
                    {a.description ? (
                      <Text style={[styles.sheetActionDesc, { color: C.muted }]}>
                        {a.description}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>
        <View style={styles.sheetFooterPad}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.sheetCancelBtn,
              { backgroundColor: C.sunken, borderColor: C.line },
              pressed && { opacity: 0.85 },
            ]}>
            <Text style={[styles.sheetCancelText, { color: C.ink }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

export function ConfirmModal({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  const { C } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <BottomSheet open={open} onClose={onClose} dismissible={!loading}>
      <View
        style={[
          styles.confirmSheetBody,
          { paddingBottom: Math.max(insets.bottom, bottomSafePad) },
        ]}>
        <View style={styles.confirmTitleRow}>
          {destructive && (
            <View
              style={[
                styles.confirmDangerIcon,
                { backgroundColor: C.dangerSoft, borderColor: C.dangerBorder },
              ]}>
              <IconAlertCircle size={18} color={C.danger} />
            </View>
          )}
          <Text style={[styles.confirmTitle, { color: C.ink, flex: 1 }]}>{title}</Text>
        </View>
        <Text style={[styles.confirmDesc, { color: C.muted }]}>{description}</Text>
        <View style={styles.confirmFooter}>
          <Pressable
            disabled={loading}
            onPress={onClose}
            style={({ pressed }) => [
              styles.confirmCancelBtn,
              { borderColor: C.line, backgroundColor: C.surface },
              pressed && { backgroundColor: C.sunken },
            ]}>
            <Text style={[styles.confirmCancelText, { color: C.ink }]}>Cancel</Text>
          </Pressable>
          <Pressable
            disabled={loading}
            onPress={() => {
              hapticLight();
              onConfirm();
            }}
            style={({ pressed }) => [
              styles.confirmPrimaryBtn,
              { backgroundColor: destructive ? C.danger : C.ink },
              pressed && { opacity: 0.88 },
              loading && { opacity: 0.55 },
            ]}>
            {loading && (
              <ActivityIndicator
                size="small"
                color={destructive ? '#FFFFFF' : C.onInk}
                style={{ marginRight: 8 }}
              />
            )}
            <Text
              style={[
                styles.confirmPrimaryText,
                { color: destructive ? '#FFFFFF' : C.onInk },
              ]}>
              {confirmLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  doneBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  doneBtn: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: R.md,
    borderWidth: 1,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 19,
  },
  bsBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bsCard: {
    borderTopLeftRadius: R.sheet,
    borderTopRightRadius: R.sheet,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  bsHandleArea: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bsHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: {
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  bigMoneySign: {
    fontWeight: '600',
  },
  bigMoneyWhole: {
    fontWeight: '700',
    ...tabular,
  },
  bigMoneyFrac: {
    fontWeight: '600',
    ...tabular,
  },
  categoryGlyph: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  pageTitleBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  pageSubtitle: {
    fontSize: 13.5,
    marginTop: 4,
    ...tabular,
  },
  pageTitleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionLabelText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  listGroup: {
    borderRadius: R.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hairlineDivider: {
    height: 1,
  },
  listRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: METRICS.rowMinHeight,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  listRowBody: {
    flex: 1,
    minWidth: 0,
  },
  listRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  listRowSubtitle: {
    fontSize: 13,
    marginTop: 2,
    ...tabular,
  },
  amountWrap: {
    alignItems: 'flex-end',
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
    ...tabular,
  },
  amountCaption: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  underlineTabsWrap: {
    borderBottomWidth: 1,
  },
  underlineTabsScroll: {
    gap: 20,
  },
  underlineTabBtn: {
    minHeight: METRICS.touchMin,
    justifyContent: 'center',
    paddingBottom: 10,
    paddingTop: 6,
    position: 'relative',
  },
  underlineTabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  underlineTabText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  underlineTabPill: {
    minWidth: 22,
    height: 20,
    borderRadius: R.pill,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  underlineTabCount: {
    fontSize: 11.5,
    fontWeight: '600',
    ...tabular,
  },
  underlineBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 2,
    backgroundColor: 'transparent',
  },
  chipRowScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  searchFieldWrap: {
    flex: 1,
    height: METRICS.touchMin,
    borderRadius: R.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchClearBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSquareBtn: {
    minWidth: METRICS.touchMin,
    height: METRICS.touchMin,
    paddingHorizontal: 12,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportPill: {
    height: 40,
    paddingHorizontal: 13,
    borderRadius: R.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  exportPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  splitBarTrack: {
    height: 6,
    width: '100%',
    borderRadius: R.pill,
    overflow: 'hidden',
  },
  splitBarFill: {
    height: '100%',
    borderRadius: R.pill,
  },
  miniMeterTrack: {
    height: 3,
    width: '100%',
    borderRadius: R.pill,
    overflow: 'hidden',
    marginTop: 8,
  },
  miniMeterFill: {
    height: '100%',
    borderRadius: R.pill,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  emptyBadge: {
    width: 48,
    height: 48,
    borderRadius: R.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13.5,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 20,
    maxWidth: 270,
  },
  emptyBtn: {
    marginTop: 18,
    height: METRICS.touchMin,
    paddingHorizontal: 20,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  paginationInfo: {
    fontSize: 13,
    ...tabular,
  },
  paginationBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  pageBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: R.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  sheetDesc: {
    fontSize: 13.5,
    marginTop: 3,
    ...tabular,
  },
  sheetActionsList: {
    paddingVertical: 4,
  },
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  sheetActionBadge: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActionLabel: {
    fontSize: 15.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sheetActionDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  sheetFooterPad: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sheetCancelBtn: {
    height: METRICS.buttonHeight,
    borderRadius: R.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmSheetBody: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  confirmTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confirmDangerIcon: {
    width: 36,
    height: 36,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  confirmDesc: {
    fontSize: 14,
    marginTop: 10,
    lineHeight: 21,
  },
  confirmFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  confirmCancelBtn: {
    flex: 1,
    height: METRICS.buttonHeight,
    borderRadius: R.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmPrimaryBtn: {
    flex: 1,
    height: METRICS.buttonHeight,
    borderRadius: R.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
