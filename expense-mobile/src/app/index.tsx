import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconCalendar, IconChevronRight, IconPlus } from '@/components/icons';
import { MobileScreenWrapper } from '@/components/mobile-shell';
import {
  Amount,
  Avatar,
  BigMoney,
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
import { R, tabular } from '@/design/tokens';
import { expenseEntries, lastDaysSeries } from '@/lib/analytics';
import { shortDate, todayISO } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import { formatPHP } from '@/lib/money';
import { exportLedgerSummaryPdf } from '@/lib/pdf';

export default function HomeScreen() {
  const router = useRouter();
  const { C, T } = useAppTheme();
  const {
    ledger,
    calendarExpenses,
    openExpenseForm,
    openPaymentForm,
    openMemberForm,
    openExpenseDetail,
  } = useLedger();

  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const { totals, members, expenses } = ledger;
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
  const daily = useMemo(() => lastDaysSeries(entries, 14), [entries]);

  const owedTotal = totals.settledCents + totals.outstandingCents;
  const collectedPct = owedTotal > 0 ? (totals.settledCents / owedTotal) * 100 : 0;
  const debtors = members.filter((m) => m.balanceCents > 0).length;

  const ranked = useMemo(
    () => [...members].filter((m) => m.expenseCount > 0).sort((a, b) => b.balanceCents - a.balanceCents),
    [members]
  );
  const recent = useMemo(() => expenses.slice(0, 6), [expenses]);
  const fourteenDayTotal = useMemo(() => daily.reduce((s, d) => s + d.totalCents, 0), [daily]);
  const maxDay = useMemo(() => Math.max(...daily.map((d) => d.totalCents), 1), [daily]);

  const selectedDay = useMemo(
    () => (selectedDayKey ? daily.find((d) => d.key === selectedDayKey) ?? null : null),
    [daily, selectedDayKey]
  );

  return (
    <MobileScreenWrapper>
      <View style={styles.stack}>
        {/* Statement Card — Dark focal summary */}
        <View
          style={[
            styles.statementCard,
            { backgroundColor: C.cardBg, borderColor: C.cardBorder },
          ]}>
          <View style={styles.statementTopRow}>
            <Text style={[styles.statementEyebrow, { color: C.cardMuted }]}>
              Outstanding receivable
            </Text>
            {(expenses.length > 0 || members.length > 0) && (
              <ExportPillButton
                dark
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

          <View style={{ marginTop: 10 }}>
            <BigMoney cents={totals.outstandingCents} size={40} light />
          </View>

          <Text style={[styles.statementSubtext, { color: C.cardMuted }]}>
            {totals.outstandingCents > 0
              ? `From ${debtors} ${debtors === 1 ? 'person' : 'people'} across ${totals.unsettledCount} open ${
                  totals.unsettledCount === 1 ? 'bill' : 'bills'
                }`
              : expenses.length > 0
                ? 'Everyone is settled up'
                : 'Add an expense to start splitting bills'}
          </Text>

          <View style={[styles.statementDivider, { backgroundColor: C.cardBorder }]} />

          <SplitBar value={collectedPct} dark />

          <View style={styles.statementFooter}>
            <View style={styles.statementStat}>
              <Text style={[styles.statementStatLabel, { color: C.cardMuted }]}>COLLECTED</Text>
              <Text style={[styles.statementStatValue, { color: C.cardText }]}>
                {formatPHP(totals.settledCents)}{' '}
                <Text style={[styles.statementStatPct, { color: C.cardMuted }]}>
                  ({Math.round(collectedPct)}%)
                </Text>
              </Text>
            </View>
            <View style={[styles.statementStat, { alignItems: 'flex-end' }]}>
              <Text style={[styles.statementStatLabel, { color: C.cardMuted }]}>TOTAL BILLED</Text>
              <Text style={[styles.statementStatValue, { color: C.cardText }]}>
                {formatPHP(totals.expensesCents)}
              </Text>
            </View>
          </View>
        </View>

        {/* Primary Action Strip */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => {
              hapticLight();
              openExpenseForm(null);
            }}
            style={({ pressed }) => [
              styles.actionBtnPrimary,
              { backgroundColor: C.ink },
              pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
            ]}>
            <IconPlus size={14} color={C.onInk} strokeWidth={2.1} />
            <Text style={[styles.actionBtnPrimaryText, { color: C.onInk }]}>New expense</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              hapticLight();
              openPaymentForm(null);
            }}
            style={({ pressed }) => [
              styles.actionBtnSecondary,
              { backgroundColor: C.surface, borderColor: C.lineStrong },
              pressed && { backgroundColor: C.sunken, transform: [{ scale: 0.985 }] },
            ]}>
            <Text style={[styles.actionBtnSecondaryText, { color: C.ink }]}>Record payment</Text>
          </Pressable>
        </View>

        {/* Monthly Expense Calendar Shortcut */}
        <View>
          <SectionLabel
            action={
              <Pressable onPress={() => router.push('/calendar')}>
                <Text style={[styles.sectionLink, { color: C.ink2 }]}>Open calendar</Text>
              </Pressable>
            }>
            Monthly expense calendar
          </SectionLabel>
          <ListGroup>
            <ListRow
              onPress={() => router.push('/calendar')}
              leading={
                <View
                  style={[
                    styles.calendarIconTile,
                    { backgroundColor: C.sunken, borderColor: C.line },
                  ]}>
                  <IconCalendar size={17} color={C.ink} />
                </View>
              }
              title={thisMonthLabel}
              subtitle={
                thisMonthCalExpenses.length > 0
                  ? `${thisMonthCalExpenses.length} ${
                      thisMonthCalExpenses.length === 1 ? 'entry' : 'entries'
                    } logged this month`
                  : 'Tap to log or review daily expenses'
              }
              trailing={
                <View style={styles.trailingRow}>
                  <Amount
                    value={formatPHP(thisMonthCalTotal)}
                    caption="month total"
                    tone={thisMonthCalTotal > 0 ? 'default' : 'muted'}
                  />
                  <IconChevronRight size={13} color={C.faint} />
                </View>
              }
            />
          </ListGroup>
        </View>

        {/* Who owes you */}
        <View>
          <SectionLabel
            action={
              members.length > 0 ? (
                <Pressable onPress={() => router.replace('/members')}>
                  <Text style={[styles.sectionLink, { color: C.ink2 }]}>
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
                actionLabel="Add member"
                onAction={() => openMemberForm(null)}
              />
            ) : ranked.length === 0 ? (
              <MobileEmpty
                code="00"
                title="Nobody owes anything"
                description="Balances appear once someone is included in a bill."
              />
            ) : (
              ranked.map((m) => {
                const pct = m.assignedCents > 0 ? (m.paidCents / m.assignedCents) * 100 : 100;
                return (
                  <ListRow
                    key={m.id}
                    onPress={() => router.push(`/members/${m.id}`)}
                    leading={<Avatar name={m.name} id={m.id} />}
                    title={m.name}
                    subtitle={`${formatPHP(m.paidCents)} of ${formatPHP(m.assignedCents)} paid`}
                    trailing={
                      <View style={styles.trailingRow}>
                        <Amount
                          value={formatPHP(Math.max(m.balanceCents, 0))}
                          caption={m.balanceCents > 0 ? 'owes' : 'settled'}
                          tone={m.balanceCents > 0 ? 'owed' : 'muted'}
                        />
                        <IconChevronRight size={13} color={C.faint} />
                      </View>
                    }>
                    <MiniMeter value={pct} />
                  </ListRow>
                );
              })
            )}
          </ListGroup>
        </View>

        {/* Latest bills */}
        <View>
          <SectionLabel
            action={
              expenses.length > 0 ? (
                <Pressable onPress={() => router.replace('/expenses')}>
                  <Text style={[styles.sectionLink, { color: C.ink2 }]}>
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

        {/* Interactive 14-day spending pulse */}
        {expenses.length > 0 && (
          <View>
            <SectionLabel
              action={
                <Pressable onPress={() => router.push('/reports')}>
                  <Text style={[styles.sectionLink, { color: C.ink2 }]}>Reports</Text>
                </Pressable>
              }>
              Last 14 days
            </SectionLabel>
            <View
              style={[
                styles.pulseCard,
                { backgroundColor: C.surface, borderColor: C.line },
              ]}>
              <View style={styles.pulseHeader}>
                <View>
                  <Text style={[styles.pulseMuted, { color: C.muted }]}>
                    {selectedDay
                      ? `${selectedDay.label} · ${selectedDay.count} ${
                          selectedDay.count === 1 ? 'bill' : 'bills'
                        }`
                      : '14-day total · tap a bar to inspect'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.pulseTotal,
                    { color: selectedDay && selectedDay.totalCents > 0 ? C.owed : C.ink },
                  ]}>
                  {formatPHP(selectedDay ? selectedDay.totalCents : fourteenDayTotal)}
                </Text>
              </View>
              <View style={styles.pulseBarsRow}>
                {daily.map((d) => {
                  const h =
                    d.totalCents > 0 ? Math.max(14, Math.round((d.totalCents / maxDay) * 100)) : 6;
                  const active = selectedDayKey === d.key;
                  const dimmed = Boolean(selectedDayKey && !active);
                  const barBg = active
                    ? C.owed
                    : d.totalCents > 0
                      ? C.ink
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
                            opacity: dimmed ? 0.35 : 1,
                          },
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.pulseAxisRow}>
                <Text style={[styles.pulseAxisText, { color: C.faint }]}>{daily[0]?.label}</Text>
                <Text style={[styles.pulseAxisText, { color: C.faint }]}>Today</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 24,
  },
  statementCard: {
    borderRadius: R.lg,
    padding: 18,
    borderWidth: 1,
  },
  statementTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  statementEyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  statementSubtext: {
    fontSize: 13,
    marginTop: 8,
  },
  statementDivider: {
    height: 1,
    marginVertical: 14,
  },
  statementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statementStat: {
    gap: 2,
  },
  statementStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  statementStatValue: {
    fontSize: 13.5,
    fontWeight: '600',
    ...tabular,
  },
  statementStatPct: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: -10,
  },
  actionBtnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: R.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  actionBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionBtnSecondary: {
    flex: 1,
    height: 44,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionLink: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  trailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarIconTile: {
    width: 36,
    height: 36,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCard: {
    borderRadius: R.lg,
    padding: 16,
    borderWidth: 1,
  },
  pulseHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  pulseMuted: {
    fontSize: 12.5,
  },
  pulseTotal: {
    fontSize: 15.5,
    fontWeight: '700',
    ...tabular,
  },
  pulseBarsRow: {
    marginTop: 14,
    height: 58,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  pulseBarCol: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    paddingVertical: 1,
  },
  pulseBar: {
    width: '100%',
    borderRadius: 2.5,
  },
  pulseAxisRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pulseAxisText: {
    fontSize: 10.5,
    ...tabular,
  },
});
