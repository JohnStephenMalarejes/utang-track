import { usePathname, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconAlertCircle,
  IconCalendar,
  IconChart,
  IconCheck,
  IconChevronLeft,
  IconHome,
  IconPlus,
  IconReceipt,
  IconUsers,
  IconWallet,
} from '@/components/icons';
import { ActionSheetModal } from '@/components/mobile-ui';
import { ExpenseDetailModal } from '@/components/modals/expense-detail-modal';
import { ExpenseFormModal } from '@/components/modals/expense-form-modal';
import { MemberFormModal } from '@/components/modals/member-form-modal';
import { PaymentFormModal } from '@/components/modals/payment-form-modal';
import { useLedger } from '@/context/ledger-context';
import { useAppTheme } from '@/context/theme-context';
import { METRICS, R, tabular } from '@/design/tokens';
import { hapticLight } from '@/lib/haptics';

const TABS = [
  { href: '/' as const, match: '/', label: 'Overview', Icon: IconHome },
  { href: '/expenses' as const, match: '/expenses', label: 'Expenses', Icon: IconReceipt },
  { href: '/payments' as const, match: '/payments', label: 'Payments', Icon: IconWallet },
  { href: '/members' as const, match: '/members', label: 'People', Icon: IconUsers },
];

export function MobileScreenWrapper({
  children,
  bleedTop = false,
}: {
  children: React.ReactNode;
  bleedTop?: boolean;
}) {
  const { refreshing, refresh } = useLedger();
  const { C } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.screenScroll, { backgroundColor: C.paper }]}
      contentContainerStyle={[
        styles.screenContent,
        bleedTop && styles.screenContentBleed,
        { paddingBottom: Math.max(insets.bottom, 12) + 88 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => refresh(false)}
          tintColor={bleedTop ? C.heroText : C.ink}
        />
      }>
      {bleedTop ? children : <View style={styles.maxWidthContainer}>{children}</View>}
    </ScrollView>
  );
}

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useAppTheme();
  const {
    user,
    ledger,
    toast,
    createSheetOpen,
    setCreateSheetOpen,
    openExpenseForm,
    openPaymentForm,
    openMemberForm,
  } = useLedger();

  const unpaidShareCount = useMemo(
    () => ledger.shares.filter((s) => !s.isPayer && s.remainingCents > 0).length,
    [ledger.shares]
  );

  if (pathname === '/login' || pathname === '/register') {
    return <View style={{ flex: 1, backgroundColor: C.paper }}>{children}</View>;
  }

  const initial = (user?.name || user?.email || 'A').trim().charAt(0).toUpperCase();
  const isHome = pathname === '/' || pathname === '/index';
  const isMemberDetail = pathname.startsWith('/members/') && pathname !== '/members';
  const isPayments = pathname === '/payments';
  const isMembers = pathname === '/members';
  const isCalendar = pathname === '/calendar';
  const isReports = pathname === '/reports';
  const isSettings = pathname === '/settings';

  const isActive = (match: string) => {
    if (match === '/') return pathname === '/' || pathname === '/index';
    return pathname === match || pathname.startsWith(`${match}/`);
  };

  function handleTabPress(href: (typeof TABS)[number]['href'], match: string) {
    if (isActive(match) && pathname === match) return;
    hapticLight();
    router.replace(href);
  }

  const topPill = isPayments
    ? { label: 'Record payment', onPress: () => openPaymentForm(null) }
    : isMembers
      ? { label: 'Add person', onPress: () => openMemberForm(null) }
      : { label: 'New expense', onPress: () => openExpenseForm(null) };

  const renderTab = (tab: (typeof TABS)[number]) => {
    const active = isActive(tab.match);
    const TabIcon = tab.Icon;
    const showBadge = tab.match === '/payments' && unpaidShareCount > 0;
    const badgeLabel = unpaidShareCount > 99 ? '99+' : String(unpaidShareCount);

    return (
      <Pressable
        key={tab.href}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={() => handleTabPress(tab.href, tab.match)}
        style={styles.tabItem}>
        <View style={styles.tabIconWrap}>
          <TabIcon size={21} color={active ? C.forestInk : C.muted} />
          {showBadge && (
            <View
              style={[
                styles.tabBadge,
                { backgroundColor: C.forestInk, borderColor: C.surface },
              ]}>
              <Text style={[styles.tabBadgeText, { color: C.onInk }]}>{badgeLabel}</Text>
            </View>
          )}
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            { color: active ? C.forestInk : C.muted },
            active && { fontWeight: '600' },
          ]}>
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  const isErrorToast = toast?.tone === 'error';

  return (
    <View style={[styles.root, { backgroundColor: C.paper }]}>
      {/* Seamless Borderless Top Utility Bar (no dark bg, no gray underline) */}
      {!isHome && (
        <View
          style={[
            styles.cleanTopBar,
            {
              paddingTop: Math.max(insets.top, 14) + 6,
              backgroundColor: C.paper,
            },
          ]}>
          <View style={styles.cleanTopInner}>
            {isMemberDetail ? (
              <Pressable
                onPress={() => {
                  hapticLight();
                  router.replace('/members');
                }}
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.65 }]}>
                <IconChevronLeft size={18} color={C.ink} />
                <Text style={[styles.backText, { color: C.ink }]}>People</Text>
              </Pressable>
            ) : (
              <View style={styles.utilityLeft}>
                <Pressable
                  accessibilityLabel="Calendar"
                  onPress={() => {
                    hapticLight();
                    if (!isCalendar) router.push('/calendar');
                  }}
                  style={({ pressed }) => [
                    styles.utilityIconBtn,
                    isCalendar && { backgroundColor: C.forestInk },
                    pressed && !isCalendar && { backgroundColor: C.sunken },
                  ]}>
                  <IconCalendar size={20} color={isCalendar ? C.onInk : C.ink} />
                </Pressable>

                <Pressable
                  accessibilityLabel="Reports"
                  onPress={() => {
                    hapticLight();
                    if (!isReports) router.push('/reports');
                  }}
                  style={({ pressed }) => [
                    styles.utilityIconBtn,
                    isReports && { backgroundColor: C.forestInk },
                    pressed && !isReports && { backgroundColor: C.sunken },
                  ]}>
                  <IconChart size={20} color={isReports ? C.onInk : C.ink} />
                </Pressable>

                <Pressable
                  accessibilityLabel="Profile and Settings"
                  onPress={() => {
                    hapticLight();
                    if (!isSettings) router.push('/settings');
                  }}
                  style={({ pressed }) => [
                    styles.utilityAvatarBtn,
                    {
                      backgroundColor: isSettings ? C.forestInk : C.surface,
                      borderColor: isSettings ? C.forestInk : C.lineStrong,
                    },
                    pressed && { opacity: 0.78 },
                  ]}>
                  <Text
                    style={[
                      styles.utilityAvatarText,
                      { color: isSettings ? C.onInk : C.ink },
                    ]}>
                    {initial}
                  </Text>
                </Pressable>
              </View>
            )}

            {isMemberDetail ? (
              <View style={styles.utilityLeft}>
                <Pressable
                  accessibilityLabel="Calendar"
                  onPress={() => {
                    hapticLight();
                    router.push('/calendar');
                  }}
                  style={({ pressed }) => [
                    styles.utilityIconBtn,
                    pressed && { backgroundColor: C.sunken },
                  ]}>
                  <IconCalendar size={20} color={C.ink} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Reports"
                  onPress={() => {
                    hapticLight();
                    router.push('/reports');
                  }}
                  style={({ pressed }) => [
                    styles.utilityIconBtn,
                    pressed && { backgroundColor: C.sunken },
                  ]}>
                  <IconChart size={20} color={C.ink} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Profile and Settings"
                  onPress={() => {
                    hapticLight();
                    router.push('/settings');
                  }}
                  style={({ pressed }) => [
                    styles.utilityAvatarBtn,
                    { backgroundColor: C.surface, borderColor: C.lineStrong },
                    pressed && { opacity: 0.78 },
                  ]}>
                  <Text style={[styles.utilityAvatarText, { color: C.ink }]}>{initial}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  hapticLight();
                  topPill.onPress();
                }}
                style={({ pressed }) => [
                  styles.topActionPill,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.paidFill,
                  },
                  pressed && { backgroundColor: C.paidSoft, transform: [{ scale: 0.97 }] },
                ]}>
                <IconPlus size={14} color={C.forestInk} />
                <Text style={[styles.topActionPillText, { color: C.forestInk }]}>
                  {topPill.label}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.contentArea}>{children}</View>

      {/* High-Contrast Toast Notification (distinct error vs success) */}
      {toast && (
        <Animated.View
          key={toast.id}
          entering={FadeInDown.duration(200)}
          exiting={FadeOutDown.duration(160)}
          style={[
            styles.toastBanner,
            {
              bottom: Math.max(insets.bottom, 10) + 74,
              backgroundColor: isErrorToast ? C.danger : C.ink,
              borderColor: isErrorToast ? C.danger : C.inkBorder,
            },
          ]}>
          {isErrorToast ? (
            <IconAlertCircle size={16} color="#FFFFFF" />
          ) : (
            <IconCheck size={15} color={C.paidFill} />
          )}
          <Text
            style={[
              styles.toastText,
              { color: isErrorToast ? '#FFFFFF' : C.onInk },
            ]}>
            {toast.text}
          </Text>
        </Animated.View>
      )}

      {/* Flat Native Bottom Tab Bar — 1px top hairline, deep forest active icons */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 8),
            backgroundColor: C.surface,
            borderTopColor: C.line,
          },
        ]}>
        <View style={styles.bottomBarInner}>
          {TABS.slice(0, 2).map(renderTab)}

          <View style={styles.centerCreateSlot}>
            <Pressable
              accessibilityLabel="Create entry"
              onPress={() => {
                hapticLight();
                setCreateSheetOpen(true);
              }}
              style={({ pressed }) => [
                styles.createTrigger,
                { backgroundColor: C.forestInk },
                pressed && { opacity: 0.88, transform: [{ scale: 0.96 }] },
              ]}>
              <IconPlus size={20} color={C.onInk} />
            </Pressable>
          </View>

          {TABS.slice(2).map(renderTab)}
        </View>
      </View>

      {/* Global Create Bottom Sheet & Modals */}
      <ActionSheetModal
        open={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        title="New entry"
        actions={[
          {
            label: 'New expense',
            description: 'Log a bill and split it',
            code: 'EX',
            primary: true,
            onSelect: () => openExpenseForm(null),
          },
          {
            label: 'Record payment',
            description: 'Someone paid you back',
            code: 'PY',
            onSelect: () => openPaymentForm(null),
          },
          {
            label: 'Add person',
            description: 'Someone you share expenses with',
            code: 'MB',
            onSelect: () => openMemberForm(null),
          },
        ]}
      />

      <ExpenseFormModal />
      <ExpenseDetailModal />
      <MemberFormModal />
      <PaymentFormModal />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  cleanTopBar: {
    width: '100%',
    paddingBottom: 6,
  },
  cleanTopInner: {
    minHeight: 44,
    paddingHorizontal: METRICS.screenPad,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  utilityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  utilityIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityAvatarBtn: {
    width: 36,
    height: 36,
    marginLeft: 4,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityAvatarText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  topActionPill: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: R.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  topActionPillText: {
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: METRICS.touchMin,
    gap: 6,
    paddingRight: 12,
  },
  backText: {
    fontSize: 15.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  contentArea: {
    flex: 1,
  },
  screenScroll: {
    flex: 1,
  },
  screenContent: {
    paddingHorizontal: METRICS.screenPad,
    paddingTop: 12,
  },
  screenContentBleed: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  maxWidthContainer: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  toastBanner: {
    position: 'absolute',
    left: 20,
    right: 20,
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: R.lg,
    borderWidth: 1,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  toastText: {
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
  },
  bottomBarInner: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    minWidth: METRICS.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabIconWrap: {
    position: 'relative',
  },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -13,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    ...tabular,
  },
  tabLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  centerCreateSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTrigger: {
    width: METRICS.touchMin,
    height: METRICS.touchMin,
    borderRadius: R.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
