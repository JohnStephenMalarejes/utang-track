import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  setMonth,
  setYear,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
} from '@/components/icons';
import { MobileScreenWrapper } from '@/components/mobile-shell';
import {
  BigMoney,
  ListGroup,
  ListRow,
  MobileEmpty,
  PageTitleBar,
  SectionLabel,
} from '@/components/mobile-ui';
import { CalendarDayModal } from '@/components/modals/calendar-day-modal';
import { useLedger } from '@/context/ledger-context';
import { useAppTheme } from '@/context/theme-context';
import { R, tabular } from '@/design/tokens';
import { dayLabel } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import { formatPHP, sumCents } from '@/lib/money';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr',
  'May', 'Jun', 'Jul', 'Aug',
  'Sep', 'Oct', 'Nov', 'Dec',
];

function formatCompactCellAmount(cents: number): string {
  const pesos = cents / 100;
  if (pesos >= 10000) return `₱${(pesos / 1000).toFixed(0)}k`;
  if (pesos >= 1000) return `₱${(pesos / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (cents % 100 === 0) return `₱${Math.round(pesos)}`;
  return `₱${pesos.toFixed(0)}`;
}

export default function CalendarScreen() {
  const { C, T } = useAppTheme();
  const { calendarExpenses } = useLedger();

  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(() => new Date().getFullYear());

  const currentMonthKey = format(viewMonth, 'yyyy-MM');
  const todayMonthKey = format(new Date(), 'yyyy-MM');
  const viewingCurrentMonth = currentMonthKey === todayMonthKey;

  const dayTotals = useMemo(() => {
    const map = new Map<string, { totalCents: number; count: number }>();
    for (const e of calendarExpenses) {
      const prev = map.get(e.date);
      if (prev) {
        prev.totalCents += e.amountCents;
        prev.count += 1;
      } else {
        map.set(e.date, { totalCents: e.amountCents, count: 1 });
      }
    }
    return map;
  }, [calendarExpenses]);

  const monthTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of calendarExpenses) {
      const ym = e.date.slice(0, 7);
      map.set(ym, (map.get(ym) || 0) + e.amountCents);
    }
    return map;
  }, [calendarExpenses]);

  const activeYears = useMemo(() => {
    const yrs = new Set<number>([new Date().getFullYear()]);
    for (const e of calendarExpenses) {
      const y = parseInt(e.date.slice(0, 4), 10);
      if (!Number.isNaN(y)) yrs.add(y);
    }
    return [...yrs].sort((a, b) => a - b);
  }, [calendarExpenses]);

  const monthExpenses = useMemo(
    () => calendarExpenses.filter((e) => e.date.startsWith(currentMonthKey)),
    [calendarExpenses, currentMonthKey]
  );

  const monthTotalCents = useMemo(
    () => sumCents(monthExpenses.map((e) => e.amountCents)),
    [monthExpenses]
  );

  const activeDaysInMonth = useMemo(
    () => new Set(monthExpenses.map((e) => e.date)).size,
    [monthExpenses]
  );

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const rows: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      rows.push(allDays.slice(i, i + 7));
    }
    return rows;
  }, [viewMonth]);

  function openMonthYearPicker() {
    hapticLight();
    setPickerYear(viewMonth.getFullYear());
    setPickerOpen(true);
  }

  function selectMonthFromPicker(monthIdx: number) {
    hapticLight();
    setViewMonth(startOfMonth(setMonth(setYear(viewMonth, pickerYear), monthIdx)));
    setPickerOpen(false);
  }

  function handleDayPress(day: Date) {
    hapticLight();
    const iso = format(day, 'yyyy-MM-dd');
    if (!isSameMonth(day, viewMonth)) {
      setViewMonth(startOfMonth(day));
    }
    setSelectedDate(iso);
  }

  return (
    <MobileScreenWrapper>
      <PageTitleBar
        eyebrow="Monthly Ledger"
        title="Calendar"
        subtitle="Tap any date to log or review expenses"
      />

      <View style={styles.stack}>
        {/* Month / Year Navigator */}
        <View style={styles.navBar}>
          <Pressable
            accessibilityLabel="Previous month"
            onPress={() => {
              hapticLight();
              setViewMonth((m) => startOfMonth(subMonths(m, 1)));
            }}
            style={({ pressed }) => [
              styles.navArrowBtn,
              { backgroundColor: C.surface, borderColor: C.line },
              pressed && { backgroundColor: C.sunken },
            ]}>
            <IconChevronLeft size={15} color={C.ink} strokeWidth={2} />
          </Pressable>

          <Pressable
            onPress={openMonthYearPicker}
            style={({ pressed }) => [
              styles.monthPickerBtn,
              { backgroundColor: C.surface, borderColor: C.line },
              pressed && { opacity: 0.75 },
            ]}>
            <Text style={[styles.monthPickerTitle, { color: C.ink }]}>
              {format(viewMonth, 'MMMM yyyy')}
            </Text>
            <IconChevronDown size={12} color={C.muted} strokeWidth={1.9} />
          </Pressable>

          <View style={styles.navRightGroup}>
            {!viewingCurrentMonth && (
              <Pressable
                onPress={() => {
                  hapticLight();
                  setViewMonth(startOfMonth(new Date()));
                }}
                style={({ pressed }) => [
                  styles.todayBtn,
                  { backgroundColor: C.sunken, borderColor: C.line },
                  pressed && { opacity: 0.8 },
                ]}>
                <Text style={[styles.todayBtnText, { color: C.ink }]}>Today</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityLabel="Next month"
              onPress={() => {
                hapticLight();
                setViewMonth((m) => startOfMonth(addMonths(m, 1)));
              }}
              style={({ pressed }) => [
                styles.navArrowBtn,
                { backgroundColor: C.surface, borderColor: C.line },
                pressed && { backgroundColor: C.sunken },
              ]}>
              <IconChevronRight size={15} color={C.ink} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* Real 7-Column Calendar Grid */}
        <View
          style={[
            styles.calendarCard,
            { backgroundColor: C.surface, borderColor: C.line },
          ]}>
          {/* Weekday Headers */}
          <View
            style={[
              styles.weekdayRow,
              { backgroundColor: C.paper, borderBottomColor: C.line },
            ]}>
            {WEEKDAYS.map((w) => (
              <View key={w} style={styles.weekdayCell}>
                <Text style={[styles.weekdayLabel, { color: C.muted }]}>{w}</Text>
              </View>
            ))}
          </View>

          {/* Weeks */}
          {weeks.map((week, wIdx) => (
            <View
              key={wIdx}
              style={[
                styles.weekRow,
                wIdx < weeks.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: C.line,
                },
              ]}>
              {week.map((day, dIdx) => {
                const iso = format(day, 'yyyy-MM-dd');
                const inMonth = isSameMonth(day, viewMonth);
                const today = isToday(day);
                const info = dayTotals.get(iso);
                const hasSpend = Boolean(info && info.totalCents > 0);
                const isSelected = selectedDate === iso;

                return (
                  <Pressable
                    key={iso}
                    onPress={() => handleDayPress(day)}
                    style={({ pressed }) => [
                      styles.dayCell,
                      { backgroundColor: inMonth ? C.surface : C.paper },
                      dIdx < 6 && { borderRightWidth: 1, borderRightColor: C.line },
                      isSelected && { backgroundColor: C.sunken },
                      pressed && { backgroundColor: C.sunken },
                    ]}>
                    <View
                      style={[
                        styles.dayNumberBadge,
                        today && { backgroundColor: C.ink },
                      ]}>
                      <Text
                        style={[
                          styles.dayNumberText,
                          { color: inMonth ? C.ink : C.faint },
                          today && { color: C.onInk, fontWeight: '700' },
                        ]}>
                        {format(day, 'd')}
                      </Text>
                    </View>

                    {hasSpend && info ? (
                      <View style={styles.daySpendWrap}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.daySpendText,
                            { color: inMonth ? C.owed : C.faint },
                          ]}>
                          {formatCompactCellAmount(info.totalCents)}
                        </Text>
                        <View
                          style={[
                            styles.dayDot,
                            { backgroundColor: inMonth ? C.owed : C.faint },
                          ]}
                        />
                      </View>
                    ) : (
                      <View style={styles.daySpendPlaceholder} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Below the calendar: Total amount for the whole month */}
        <View
          style={[
            styles.monthSummaryCard,
            { backgroundColor: C.cardBg, borderColor: C.cardBorder },
          ]}>
          <View style={styles.monthSummaryTop}>
            <Text style={[styles.monthSummaryEyebrow, { color: C.cardMuted }]}>
              MONTHLY TOTAL · {format(viewMonth, 'MMMM yyyy').toUpperCase()}
            </Text>
          </View>
          <View style={{ marginTop: 8 }}>
            <BigMoney cents={monthTotalCents} size={36} light />
          </View>
          <Text style={[styles.monthSummarySub, { color: C.cardMuted }]}>
            {monthExpenses.length > 0
              ? `${monthExpenses.length} ${monthExpenses.length === 1 ? 'expense' : 'expenses'} across ${activeDaysInMonth} ${activeDaysInMonth === 1 ? 'day' : 'days'}`
              : `No expenses recorded in ${format(viewMonth, 'MMMM yyyy')}`}
          </Text>
        </View>

        {/* Reviewable List of Expenses in the Selected Month */}
        <View>
          <SectionLabel
            action={
              monthExpenses.length > 0 ? (
                <Text style={[styles.sectionCount, { color: C.muted }]}>
                  {monthExpenses.length} {monthExpenses.length === 1 ? 'entry' : 'entries'}
                </Text>
              ) : undefined
            }>
            {format(viewMonth, 'MMMM yyyy')} entries
          </SectionLabel>
          <ListGroup>
            {monthExpenses.length === 0 ? (
              <MobileEmpty
                code="CL"
                title={`Nothing in ${format(viewMonth, 'MMMM yyyy')}`}
                description="Tap any date on the calendar above to record an expense for that day."
              />
            ) : (
              monthExpenses.map((item) => (
                <ListRow
                  key={item.id}
                  onPress={() => setSelectedDate(item.date)}
                  title={item.name}
                  subtitle={dayLabel(item.date)}
                  trailing={<Text style={T.amount}>{formatPHP(item.amountCents)}</Text>}
                />
              ))
            )}
          </ListGroup>
        </View>
      </View>

      {/* Clicked Day Modal */}
      <CalendarDayModal
        dateIso={selectedDate}
        onClose={() => setSelectedDate(null)}
      />

      {/* Month & Year Picker Modal */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}>
        <View style={[styles.pickerBackdrop, { backgroundColor: C.scrim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(false)} />
          <View
            style={[
              styles.pickerCard,
              { backgroundColor: C.surface, borderColor: C.line },
            ]}>
            <View style={styles.pickerHeader}>
              <Text style={T.micro}>Jump to month & year</Text>
              <Pressable
                onPress={() => setPickerOpen(false)}
                style={[styles.pickerCloseBtn, { backgroundColor: C.sunken }]}>
                <IconClose size={12} color={C.ink2} />
              </Pressable>
            </View>

            {/* Year Stepper */}
            <View
              style={[
                styles.yearRow,
                { backgroundColor: C.paper, borderColor: C.line },
              ]}>
              <Pressable
                accessibilityLabel="Previous year"
                onPress={() => setPickerYear((y) => y - 1)}
                style={({ pressed }) => [
                  styles.yearArrowBtn,
                  { backgroundColor: C.surface, borderColor: C.line },
                  pressed && { backgroundColor: C.sunken },
                ]}>
                <IconChevronLeft size={15} color={C.ink} strokeWidth={2} />
              </Pressable>
              <Text style={[styles.yearValue, { color: C.ink }]}>{pickerYear}</Text>
              <Pressable
                accessibilityLabel="Next year"
                onPress={() => setPickerYear((y) => y + 1)}
                style={({ pressed }) => [
                  styles.yearArrowBtn,
                  { backgroundColor: C.surface, borderColor: C.line },
                  pressed && { backgroundColor: C.sunken },
                ]}>
                <IconChevronRight size={15} color={C.ink} strokeWidth={2} />
              </Pressable>
            </View>

            {activeYears.length > 1 && (
              <View style={styles.quickYearsRow}>
                {activeYears.map((yr) => {
                  const active = yr === pickerYear;
                  return (
                    <Pressable
                      key={yr}
                      onPress={() => setPickerYear(yr)}
                      style={[
                        styles.yearChip,
                        { backgroundColor: C.sunken, borderColor: C.line },
                        active && { backgroundColor: C.ink, borderColor: C.ink },
                      ]}>
                      <Text
                        style={[
                          styles.yearChipText,
                          { color: active ? C.onInk : C.ink2 },
                        ]}>
                        {yr}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* 12-Month Grid */}
            <View style={styles.monthGrid}>
              {MONTH_NAMES.map((mName, idx) => {
                const ym = `${pickerYear}-${String(idx + 1).padStart(2, '0')}`;
                const mTotal = monthTotals.get(ym) || 0;
                const isSelectedMonth = ym === currentMonthKey;

                return (
                  <Pressable
                    key={mName}
                    onPress={() => selectMonthFromPicker(idx)}
                    style={({ pressed }) => [
                      styles.monthTile,
                      { borderColor: C.line, backgroundColor: C.paper },
                      isSelectedMonth && { backgroundColor: C.ink, borderColor: C.ink },
                      pressed && { opacity: 0.8 },
                    ]}>
                    <Text
                      style={[
                        styles.monthTileName,
                        { color: isSelectedMonth ? C.onInk : C.ink },
                      ]}>
                      {mName}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.monthTileAmount,
                        {
                          color: isSelectedMonth
                            ? C.onInkMuted
                            : mTotal > 0
                              ? C.owed
                              : C.faint,
                        },
                      ]}>
                      {mTotal > 0 ? formatCompactCellAmount(mTotal) : '—'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 18,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: R.md,
    borderWidth: 1,
  },
  monthPickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  navRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayBtn: {
    height: 36,
    paddingHorizontal: 11,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarCard: {
    borderRadius: R.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  weekdayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  weekdayCell: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  weekdayLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    minHeight: 62,
    paddingVertical: 7,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: {
    fontSize: 12.5,
    fontWeight: '600',
    ...tabular,
  },
  daySpendWrap: {
    alignItems: 'center',
    gap: 2,
  },
  daySpendText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.2,
    ...tabular,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  daySpendPlaceholder: {
    height: 16,
  },
  monthSummaryCard: {
    borderRadius: R.lg,
    padding: 18,
    borderWidth: 1,
  },
  monthSummaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthSummaryEyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.0,
  },
  monthSummarySub: {
    fontSize: 13,
    marginTop: 8,
    ...tabular,
  },
  sectionCount: {
    fontSize: 12,
    ...tabular,
  },
  pickerBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: R.lg,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: R.md,
    borderWidth: 1,
    padding: 6,
  },
  yearArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: R.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearValue: {
    fontSize: 18,
    fontWeight: '700',
    ...tabular,
  },
  quickYearsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  yearChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: R.sm,
    borderWidth: 1,
  },
  yearChipText: {
    fontSize: 12,
    fontWeight: '600',
    ...tabular,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthTile: {
    width: '23%',
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  monthTileName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  monthTileAmount: {
    fontSize: 10.5,
    fontWeight: '600',
    ...tabular,
  },
});
