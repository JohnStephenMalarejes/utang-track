import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconCalendar,
  IconChart,
  IconChevronRight,
  IconPlus,
  IconWallet,
} from '@/components/icons';
import { MobileScreenWrapper } from '@/components/mobile-shell';
import {
  Amount,
  Avatar,
  CategoryGlyph,
  ExportPillButton,
  ListGroup,
  ListRow,
  MiniMeter,
  MobileEmpty,
  SectionLabel,
  SplitBar,
  StatusText,
} from '@/components/mobile-ui';
import { useLedger } from '@/context/ledger-context';
import { useAppTheme } from '@/context/theme-context';
import { METRICS, R, tabular } from '@/design/tokens';
import { expenseEntries, lastDaysSeries } from '@/lib/analytics';
import { shortDate, todayISO } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import { formatPHP } from '@/lib/money';
import { exportLedgerSummaryPdf } from '@/lib/pdf';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C, T } = useAppTheme();
  const {
    user,
    ledger,
    calendarExpenses,
    openExpenseForm,
    openPaymentForm,
    openMemberForm,
    openExpenseDetail,
  } = useLedger();

  const [pulseDays, setPulseDays] = useState<7 | 14>(7);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const { totals, members, expenses, shares } = ledger;
  const now = new Date();
  const thisMonthKey = format(now, 'yyyy-MM');
  const thisMonthLabel = format(now, 'MMMM yyyy');
  const thisMonthCalExpenses = useMemo(
    () => calendarExpenses.filter((e) => e.date.startsWith(thisMonthKey)),
    [calendarExpenses, thisMonthKey]
  );
  const thisMonthCalTotal = useMemo(
    () => thisMonthCalExpenses.reduce((acc, e) => acc + e.amountCents, 0),
    [thisMonthCalExpenses]
  );

  const entries = useMemo(() => expenseEntries(expenses), [expenses]);
  const daily = useMemo(() => lastDaysSeries(entries, pulseDays), [entries, pulseDays]);
  const sevenDayTotal = useMemo(
    () => lastDaysSeries(entries, 7).reduce((s, d) => s + d.totalCents, 0),
    [entries]
  );

  const owedTotal = totals.settledCents + totals.outstandingCents;
  const collectedPct = owedTotal > 0 ? (totals.settledCents / owedTotal) * 100 : 0;
  const debtors = members.filter((m) => m.balanceCents > 0).length;
  const unpaidShareCount = useMemo(
    () => shares.filter((s) => !s.isPayer && s.remainingCents > 0).length,
    [shares]
  );

  const oldestUnpaidShare = useMemo(() => {
    const open = shares.filter((s) => !s.isPayer && s.remainingCents > 0);
    if (open.length === 0) return null;
    return open.reduce((oldest, s) => (s.expenseDate < oldest.expenseDate ? s : oldest), open[0]);
  }, [shares]);

  const ranked = useMemo(
    () => [...members].filter((m) => m.expenseCount > 0).sort((a, b) => b.balanceCents - a.balanceCents),
    [members]
  );
  const recent = useMemo(() => expenses.slice(0, 6), [expenses]);
  const windowTotal = useMemo(() => daily.reduce((s, d) => s + d.totalCents, 0), [daily]);
  const maxDay = useMemo(() => Math.max(...daily.map((d) => d.totalCents), 1), [daily]);

  const selectedDay = useMemo(
    () => (selectedDayKey ? daily.find((d) => d.key === selectedDayKey) ?? null : null),
    [daily, selectedDayKey]
  );

  const allSettled = expenses.length > 0 && totals.outstandingCents === 0;
  const initial = (user?.name || user?.email || 'A').trim().charAt(0).toUpperCase();

  return (
    <MobileScreenWrapper bleedTop>
      {/* Full-Bleed Deep Forest-Green Gradient Hero Canopy */}
      <View
        style={[
          styles.heroCanopy,
          {
            backgroundColor: C.heroBg,
            backgroundImage: C.heroGradient,
            paddingTop: Math.max(insets.top, 14) + 6,
          },
        ]}>
        <View style={styles.heroInner}>
          {/* Top Utility Bar inside Canopy */}
          <View style={styles.heroUtilityRow}>
            <View style={styles.heroUtilityLeft}>
              <Pressable
                accessibilityLabel="Calendar"
                onPress={() => {
                  hapticLight();
                  router.push('/calendar');
                }}
                style={({ pressed }) => [
                  styles.heroIconBtn,
                  pressed && { backgroundColor: 'rgba(255,255,255,0.14)' },
                ]}>
                <IconCalendar size={20} color={C.heroText} />
              </Pressable>

              <Pressable
                accessibilityLabel="Reports"
                onPress={() => {
                  hapticLight();
                  router.push('/reports');
                }}
                style={({ pressed }) => [
                  styles.heroIconBtn,
                  pressed && { backgroundColor: 'rgba(255,255,255,0.14)' },
                ]}>
                <IconChart size={20} color={C.heroText} />
              </Pressable>

              <Pressable
                accessibilityLabel="Settings"
                onPress={() => {
                  hapticLight();
                  router.push('/settings');
                }}
                style={({ pressed }) => [
                  styles.heroAvatarBtn,
                  pressed && { opacity: 0.78 },
                ]}>
                <Text style={[styles.heroAvatarText, { color: C.heroText }]}>{initial}</Text>
              </Pressable>
            </View>

            {/* Signature Chime Emerald-Outlined Action Pill */}
            <Pressable
              onPress={() => {
                hapticLight();
                openExpenseForm(null);
              }}
              style={({ pressed }) => [
                styles.heroEmeraldPill,
                {
                  backgroundColor: C.heroPillBg,
                  borderColor: C.heroPillBorder,
                },
                pressed && { opacity: 0.82, transform: [{ scale: 0.97 }] },
              ]}>
              <IconPlus size={14} color={C.heroText} />
              <Text style={[styles.heroEmeraldPillText, { color: C.heroText }]}>
                New expense
              </Text>
            </Pressable>
          </View>

          {/* Hero Balance Stack */}
          <View style={styles.heroBalanceBlock}>
            <Text style={[styles.heroHeading, { color: C.heroText }]}>Outstanding</Text>

            <Pressable
              accessibilityLabel="View unpaid balances"
              onPress={() => {
                hapticLight();
                router.replace('/payments');
              }}
              style={({ pressed }) => [styles.heroAmountRow, pressed && { opacity: 0.82 }]}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                style={[styles.heroAmountText, { color: C.heroText }]}>
                {formatPHP(totals.outstandingCents)}
              </Text>
              <IconChevronRight size={20} color={C.heroMuted} />
            </Pressable>

            <Pressable
              onPress={() => {
                hapticLight();
                router.push('/reports');
              }}
              style={({ pressed }) => [styles.heroAccentLinkRow, pressed && { opacity: 0.78 }]}>
              <Text style={[styles.heroAccentLink, { color: C.heroAccent }]} numberOfLines={1}>
                {totals.outstandingCents > 0
                  ? `${formatPHP(totals.settledCents)} collected (${Math.round(collectedPct)}%)`
                  : allSettled
                    ? 'Everyone is settled up'
                    : 'Split a bill to start tracking'}
              </Text>
              <IconChevronRight size={14} color={C.heroAccent} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Main Content Body with Overlapping Floating Card */}
      <View style={styles.bodyWrap}>
        {/* Signature Overlapping Floating White Summary Card */}
        <View
          style={[
            styles.overlapCard,
            { backgroundColor: C.surface, borderColor: C.line },
          ]}>
          <View style={styles.overlapHeader}>
            <Text style={[styles.overlapTitle, { color: C.forestInk }]}>Collected</Text>
            {(expenses.length > 0 || members.length > 0) && (
              <ExportPillButton
                label="PDF summary"
                onPress={() =>
                  exportLedgerSummaryPdf({
                    filename: `debt-tracker-summary-${todayISO()}.pdf`,
                    shareTitle: 'Debt Tracker Summary',
                    members,
                    expenses,
                  })
                }
              />
            )}
          </View>

          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.68}
            style={[styles.overlapAmount, { color: C.ink }]}>
            {formatPHP(totals.settledCents)}
          </Text>

          <Text style={[styles.overlapSub, { color: C.muted }]}>
            {totals.expensesCents > 0
              ? `${Math.round(collectedPct)}% of ${formatPHP(totals.expensesCents)} total billed${
                  oldestUnpaidShare ? ` · oldest ${shortDate(oldestUnpaidShare.expenseDate)}` : ''
                }`
              : 'No bills recorded yet'}
          </Text>

          <View style={styles.overlapBarWrap}>
            <SplitBar value={collectedPct} />
          </View>

          {/* Compact Action Pair Positioned Cleanly Inside Card */}
          <View style={[styles.overlapFooter, { borderTopColor: C.line }]}>
            <Pressable
              onPress={() => {
                hapticLight();
                openPaymentForm(null);
              }}
              style={({ pressed }) => [
                styles.cardPrimaryBtn,
                { backgroundColor: C.forestInk },
                pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
              ]}>
              <IconWallet size={16} color={C.onInk} />
              <Text style={[styles.cardPrimaryBtnText, { color: C.onInk }]}>
                Record payment
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                hapticLight();
                openMemberForm(null);
              }}
              style={({ pressed }) => [
                styles.cardSecondaryBtn,
                { backgroundColor: C.sunken, borderColor: C.line },
                pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
              ]}>
              <Text style={[styles.cardSecondaryBtnText, { color: C.ink }]}>Add person</Text>
            </Pressable>
          </View>
        </View>

        {/* Soft Mint Feature Card (Chime mint banner adapted to real Personal Daily Log) */}
        <Pressable
          onPress={() => {
            hapticLight();
            router.push('/calendar');
          }}
          style={({ pressed }) => [
            styles.mintCard,
            { backgroundColor: C.mintCardBg, borderColor: C.mintCardBorder },
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}>
          <View style={styles.mintCardContent}>
            <Text style={[styles.mintCardTitle, { color: C.mintCardInk }]}>
              {thisMonthLabel} daily log:{' '}
              <Text style={tabular}>{formatPHP(thisMonthCalTotal)}</Text>
            </Text>
            <Text style={[styles.mintCardSub, { color: C.mintCardInk }]}>
              {thisMonthCalExpenses.length > 0
                ? `${thisMonthCalExpenses.length} personal ${
                    thisMonthCalExpenses.length === 1 ? 'entry' : 'entries'
                  } logged this month · separate from splits`
                : 'Log personal daily spending separately from shared bills'}
            </Text>
            <View style={styles.mintCardLinkRow}>
              <Text style={[styles.mintCardLink, { color: C.mintCardInk }]}>
                Open calendar
              </Text>
              <IconChevronRight size={13} color={C.mintCardInk} />
            </View>
          </View>

          <View style={[styles.mintLeafBadge, { backgroundColor: C.mintBadgeBg }]}>
            <IconCalendar size={24} color={C.mintBadgeIcon} />
          </View>
        </Pressable>

        {/* Chime-Style 2-Column Financial Tools Section */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.bigSectionTitle, { color: C.forestInk }]}>Ledger tools</Text>
          <View style={styles.toolsGrid}>
            <Pressable
              onPress={() => {
                hapticLight();
                router.replace('/payments');
              }}
              style={({ pressed }) => [
                styles.toolCard,
                { backgroundColor: C.surface, borderColor: C.line },
                pressed && { backgroundColor: C.sunken },
              ]}>
              <View style={styles.toolCardTop}>
                <Text style={[styles.toolCardTitle, { color: C.forestInk }]}>To collect</Text>
                <IconChevronRight size={14} color={C.muted} />
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[styles.toolCardMetric, { color: C.ink }]}>
                {unpaidShareCount} {unpaidShareCount === 1 ? 'share' : 'shares'}
              </Text>
              <Text style={[styles.toolCardSub, { color: C.muted }]} numberOfLines={1}>
                {debtors > 0
                  ? `${debtors} ${debtors === 1 ? 'person' : 'people'} owing`
                  : 'All settled'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                hapticLight();
                router.push('/reports');
              }}
              style={({ pressed }) => [
                styles.toolCard,
                { backgroundColor: C.surface, borderColor: C.line },
                pressed && { backgroundColor: C.sunken },
              ]}>
              <View style={styles.toolCardTop}>
                <Text style={[styles.toolCardTitle, { color: C.forestInk }]}>Reports</Text>
                <IconChevronRight size={14} color={C.muted} />
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[styles.toolCardMetric, { color: C.ink }]}>
                {formatPHP(sevenDayTotal)}
              </Text>
              <Text style={[styles.toolCardSub, { color: C.muted }]} numberOfLines={1}>
                Last 7 days billed
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Preserved Core Section: Who Owes You (with 1-Tap Pay) */}
        <View style={styles.sectionBlock}>
          <SectionLabel
            action={
              members.length > 0 ? (
                <Pressable hitSlop={8} onPress={() => router.replace('/members')}>
                  <Text style={[styles.sectionLink, { color: C.forestInk }]}>
                    All ({members.length})
                  </Text>
                </Pressable>
              ) : undefined
            }>
            Who owes you
          </SectionLabel>
          <ListGroup>
            {members.length === 0 ? (
              <MobileEmpty
                code="MB"
                title="No people yet"
                description="Add the friends or housemates you split bills with."
                actionLabel="Add person"
                onAction={() => openMemberForm(null)}
              />
            ) : ranked.length === 0 ? (
              <MobileEmpty
                code="OK"
                title="Nobody owes anything"
                description="Balances appear once someone is included in a bill."
              />
            ) : (
              ranked.map((m) => {
                const pct = m.assignedCents > 0 ? (m.paidCents / m.assignedCents) * 100 : 100;
                const settled = m.balanceCents <= 0;
                return (
                  <View key={m.id} style={styles.debtorRow}>
                    <Pressable
                      onPress={() => router.push(`/members/${m.id}`)}
                      style={({ pressed }) => [
                        styles.debtorRowMain,
                        pressed && { backgroundColor: C.sunken },
                      ]}>
                      <Avatar name={m.name} id={m.id} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.rowTitle, { color: C.ink }]} numberOfLines={1}>
                          {m.name}
                        </Text>
                        <Text style={[styles.rowSub, { color: C.muted }]} numberOfLines={1}>
                          {formatPHP(m.paidCents)} of {formatPHP(m.assignedCents)} paid
                        </Text>
                        <MiniMeter value={pct} />
                      </View>
                      <Amount
                        value={formatPHP(Math.max(m.balanceCents, 0))}
                        caption={settled ? 'settled' : 'remaining'}
                        tone={settled ? 'paid' : 'owed'}
                      />
                    </Pressable>

                    {!settled ? (
                      <Pressable
                        accessibilityLabel={`Record payment for ${m.name}`}
                        hitSlop={4}
                        onPress={() => {
                          hapticLight();
                          openPaymentForm({ memberId: m.id });
                        }}
                        style={({ pressed }) => [
                          styles.quickPayBtn,
                          { backgroundColor: C.sunken, borderColor: C.line },
                          pressed && { opacity: 0.78 },
                        ]}>
                        <Text style={[styles.quickPayText, { color: C.ink }]}>Pay</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.settledChevronWrap}>
                        <IconChevronRight size={14} color={C.muted} />
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ListGroup>
        </View>

        {/* Preserved Core Section: Latest Bills */}
        <View style={styles.sectionBlock}>
          <SectionLabel
            action={
              expenses.length > 0 ? (
                <Pressable hitSlop={8} onPress={() => router.replace('/expenses')}>
                  <Text style={[styles.sectionLink, { color: C.forestInk }]}>
                    See all ({expenses.length})
                  </Text>
                </Pressable>
              ) : undefined
            }>
            Latest bills
          </SectionLabel>
          <ListGroup>
            {recent.length === 0 ? (
              <MobileEmpty
                code="EX"
                title="No expenses yet"
                description="Bills you log will appear here, newest first."
                actionLabel="Add expense"
                onAction={() => openExpenseForm(null)}
              />
            ) : (
              recent.map((e) => {
                const count = (e.userShareCents > 0 ? 1 : 0) + e.shares.length;
                return (
                  <ListRow
                    key={e.id}
                    onPress={() => openExpenseDetail(e)}
                    leading={<CategoryGlyph category={e.category} />}
                    title={e.description}
                    subtitle={`${shortDate(e.date)} · ${e.category} · ${count} ${
                      count === 1 ? 'person' : 'people'
                    }`}
                    trailing={
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={T.amount}>{formatPHP(e.totalCents)}</Text>
                        <StatusText status={e.status} />
                      </View>
                    }
                  />
                );
              })
            )}
          </ListGroup>
        </View>

        {/* Preserved Core Section: Spending Activity (7D | 14D Monochrome Chart) */}
        {expenses.length > 0 && (
          <View style={styles.sectionBlock}>
            <SectionLabel
              action={
                <Pressable hitSlop={8} onPress={() => router.push('/reports')}>
                  <Text style={[styles.sectionLink, { color: C.forestInk }]}>Reports</Text>
                </Pressable>
              }>
              Spending activity
            </SectionLabel>
            <View
              style={[
                styles.pulseCard,
                { backgroundColor: C.surface, borderColor: C.line },
              ]}>
              <View style={styles.pulseTopBar}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pulseMuted, { color: C.muted }]}>
                    {selectedDay
                      ? `${selectedDay.label} · ${selectedDay.count} ${
                          selectedDay.count === 1 ? 'bill' : 'bills'
                        }`
                      : `Last ${pulseDays} days total`}
                  </Text>
                  <Text style={[styles.pulseTotal, { color: C.ink }]}>
                    {formatPHP(selectedDay ? selectedDay.totalCents : windowTotal)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.rangeToggle,
                    { backgroundColor: C.sunken, borderColor: C.line },
                  ]}>
                  {([7, 14] as const).map((days) => {
                    const active = pulseDays === days;
                    return (
                      <Pressable
                        key={days}
                        onPress={() => {
                          hapticLight();
                          setPulseDays(days);
                          setSelectedDayKey(null);
                        }}
                        style={[
                          styles.rangeToggleBtn,
                          active && { backgroundColor: C.surface },
                        ]}>
                        <Text
                          style={[
                            styles.rangeToggleText,
                            { color: active ? C.ink : C.muted },
                          ]}>
                          {days}D
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.pulseBarsRow}>
                {daily.map((d) => {
                  const h =
                    d.totalCents > 0 ? Math.max(16, Math.round((d.totalCents / maxDay) * 100)) : 8;
                  const active = selectedDayKey === d.key;
                  const dimmed = Boolean(selectedDayKey && !active);
                  const barBg = active
                    ? C.forestInk
                    : d.totalCents > 0
                      ? C.ink2
                      : C.sunken;

                  return (
                    <Pressable
                      key={d.key}
                      accessibilityLabel={`${d.label}: ${formatPHP(d.totalCents)}`}
                      onPress={() => {
                        hapticLight();
                        setSelectedDayKey((prev) => (prev === d.key ? null : d.key));
                      }}
                      style={styles.pulseBarCol}>
                      <View
                        style={[
                          styles.pulseBar,
                          {
                            height: `${h}%`,
                            backgroundColor: barBg,
                            opacity: dimmed ? 0.3 : 1,
                          },
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.pulseAxisRow}>
                <Text style={[styles.pulseAxisText, { color: C.muted }]}>{daily[0]?.label}</Text>
                <Text style={[styles.pulseAxisText, { color: C.muted }]}>Today</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </MobileScreenWrapper>
  );
}

const cardElevation = Platform.select({
  ios: {
    shadowColor: '#09090B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
  },
  android: {
    elevation: 4,
  },
  default: {
    boxShadow: '0 6px 20px rgba(9, 9, 11, 0.07)',
  },
});

const styles = StyleSheet.create({
  heroCanopy: {
    width: '100%',
    paddingBottom: 92,
    overflow: 'hidden',
    position: 'relative',
  },
  heroInner: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: METRICS.screenPad,
  },
  heroUtilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  heroUtilityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarBtn: {
    width: 36,
    height: 36,
    marginLeft: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  heroEmeraldPill: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: R.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroEmeraldPillText: {
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  heroBalanceBlock: {
    marginTop: 22,
  },
  heroHeading: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  heroAmountText: {
    fontSize: 40,
    fontWeight: '400',
    letterSpacing: -1.2,
    flexShrink: 1,
    ...tabular,
  },
  heroAccentLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  heroAccentLink: {
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.2,
    ...tabular,
  },
  bodyWrap: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: METRICS.screenPad,
    marginTop: -66,
    gap: 22,
  },
  overlapCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    ...cardElevation,
  },
  overlapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  overlapTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  overlapAmount: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginTop: 10,
    ...tabular,
  },
  overlapSub: {
    fontSize: 13,
    marginTop: 4,
    ...tabular,
  },
  overlapBarWrap: {
    marginTop: 14,
  },
  overlapFooter: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
  },
  cardPrimaryBtn: {
    flex: 1.25,
    height: 44,
    borderRadius: R.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  cardPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  cardSecondaryBtn: {
    flex: 0.9,
    height: 44,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  mintCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mintCardContent: {
    flex: 1,
    gap: 6,
  },
  mintCardTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 21,
  },
  mintCardSub: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.82,
  },
  mintCardLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  mintCardLink: {
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  mintLeafBadge: {
    width: 60,
    height: 60,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBlock: {
    gap: 0,
  },
  bigSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  toolsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  toolCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  toolCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolCardTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  toolCardMetric: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginTop: 4,
    ...tabular,
  },
  toolCardSub: {
    fontSize: 12.5,
  },
  sectionLink: {
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  debtorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
  },
  debtorRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 14,
    gap: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  rowSub: {
    fontSize: 13,
    marginTop: 2,
    ...tabular,
  },
  quickPayBtn: {
    height: 40,
    minWidth: 54,
    paddingHorizontal: 14,
    borderRadius: R.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  settledChevronWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCard: {
    borderRadius: R.lg,
    padding: 16,
    borderWidth: 1,
  },
  pulseTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pulseMuted: {
    fontSize: 12.5,
  },
  pulseTotal: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginTop: 2,
    ...tabular,
  },
  rangeToggle: {
    flexDirection: 'row',
    borderRadius: R.sm,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  rangeToggleBtn: {
    minWidth: 38,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeToggleText: {
    fontSize: 12,
    fontWeight: '600',
    ...tabular,
  },
  pulseBarsRow: {
    marginTop: 18,
    height: 68,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  pulseBarCol: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  pulseBar: {
    width: '100%',
    borderRadius: 4,
  },
  pulseAxisRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pulseAxisText: {
    fontSize: 12,
    fontWeight: '500',
    ...tabular,
  },
});
