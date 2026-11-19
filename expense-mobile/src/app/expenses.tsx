import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DatePickerField, DateRangePresets } from '@/components/date-picker';
import { IconFilter } from '@/components/icons';
import { MobileScreenWrapper } from '@/components/mobile-shell';
import {
  CategoryGlyph,
  ChipRow,
  ExportPillButton,
  ListGroup,
  ListRow,
  MobileEmpty,
  PageTitleBar,
  PaginationBar,
  SearchField,
  SectionLabel,
  StatusText,
  UnderlineTabs,
} from '@/components/mobile-ui';
import { useLedger } from '@/context/ledger-context';
import { useAppTheme } from '@/context/theme-context';
import { R, tabular } from '@/design/tokens';
import { CATEGORIES, PAGE_SIZE } from '@/lib/constants';
import { dayLabel, groupByDate, todayISO } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import { formatPHP, sumCents } from '@/lib/money';
import { exportLedgerSummaryPdf } from '@/lib/pdf';

interface Filters {
  query: string;
  from: string;
  to: string;
  category: string;
  member: string;
  status: string;
}

const NO_FILTERS: Filters = {
  query: '',
  from: '',
  to: '',
  category: '',
  member: '',
  status: '',
};

export default function ExpensesScreen() {
  const { C, T } = useAppTheme();
  const { ledger, openExpenseForm, openExpenseDetail } = useLedger();
  const { expenses, members } = ledger;

  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const setFilter = (key: keyof Filters, val: string) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  };

  const setDateRange = (from: string, to: string) => {
    setFilters((f) => ({ ...f, from, to }));
    setPage(1);
  };

  const filtersActive = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const extraFilterCount = [filters.category, filters.member, filters.from, filters.to].filter(
    Boolean
  ).length;

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return expenses.filter((e) => {
      if (filters.from && e.date < filters.from) return false;
      if (filters.to && e.date > filters.to) return false;
      if (filters.category && e.category !== filters.category) return false;
      if (filters.status && e.status !== filters.status) return false;
      if (filters.member && !e.shares.some((s) => s.memberId === filters.member)) return false;
      if (q) {
        const haystack = `${e.description} ${e.notes} ${e.category} ${e.paidByName ?? ''} ${e.shares
          .map((s) => s.memberName)
          .join(' ')}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const groupedRows = useMemo(() => groupByDate(rows, (e) => e.date), [rows]);
  const filteredTotal = useMemo(() => sumCents(filtered.map((e) => e.totalCents)), [filtered]);

  const statusTabs = useMemo(
    () => [
      { id: '', label: 'All', count: expenses.length },
      {
        id: 'unsettled',
        label: 'Unpaid',
        count: expenses.filter((e) => e.status === 'unsettled').length,
      },
      {
        id: 'partial',
        label: 'Partial',
        count: expenses.filter((e) => e.status === 'partial').length,
      },
      {
        id: 'settled',
        label: 'Settled',
        count: expenses.filter((e) => e.status === 'settled').length,
      },
    ],
    [expenses]
  );

  const categoryOptions = useMemo(
    () => [{ value: '', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))],
    []
  );

  const memberOptions = useMemo(
    () => [{ value: '', label: 'All people' }, ...members.map((m) => ({ value: m.id, label: m.name }))],
    [members]
  );

  return (
    <MobileScreenWrapper>
      <PageTitleBar
        eyebrow="Ledger"
        title="Expenses"
        subtitle={
          expenses.length > 0
            ? `${filtered.length} ${filtered.length === 1 ? 'bill' : 'bills'} · ${formatPHP(
                filteredTotal
              )}`
            : 'Shared bills and splits'
        }
        right={
          filtered.length > 0 ? (
            <ExportPillButton
              label="Export"
              onPress={() =>
                exportLedgerSummaryPdf({
                  filename: `debt-tracker-expenses-${todayISO()}.pdf`,
                  shareTitle: 'Debt Tracker Expenses',
                  members,
                  expenses: filtered,
                  allExpenses: expenses,
                })
              }
            />
          ) : undefined
        }
      />

      {expenses.length === 0 ? (
        <ListGroup>
          <MobileEmpty
            code="EX"
            title="No expenses yet"
            description="Add a bill, choose who shared it and how to split it, and it will show up here."
            actionLabel="Add first expense"
            onAction={() => openExpenseForm(null)}
          />
        </ListGroup>
      ) : (
        <View style={styles.stack}>
          <UnderlineTabs
            tabs={statusTabs}
            value={filters.status}
            onChange={(status) => setFilter('status', status)}
          />

          {/* Search + Filter Toggle */}
          <View style={styles.searchBarRow}>
            <SearchField
              value={filters.query}
              onChangeText={(q) => setFilter('query', q)}
              placeholder="Search bills, notes, people…"
            />
            <Pressable
              accessibilityLabel="Toggle filters"
              onPress={() => {
                hapticLight();
                setShowFilters((v) => !v);
              }}
              style={[
                styles.filterToggleBtn,
                { backgroundColor: C.surface, borderColor: C.line },
                (showFilters || extraFilterCount > 0) && {
                  backgroundColor: C.ink,
                  borderColor: C.ink,
                },
              ]}>
              <IconFilter
                size={16}
                color={showFilters || extraFilterCount > 0 ? C.onInk : C.ink}
              />
              {extraFilterCount > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: C.ink, borderColor: C.paper }]}>
                  <Text style={[styles.filterBadgeText, { color: C.onInk }]}>{extraFilterCount}</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Collapsible Extra Filters */}
          {showFilters && (
            <View
              style={[
                styles.filtersPanel,
                { backgroundColor: C.surface, borderColor: C.line },
              ]}>
              <View style={styles.filterGroup}>
                <Text style={T.micro}>Date range</Text>
                <DateRangePresets
                  from={filters.from}
                  to={filters.to}
                  onSelectRange={setDateRange}
                />
                <View style={styles.dateRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <DatePickerField
                      compact
                      clearable
                      title="From date"
                      placeholder="From date"
                      value={filters.from}
                      onChange={(v) => setFilter('from', v)}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <DatePickerField
                      compact
                      clearable
                      title="To date"
                      placeholder="To date"
                      value={filters.to}
                      onChange={(v) => setFilter('to', v)}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={T.micro}>Category</Text>
                <ChipRow
                  options={categoryOptions}
                  value={filters.category}
                  onChange={(val) => setFilter('category', val)}
                />
              </View>

              <View style={styles.filterGroup}>
                <Text style={T.micro}>Person</Text>
                <ChipRow
                  options={memberOptions}
                  value={filters.member}
                  onChange={(val) => setFilter('member', val)}
                />
              </View>

              {filtersActive && (
                <Pressable
                  onPress={() => {
                    hapticLight();
                    setFilters(NO_FILTERS);
                    setPage(1);
                  }}>
                  <Text style={[styles.resetFiltersText, { color: C.owed }]}>
                    Reset all filters
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Date-grouped feed */}
          {filtered.length === 0 ? (
            <ListGroup>
              <MobileEmpty
                code="00"
                title="No matching bills"
                description="Try widening the date range or clearing a filter."
                actionLabel="Clear filters"
                onAction={() => {
                  setFilters(NO_FILTERS);
                  setPage(1);
                }}
              />
            </ListGroup>
          ) : (
            <View style={{ gap: 20 }}>
              {groupedRows.map(([date, items]) => (
                <View key={date}>
                  <SectionLabel
                    action={
                      <Text style={[styles.dayTotalText, { color: C.muted }]}>
                        {formatPHP(sumCents(items.map((i) => i.totalCents)))}
                      </Text>
                    }>
                    {dayLabel(date)}
                  </SectionLabel>
                  <ListGroup>
                    {items.map((e) => {
                      const people = [
                        ...(e.userShareCents > 0 ? ['You'] : []),
                        ...e.shares.map((s) => s.memberName),
                      ];
                      return (
                        <ListRow
                          key={e.id}
                          onPress={() => openExpenseDetail(e)}
                          leading={<CategoryGlyph category={e.category} />}
                          title={e.description}
                          subtitle={`Paid by ${e.paidByName ?? 'You'} · ${people.join(', ')}`}
                          trailing={
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={T.amount}>{formatPHP(e.totalCents)}</Text>
                              <StatusText status={e.status} />
                            </View>
                          }
                        />
                      );
                    })}
                  </ListGroup>
                </View>
              ))}
              {filtered.length > PAGE_SIZE && (
                <ListGroup>
                  <PaginationBar
                    page={safePage}
                    pageSize={PAGE_SIZE}
                    total={filtered.length}
                    onPageChange={setPage}
                  />
                </ListGroup>
              )}
            </View>
          )}
        </View>
      )}
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
    ...tabular,
  },
  filtersPanel: {
    borderRadius: R.lg,
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  filterGroup: {
    gap: 8,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  resetFiltersText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  dayTotalText: {
    fontSize: 12,
    fontWeight: '600',
    ...tabular,
  },
});
