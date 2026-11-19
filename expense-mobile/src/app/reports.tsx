import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DatePickerField, DateRangePresets } from '@/components/date-picker';
import { MobileScreenWrapper } from '@/components/mobile-shell';
import {
  Amount,
  Avatar,
  CategoryGlyph,
  ChipRow,
  ExportPillButton,
  ListGroup,
  ListRow,
  MiniMeter,
  MobileEmpty,
  PageTitleBar,
  SectionLabel,
  SplitBar,
  StatusText,
  UnderlineTabs,
} from '@/components/mobile-ui';
import { useLedger } from '@/context/ledger-context';
import { useAppTheme } from '@/context/theme-context';
import { R, tabular } from '@/design/tokens';
import { categoryTotals, expenseEntries, summarize, total } from '@/lib/analytics';
import { shortDate, todayISO } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import { statusFor } from '@/lib/ledger';
import { formatPHP, sumCents } from '@/lib/money';
import { exportLedgerSummaryPdf } from '@/lib/pdf';

const GRANULARITY: ['daily' | 'weekly' | 'monthly', string][] = [
  ['daily', 'Daily'],
  ['weekly', 'Weekly'],
  ['monthly', 'Monthly'],
];

const REPORT_TABS = [
  { id: 'trends', label: 'Trends' },
  { id: 'balances', label: 'Balances' },
  { id: 'categories', label: 'Categories' },
  { id: 'payments', label: 'Payments' },
];

