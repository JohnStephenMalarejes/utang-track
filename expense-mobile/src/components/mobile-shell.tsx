import { Image } from 'expo-image';
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
  IconCalendar,
  IconChart,
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
import { R, tabular } from '@/design/tokens';
import { hapticLight } from '@/lib/haptics';

const TABS = [
  { href: '/' as const, match: '/', label: 'Overview', Icon: IconHome },
  { href: '/expenses' as const, match: '/expenses', label: 'Expenses', Icon: IconReceipt },
  { href: '/payments' as const, match: '/payments', label: 'Payments', Icon: IconWallet },
  { href: '/members' as const, match: '/members', label: 'People', Icon: IconUsers },
];

export function MobileScreenWrapper({ children }: { children: React.ReactNode }) {
  const { refreshing, refresh } = useLedger();
  const { C } = useAppTheme();

  return (
    <ScrollView
      style={[styles.screenScroll, { backgroundColor: C.paper }]}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => refresh(false)} tintColor={C.ink} />
      }>
      <View style={styles.maxWidthContainer}>{children}</View>
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
  const isMemberDetail = pathname.startsWith('/members/') && pathname !== '/members';
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

  const renderTab = (tab: (typeof TABS)[number]) => {
    const active = isActive(tab.match);
    const TabIcon = tab.Icon;
    const showBadge = tab.match === '/payments' && unpaidShareCount > 0;
    const badgeLabel = unpaidShareCount > 99 ? '99+' : String(unpaidShareCount);

    return (
      <Pressable
        key={tab.href}
        onPress={() => handleTabPress(tab.href, tab.match)}
        style={styles.tabItem}>
        <View style={[styles.tabRule, active && { backgroundColor: C.ink }]} />
        <View style={styles.tabIconWrap}>
          <TabIcon size={18} color={active ? C.ink : C.faint} />
          {showBadge && (
            <View
              style={[
                styles.tabBadge,
                { backgroundColor: C.owed, borderColor: C.surface },
              ]}>
              <Text style={styles.tabBadgeText}>{badgeLabel}</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.tabLabel,
            { color: active ? C.ink : C.muted },
            active && { fontWeight: '700' },
          ]}>
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: C.paper }]}>
      {/* Top App Bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, 8),
            backgroundColor: C.paper,
            borderBottomColor: C.line,
          },
        ]}>
        <View style={styles.topBarInner}>
          {isMemberDetail ? (
            <Pressable
              onPress={() => {
                hapticLight();
                router.replace('/members');
              }}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.65 }]}>
              <IconChevronLeft size={16} color={C.ink} strokeWidth={2} />
              <Text style={[styles.backText, { color: C.ink }]}>People</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                hapticLight();
                router.replace('/');
              }}
              style={({ pressed }) => [styles.brandRow, pressed && { opacity: 0.8 }]}>
              <View
                style={[
                  styles.logoFrame,
                  { backgroundColor: '#FFFFFF', borderColor: C.line },
                ]}>
                <Image
                  source={require('@/assets/images/logo-mark.png')}
                  style={styles.logoMark}
                  contentFit="contain"
                />
              </View>
              <Text style={[styles.brandName, { color: C.ink }]}>
                debt<Text style={[styles.brandAccent, { color: C.muted }]}> tracker</Text>
              </Text>
            </Pressable>
          )}

          <View style={styles.topActions}>
            <Pressable
              accessibilityLabel="Calendar"
              onPress={() => {
                hapticLight();
                router.push('/calendar');
              }}
              style={({ pressed }) => [
                styles.headerIconBtn,
                { backgroundColor: C.surface, borderColor: C.line },
                isCalendar && { backgroundColor: C.ink, borderColor: C.ink },
                pressed && { opacity: 0.8 },
              ]}>
              <IconCalendar size={16} color={isCalendar ? C.onInk : C.ink} />
            </Pressable>

            <Pressable
              accessibilityLabel="Reports"
              onPress={() => {
                hapticLight();
                router.push('/reports');
              }}
              style={({ pressed }) => [
                styles.headerIconBtn,
                { backgroundColor: C.surface, borderColor: C.line },
                isReports && { backgroundColor: C.ink, borderColor: C.ink },
                pressed && { opacity: 0.8 },
              ]}>
              <IconChart size={16} color={isReports ? C.onInk : C.ink} />
            </Pressable>

            <Pressable
              accessibilityLabel="Settings"
              onPress={() => {
                hapticLight();
                router.push('/settings');
              }}
              style={({ pressed }) => [
                styles.headerAvatarBtn,
                { backgroundColor: C.surface, borderColor: C.line },
                isSettings && { backgroundColor: C.ink, borderColor: C.ink },
                pressed && { opacity: 0.8 },
              ]}>
              <Text
                style={[
                  styles.headerAvatarText,
                  { color: isSettings ? C.onInk : C.ink },
                ]}>
                {initial}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.contentArea}>{children}</View>

      {/* Animated Toast Notification */}
      {toast && (
        <Animated.View
          key={toast.id}
          entering={FadeInDown.duration(220)}
          exiting={FadeOutDown.duration(180)}
          style={[
            styles.toastBanner,
            {
              bottom: Math.max(insets.bottom, 12) + 70,
              backgroundColor: toast.tone === 'error' ? C.owed : C.cardBg,
              borderColor: toast.tone === 'error' ? C.owed : C.cardBorder,
            },
          ]}>
          <Text
            style={[
              styles.toastText,
              { color: toast.tone === 'error' ? '#FFFFFF' : C.cardText },
            ]}>
            {toast.text}
          </Text>
        </Animated.View>
      )}

      {/* Bottom Tab Bar */}
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
                styles.createFab,
                { backgroundColor: C.ink },
                pressed && { opacity: 0.88, transform: [{ scale: 0.94 }] },
              ]}>
              <IconPlus size={18} color={C.onInk} strokeWidth={2.2} />
            </Pressable>
          </View>

          {TABS.slice(2).map(renderTab)}
        </View>
      </View>

      {/* Global Create Sheet & Modals */}
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
            label: 'Add member',
            description: 'Someone you share bills with',
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
  topBar: {
    borderBottomWidth: 1,
  },
  topBarInner: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  logoFrame: {
    width: 28,
    height: 28,
    borderRadius: R.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMark: {
    width: 20,
    height: 20,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  brandAccent: {
    fontWeight: '400',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingRight: 10,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarBtn: {
    width: 34,
    height: 34,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 13,
    fontWeight: '700',
  },
  contentArea: {
    flex: 1,
  },
  screenScroll: {
    flex: 1,
  },
  screenContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 112,
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
    paddingVertical: 12,
    borderRadius: R.md,
    borderWidth: 1,
    zIndex: 100,
    alignItems: 'center',
  },
  toastText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
  },
  bottomBarInner: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
  },
  tabRule: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 2,
    backgroundColor: 'transparent',
  },
  tabIconWrap: {
    position: 'relative',
  },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -11,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFFFF',
    ...tabular,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  centerCreateSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createFab: {
    width: 42,
    height: 42,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
