import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  IconArrowUpRight,
  IconBreakfast,
  IconCheck,
  IconClose,
  IconDinner,
  IconLunch,
  IconOtherCategory,
  IconPlus,
  IconPreWorkout,
  IconSearch,
  IconSnack,
} from '@/components/icons';
import { useAppTheme } from '@/context/theme-context';
import {
  bottomSafePad,
  C as LIGHT_C,
  MonoFont,
  pickAvatarTint,
  R,
  tabular,
} from '@/design/tokens';
import { SettlementStatus, STATUS_LABELS } from '@/lib/constants';
import { hapticLight } from '@/lib/haptics';

export const BrandColors = LIGHT_C;
export { MonoFont };

/* ------------------------------------------------------------------ */
/* Avatar — earthy monogram tile with deterministic tint per member    */
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
  const dim = size === 'sm' ? 28 : size === 'lg' ? 46 : 36;
  const radius = size === 'sm' ? 7 : size === 'lg' ? 12 : 9;
  const fontSize = size === 'sm' ? 10.5 : size === 'lg' ? 15 : 12;
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
/* BigMoney — tabular editorial peso figure                           */
/* ------------------------------------------------------------------ */

const wholeFormatter = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 });

export function BigMoney({
  cents,
  size = 40,
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
  const smallSize = Math.round(size * 0.45);
  const primaryColor = light ? C.cardText : C.ink;
  const secondaryColor = light ? C.cardMuted : C.muted;

  return (
    <View style={styles.bigMoneyRow}>
      <Text style={[styles.bigMoneySign, { fontSize: smallSize, color: secondaryColor }]}>
        {cents < 0 ? '−₱' : '₱'}
      </Text>
      <Text
        style={[
          styles.bigMoneyWhole,
          { fontSize: size, lineHeight: size * 1.04, color: primaryColor },
        ]}>
        {whole}
      </Text>
      <Text style={[styles.bigMoneyFrac, { fontSize: smallSize, color: secondaryColor }]}>
        .{frac}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* CategoryGlyph — crisp monochrome line icon tile                     */
/* ------------------------------------------------------------------ */

export function CategoryGlyph({
  category,
  whiteBg = false,
}: {
  category: string;
  whiteBg?: boolean;
}) {
  const { C } = useAppTheme();
  const iconColor = C.ink2;

  const renderIcon = () => {
    switch (category) {
      case 'Breakfast':
        return <IconBreakfast size={17} color={iconColor} />;
      case 'Lunch':
        return <IconLunch size={17} color={iconColor} />;
      case 'Dinner':
        return <IconDinner size={17} color={iconColor} />;
      case 'Snack':
        return <IconSnack size={17} color={iconColor} />;
      case 'Pre-workout':
        return <IconPreWorkout size={17} color={iconColor} />;
      default:
        return <IconOtherCategory size={17} color={iconColor} />;
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
/* StatusText — colour reserved strictly for settlement state         */
/* ------------------------------------------------------------------ */

export function StatusText({
  status,
  short = true,
}: {
  status: SettlementStatus | string;
  short?: boolean;
}) {
  const { C } = useAppTheme();

  const statusMap: Record<string, { text: string; dot: string; short: string }> = {
    unsettled: { text: C.owed, dot: C.owed, short: 'Unpaid' },
    partial: { text: C.partial, dot: C.partial, short: 'Partial' },
    settled: { text: C.paid, dot: C.paid, short: 'Settled' },
    none: { text: C.faint, dot: C.faint, short: '—' },
  };

  const cfg = statusMap[status] ?? statusMap.none;
  const label = short ? cfg.short : STATUS_LABELS[status] ?? status;
  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
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
  const { T } = useAppTheme();
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={T.micro}>{children}</Text>
      {action}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* ListGroup & ListRow                                                 */
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
        style={({ pressed }) => [pressed && { backgroundColor: C.paper }]}>
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
      ? C.owed
      : tone === 'paid'
        ? C.paid
        : tone === 'muted'
          ? C.faint
          : C.ink;

  return (
    <View style={styles.amountWrap}>
      <Text style={[styles.amountValue, { color }]}>{value}</Text>
      {caption ? <Text style={[styles.amountCaption, { color: C.muted }]}>{caption}</Text> : null}
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
                    active && { fontWeight: '700', color: C.ink },
                  ]}>
                  {t.label}
                </Text>
                {t.count != null && (
                  <Text
                    style={[
                      styles.underlineTabCount,
                      { color: C.faint },
                      active && { color: C.ink2, fontWeight: '600' },
                    ]}>
                    {t.count}
                  </Text>
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
/* SearchField & Buttons                                               */
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
      <IconSearch size={15} color={C.muted} />
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
        <Pressable onPress={() => onChangeText('')} style={styles.searchClearBtn}>
          <IconClose size={12} color={C.muted} />
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
      icon={<IconPlus size={16} color={C.onInk} strokeWidth={2} />}
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
      onPress={() => {
        hapticLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.exportPill,
        dark
          ? { backgroundColor: C.cardPillBg, borderColor: C.cardBorder }
          : { backgroundColor: C.surface, borderColor: C.line },
        pressed && { opacity: 0.78 },
      ]}>
      <Text style={[styles.exportPillText, { color: dark ? C.cardText : C.ink }]}>
        {label}
      </Text>
      <IconArrowUpRight size={11} color={dark ? C.cardMuted : C.muted} strokeWidth={1.7} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* SplitBar & MiniMeter (Animated with Reanimated)                     */
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
          { backgroundColor: dark ? C.cardBarFill : C.paid },
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
          { backgroundColor: pct >= 100 ? C.paid : C.ink },
          fillStyle,
        ]}
      />
    </View>
  );
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
  return (
    <View style={styles.emptyWrap}>
      <View
        style={[
          styles.emptyBadge,
          { backgroundColor: C.sunken, borderColor: C.line },
        ]}>
        <Text style={[styles.emptyBadgeText, { color: C.muted }]}>{code}</Text>
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
            { backgroundColor: C.sunken },
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
            { backgroundColor: C.sunken },
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
/* ActionSheetModal & ConfirmModal                                     */
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
  const { C, T } = useAppTheme();
  const validActions = actions.filter(Boolean) as SheetActionItem[];

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.sheetBackdrop, { backgroundColor: C.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <View
            style={[
              styles.sheetCard,
              { backgroundColor: C.surface, borderColor: C.line },
            ]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.lineStrong }]} />
            {(title || description) && (
              <View style={styles.sheetHeader}>
                {title ? (
                  <Text style={[T.micro, { color: C.ink }]} numberOfLines={1}>
                    {title}
                  </Text>
                ) : null}
                {description ? (
                  <Text style={[styles.sheetDesc, { color: C.muted }]} numberOfLines={2}>
                    {description}
                  </Text>
                ) : null}
              </View>
            )}
            {validActions.map((a, idx) => (
              <React.Fragment key={a.label}>
                {(idx > 0 || title || description) && (
                  <View style={[styles.hairlineDivider, { backgroundColor: C.line }]} />
                )}
                <Pressable
                  onPress={() => {
                    hapticLight();
                    onClose();
                    setTimeout(() => a.onSelect(), 70);
                  }}
                  style={({ pressed }) => [
                    styles.sheetActionRow,
                    pressed && { backgroundColor: C.paper },
                  ]}>
                  {a.code ? (
                    <View
                      style={[
                        styles.sheetActionBadge,
                        a.destructive
                          ? { backgroundColor: C.owedSoft, borderColor: C.owedSoft }
                          : a.primary
                            ? { backgroundColor: C.ink, borderColor: C.ink }
                            : { backgroundColor: C.sunken, borderColor: C.line },
                      ]}>
                      {a.code === 'CHECK' ? (
                        <IconCheck size={14} color={a.primary ? C.onInk : C.ink} />
                      ) : (
                        <Text
                          style={[
                            styles.sheetActionBadgeText,
                            { color: C.ink2 },
                            a.destructive && { color: C.owed },
                            a.primary && { color: C.onInk },
                          ]}>
                          {a.code}
                        </Text>
                      )}
                    </View>
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.sheetActionLabel,
                        { color: a.destructive ? C.owed : C.ink },
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
            ))}
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.sheetCancelBtn,
              { backgroundColor: C.surface, borderColor: C.line },
              pressed && { opacity: 0.9 },
            ]}>
            <Text style={[styles.sheetCancelText, { color: C.ink }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.dialogBackdrop, { backgroundColor: C.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => !loading && onClose()} />
        <View
          style={[
            styles.confirmCard,
            { backgroundColor: C.surface, borderColor: C.line },
          ]}>
          <Text style={[styles.confirmTitle, { color: C.ink }]}>{title}</Text>
          <Text style={[styles.confirmDesc, { color: C.muted }]}>{description}</Text>
          <View style={styles.confirmFooter}>
            <Pressable
              disabled={loading}
              onPress={onClose}
              style={({ pressed }) => [
                styles.confirmCancelBtn,
                { borderColor: C.lineStrong, backgroundColor: C.surface },
                pressed && { opacity: 0.8 },
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
                { backgroundColor: destructive ? C.owed : C.ink },
                pressed && { opacity: 0.85 },
                loading && { opacity: 0.6 },
              ]}>
              {loading && (
                <ActivityIndicator
                  size="small"
                  color={destructive ? '#FFFFFF' : C.onInk}
                  style={{ marginRight: 6 }}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bigMoneyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bigMoneySign: {
    fontWeight: '600',
    marginRight: 3,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  bigMoneyWhole: {
    fontWeight: '700',
    letterSpacing: -1.4,
    ...tabular,
  },
  bigMoneyFrac: {
    fontWeight: '600',
    ...tabular,
  },
  categoryGlyph: {
    width: 38,
    height: 38,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  pageTitleBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12,
  },
  pageSubtitle: {
    fontSize: 13,
    marginTop: 3,
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
    marginBottom: 8,
    paddingHorizontal: 2,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  listRowBody: {
    flex: 1,
    minWidth: 0,
  },
  listRowTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  listRowSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
  amountWrap: {
    alignItems: 'flex-end',
  },
  amountValue: {
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.2,
    ...tabular,
  },
  amountCaption: {
    fontSize: 11,
    marginTop: 1,
  },
  underlineTabsWrap: {
    borderBottomWidth: 1,
  },
  underlineTabsScroll: {
    gap: 22,
  },
  underlineTabBtn: {
    paddingTop: 4,
    paddingBottom: 10,
    position: 'relative',
  },
  underlineTabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  underlineTabText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  underlineTabCount: {
    fontSize: 11.5,
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
    gap: 7,
    paddingVertical: 2,
  },
  chip: {
    height: 31,
    paddingHorizontal: 13,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  searchFieldWrap: {
    flex: 1,
    height: 42,
    borderRadius: R.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  headerSquareBtn: {
    width: 38,
    height: 38,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportPill: {
    height: 34,
    paddingHorizontal: 11,
    borderRadius: R.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  exportPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  splitBarTrack: {
    height: 5,
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  splitBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  miniMeterTrack: {
    height: 3,
    width: '100%',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 7,
  },
  miniMeterFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 38,
  },
  emptyBadge: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: MonoFont,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
    maxWidth: 260,
  },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: R.md,
  },
  emptyBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  paginationInfo: {
    fontSize: 12.5,
    ...tabular,
  },
  paginationBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: R.sm,
  },
  pageBtnDisabled: {
    opacity: 0.45,
  },
  pageBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    paddingHorizontal: 12,
    paddingBottom: bottomSafePad,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  sheetCard: {
    borderRadius: R.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
  },
  sheetHeader: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sheetDesc: {
    fontSize: 12.5,
    marginTop: 3,
  },
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14,
  },
  sheetActionBadge: {
    width: 34,
    height: 34,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActionBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: MonoFont,
  },
  sheetActionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  sheetActionDesc: {
    fontSize: 12.5,
    marginTop: 1,
  },
  sheetCancelBtn: {
    marginTop: 8,
    height: 50,
    borderRadius: R.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  dialogBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: R.lg,
    borderWidth: 1,
    padding: 20,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  confirmDesc: {
    fontSize: 13.5,
    marginTop: 8,
    lineHeight: 20,
  },
  confirmFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 22,
  },
  confirmCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: R.md,
    borderWidth: 1,
  },
  confirmCancelText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  confirmPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: R.md,
  },
  confirmPrimaryText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
});