export default function ReportsScreen() {
  const router = useRouter();
  const { C, T } = useAppTheme();
  const { ledger, openExpenseForm } = useLedger();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [memberId, setMemberId] = useState('');
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [tab, setTab] = useState('trends');
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string | null>(null);

  const filtersActive = Boolean(from || to || memberId);

  const scoped = useMemo(
    () =>
      ledger.expenses.filter(
        (e) =>
          (!from || e.date >= from) &&
          (!to || e.date <= to) &&
          (!memberId || e.shares.some((s) => s.memberId === memberId))
      ),
    [ledger.expenses, from, to, memberId]
  );

  const entries = useMemo(() => expenseEntries(scoped, memberId), [scoped, memberId]);
  const periods = useMemo(() => summarize(entries, granularity), [entries, granularity]);
  const visiblePeriods = useMemo(() => periods.slice(-14), [periods]);
  const categories = useMemo(() => categoryTotals(entries), [entries]);

  const selectedPeriod = useMemo(
    () =>
      selectedPeriodKey
        ? visiblePeriods.find((p) => p.key === selectedPeriodKey) ?? null
        : null,
    [visiblePeriods, selectedPeriodKey]
  );

  const balances = useMemo(() => {
    const shares = scoped.flatMap((e) => e.shares).filter((s) => !memberId || s.memberId === memberId);
    return ledger.members
      .filter((m) => !memberId || m.id === memberId)
      .map((m) => {
        const own = shares.filter((s) => s.memberId === m.id);
        const assigned = sumCents(own.map((s) => s.owedCents));
        const paid = sumCents(own.map((s) => s.paidCents));
        return {
          id: m.id,
          name: m.name,
          count: own.length,
          assigned,
          paid,
          balance: assigned - paid,
          status: own.length ? statusFor(assigned, paid) : 'none',
        };
      })
      .filter((r) => r.count > 0);
  }, [scoped, ledger.members, memberId]);

  const outstandingCents = sumCents(balances.map((b) => Math.max(b.balance, 0)));
  const settledCents = sumCents(balances.map((b) => b.paid));

  const payments = useMemo(
    () =>
      ledger.payments.filter(
        (p) =>
          (!from || p.date >= from) &&
          (!to || p.date <= to) &&
          (!memberId || p.memberId === memberId)
      ),
    [ledger.payments, from, to, memberId]
  );

  const memberOptions = useMemo(
    () => [
      { value: '', label: 'All members' },
      ...ledger.members.map((m) => ({ value: m.id, label: m.name })),
    ],
    [ledger.members]
  );

  const clear = () => {
    setFrom('');
    setTo('');
    setMemberId('');
    setSelectedPeriodKey(null);
  };

  if (ledger.expenses.length === 0 && ledger.payments.length === 0) {
    return (
      <MobileScreenWrapper>
        <PageTitleBar eyebrow="Insights" title="Reports" subtitle="Summaries, balances and trends." />
        <ListGroup>
          <MobileEmpty
            code="RP"
            title="Nothing to report yet"
            description="Reports are built from your expenses and payments. Add an expense and this page will fill in."
            actionLabel="Add first expense"
            onAction={() => openExpenseForm(null)}
          />
        </ListGroup>
      </MobileScreenWrapper>
    );
  }

  const maxPeriodCents = Math.max(...visiblePeriods.map((p) => p.totalCents), 1);
  const totalSpentCents = total(entries);
  const collectionTotal = settledCents + outstandingCents;
  const collectionPct = collectionTotal > 0 ? (settledCents / collectionTotal) * 100 : 0;

  return (
    <MobileScreenWrapper>
      <PageTitleBar
        eyebrow="Insights"
        title="Reports"
        subtitle={`${scoped.length} ${scoped.length === 1 ? 'bill' : 'bills'} · ${formatPHP(
          totalSpentCents
        )} spent`}
        right={
          <ExportPillButton
            label="Export report"
            onPress={() =>
              exportLedgerSummaryPdf({
                filename: `debt-tracker-report-${todayISO()}.pdf`,
                shareTitle: 'Debt Tracker Report',
                members: ledger.members.filter((m) => !memberId || m.id === memberId),
                expenses: scoped,
                allExpenses: ledger.expenses,
              })
            }
          />
        }
      />

      <View style={styles.stack}>
        {/* Filters Card */}
        <View
          style={[
            styles.filtersCard,
            { backgroundColor: C.surface, borderColor: C.line },
          ]}>
          <View style={{ gap: 8 }}>
            <Text style={T.micro}>Date range</Text>
            <DateRangePresets
              from={from}
              to={to}
              onSelectRange={(nextFrom, nextTo) => {
                setFrom(nextFrom);
                setTo(nextTo);
                setSelectedPeriodKey(null);
              }}
            />
            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <DatePickerField
                  compact
                  clearable
                  title="From date"
                  placeholder="From date"
                  value={from}
                  onChange={(v) => {
                    setFrom(v);
                    setSelectedPeriodKey(null);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <DatePickerField
                  compact
                  clearable
                  title="To date"
                  placeholder="To date"
                  value={to}
                  onChange={(v) => {
                    setTo(v);
                    setSelectedPeriodKey(null);
                  }}
                />
              </View>
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={T.micro}>Member</Text>
            <ChipRow
              options={memberOptions}
              value={memberId}
              onChange={(val) => {
                setMemberId(val);
                setSelectedPeriodKey(null);
              }}
            />
          </View>

          {filtersActive && (
            <Pressable onPress={clear}>
              <Text style={[styles.clearBtnText, { color: C.owed }]}>Clear filters</Text>
            </Pressable>
          )}
        </View>

        {scoped.length === 0 && payments.length === 0 ? (
          <ListGroup>
            <MobileEmpty
              code="00"
              title="No records in this range"
              description="Widen the date range or choose a different member."
              actionLabel="Clear filters"
              onAction={clear}
            />
          </ListGroup>
        ) : (
          <>
            {/* 2x2 KPI Ledger Strip */}
            <View
              style={[
                styles.kpiGrid,
                { backgroundColor: C.surface, borderColor: C.line },
              ]}>
              <View
                style={[
                  styles.kpiCell,
                  { borderRightWidth: 1, borderBottomWidth: 1, borderColor: C.line },
                ]}>
                <Text style={T.micro}>Total expenses</Text>
                <Text style={[styles.kpiValue, { color: C.ink }]}>
                  {formatPHP(totalSpentCents)}
                </Text>
                <Text style={[styles.kpiHint, { color: C.muted }]}>
                  {scoped.length} {scoped.length === 1 ? 'transaction' : 'transactions'}
                </Text>
              </View>
              <View
                style={[
                  styles.kpiCell,
                  { borderBottomWidth: 1, borderColor: C.line },
                ]}>
                <Text style={T.micro}>Outstanding</Text>
                <Text
                  style={[
                    styles.kpiValue,
                    { color: outstandingCents > 0 ? C.owed : C.ink },
                  ]}>
                  {formatPHP(outstandingCents)}
                </Text>
                <Text style={[styles.kpiHint, { color: C.muted }]}>Still owed in range</Text>
              </View>
              <View
                style={[
                  styles.kpiCell,
                  { borderRightWidth: 1, borderColor: C.line },
                ]}>
                <Text style={T.micro}>Settled</Text>
                <Text
                  style={[
                    styles.kpiValue,
                    { color: settledCents > 0 ? C.paid : C.ink },
                  ]}>
                  {formatPHP(settledCents)}
                </Text>
                <Text style={[styles.kpiHint, { color: C.muted }]}>Paid back in range</Text>
              </View>
              <View style={styles.kpiCell}>
                <Text style={T.micro}>Payments</Text>
                <Text style={[styles.kpiValue, { color: C.ink }]}>
                  {formatPHP(sumCents(payments.map((p) => p.amountCents)))}
                </Text>
                <Text style={[styles.kpiHint, { color: C.muted }]}>
                  {payments.length} {payments.length === 1 ? 'payment' : 'payments'}
                </Text>
              </View>
            </View>

            <UnderlineTabs tabs={REPORT_TABS} value={tab} onChange={setTab} />

            {/* Tab: Trends (Interactive Tap-to-Inspect Bars) */}
            {tab === 'trends' && (
              <View style={{ gap: 18 }}>
                <View
                  style={[
                    styles.chartCard,
                    { backgroundColor: C.surface, borderColor: C.line },
                  ]}>
                  <View style={styles.chartHeader}>
                    <View>
                      <Text style={T.heading}>Spending</Text>
                      <Text style={T.small}>Tap any bar to inspect</Text>
                    </View>
                    <View
                      style={[
                        styles.granularityGroup,
                        { backgroundColor: C.sunken },
                      ]}>
                      {GRANULARITY.map(([val, label]) => {
                        const active = granularity === val;
                        return (
                          <Pressable
                            key={val}
                            onPress={() => {
                              hapticLight();
                              setGranularity(val);
                              setSelectedPeriodKey(null);
                            }}
                            style={[
                              styles.granularityBtn,
                              active && { backgroundColor: C.surface },
                            ]}>
                            <Text
                              style={[
                                styles.granularityText,
                                { color: active ? C.ink : C.muted },
                              ]}>
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {selectedPeriod && (
                    <View
                      style={[
                        styles.calloutBanner,
                        { backgroundColor: C.paper, borderColor: C.line },
                      ]}>
                      <View>
                        <Text style={[styles.calloutDate, { color: C.ink }]}>
                          {selectedPeriod.label}
                        </Text>
                        <Text style={[styles.calloutMeta, { color: C.muted }]}>
                          {selectedPeriod.count}{' '}
                          {selectedPeriod.count === 1 ? 'bill' : 'bills'}
                        </Text>
                      </View>
                      <Text style={[styles.calloutAmount, { color: C.owed }]}>
                        {formatPHP(selectedPeriod.totalCents)}
                      </Text>
                    </View>
                  )}

                  {visiblePeriods.length === 0 ? (
                    <MobileEmpty code="00" title="No expenses in this range" />
                  ) : (
                    <View style={styles.barsContainer}>
                      {visiblePeriods.map((p) => {
                        const pct = Math.max(10, Math.round((p.totalCents / maxPeriodCents) * 100));
                        const active = selectedPeriodKey === p.key;
                        const dimmed = Boolean(selectedPeriodKey && !active);
                        return (
                          <Pressable
                            key={p.key}
                            onPress={() => {
                              hapticLight();
                              setSelectedPeriodKey((prev) => (prev === p.key ? null : p.key));
                            }}
                            style={styles.barColumn}>
                            <View style={[styles.barTrack, { backgroundColor: C.sunken }]}>
                              <View
                                style={[
                                  styles.barFill,
                                  {
                                    height: `${pct}%`,
                                    backgroundColor: active ? C.owed : C.ink,
                                    opacity: dimmed ? 0.35 : 1,
                                  },
                                ]}
                              />
                            </View>
                            <Text
                              style={[
                                styles.barLabel,
                                { color: active ? C.ink : C.muted },
                                active && { fontWeight: '700' },
                              ]}
                              numberOfLines={1}>
                              {p.label.replace('Week of ', '')}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>

                {periods.length > 0 && (
                  <View>
                    <SectionLabel>By period</SectionLabel>
                    <ListGroup>
                      {[...periods].reverse().map((r) => (
                        <ListRow
                          key={r.key}
                          onPress={() => {
                            hapticLight();
                            setSelectedPeriodKey((prev) => (prev === r.key ? null : r.key));
                          }}
                          title={r.label}
                          subtitle={`${r.count} ${r.count === 1 ? 'bill' : 'bills'}`}
                          trailing={
                            <Text
                              style={[
                                T.amount,
                                selectedPeriodKey === r.key && { color: C.owed },
                              ]}>
                              {formatPHP(r.totalCents)}
                            </Text>
                          }
                        />
                      ))}
                    </ListGroup>
                  </View>
                )}
              </View>
            )}

            {/* Tab: Balances */}
            {tab === 'balances' && (
              <View style={{ gap: 18 }}>
                <View
                  style={[
                    styles.chartCard,
                    { backgroundColor: C.surface, borderColor: C.line },
                  ]}>
                  <Text style={T.heading}>Collection</Text>
                  <Text style={T.small}>For records in this report</Text>
                  <View style={{ marginTop: 14 }}>
                    <SplitBar value={collectionPct} />
                  </View>
                  <View style={styles.collectionLegend}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.legendDot, { backgroundColor: C.paid }]} />
                      <Text style={[styles.legendText, { color: C.ink }]}>
                        Settled: {formatPHP(settledCents)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.legendDot, { backgroundColor: C.ink }]} />
                      <Text style={[styles.legendText, { color: C.ink }]}>
                        Owed: {formatPHP(outstandingCents)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View>
                  <SectionLabel>People</SectionLabel>
                  <ListGroup>
                    {balances.length === 0 ? (
                      <MobileEmpty code="00" title="No balances in this range" />
                    ) : (
                      balances.map((b) => (
                        <ListRow
                          key={b.id}
                          onPress={() => router.push(`/members/${b.id}`)}
                          leading={<Avatar name={b.name} id={b.id} />}
                          title={b.name}
                          subtitle={`Paid ${formatPHP(b.paid)} of ${formatPHP(b.assigned)}`}
                          trailing={
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={[T.amount, b.balance > 0 && { color: C.owed }]}>
                                {formatPHP(b.balance)}
                              </Text>
                              <StatusText status={b.status} />
                            </View>
                          }
                        />
                      ))
                    )}
                  </ListGroup>
                </View>
              </View>
            )}

            {/* Tab: Categories */}
            {tab === 'categories' && (
              <View>
                <SectionLabel>Totals</SectionLabel>
                <ListGroup>
                  {categories.map((c) => {
                    const pct = (c.totalCents / (totalSpentCents || 1)) * 100;
                    return (
                      <ListRow
                        key={c.category}
                        leading={<CategoryGlyph category={c.category} />}
                        title={c.category}
                        subtitle={`${pct.toFixed(1)}% of spending`}
                        trailing={<Amount value={formatPHP(c.totalCents)} />}>
                        <MiniMeter value={pct} />
                      </ListRow>
                    );
                  })}
                </ListGroup>
              </View>
            )}

            {/* Tab: Payments */}
            {tab === 'payments' && (
              <ListGroup>
                {payments.length === 0 ? (
                  <MobileEmpty
                    code="PY"
                    title="No payments in this range"
                    description="Payments will appear here after they are recorded."
                  />
                ) : (
                  payments.slice(0, 50).map((p) => (
                    <ListRow
                      key={p.id}
                      leading={<Avatar name={p.memberName} id={p.memberId} />}
                      title={p.memberName}
                      subtitle={`${p.expenseDescription} · ${shortDate(p.date)}`}
                      trailing={
                        <Text style={[styles.positiveAmount, { color: C.paid }]}>
                          +{formatPHP(p.amountCents)}
                        </Text>
                      }
                    />
                  ))
                )}
              </ListGroup>
            )}
          </>
        )}
      </View>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 18,
  },
  filtersCard: {
    borderRadius: R.lg,
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  clearBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: R.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  kpiCell: {
    width: '50%',
    padding: 14,
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 4,
    ...tabular,
  },
  kpiHint: {
    fontSize: 11.5,
    marginTop: 2,
  },
  chartCard: {
    borderRadius: R.lg,
    padding: 16,
    borderWidth: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  granularityGroup: {
    flexDirection: 'row',
    borderRadius: R.sm,
    padding: 2,
  },
  granularityBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  granularityText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  calloutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: R.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  calloutDate: {
    fontSize: 13,
    fontWeight: '700',
  },
  calloutMeta: {
    fontSize: 11.5,
    marginTop: 1,
  },
  calloutAmount: {
    fontSize: 16,
    fontWeight: '700',
    ...tabular,
  },
  barsContainer: {
    height: 148,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 10,
  },
  barColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    maxWidth: 24,
    justifyContent: 'flex-end',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barLabel: {
    fontSize: 9.5,
    marginTop: 6,
    ...tabular,
  },
  collectionLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 12.5,
    fontWeight: '600',
    ...tabular,
  },
  positiveAmount: {
    fontSize: 14.5,
    fontWeight: '600',
    ...tabular,
  },
});
