import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
} from '@/components/icons';
import { BottomSheet } from '@/components/mobile-ui';
import { useAppTheme } from '@/context/theme-context';
import { bottomSafePad, METRICS, R, tabular } from '@/design/tokens';
import { formatDate, todayISO } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function safeParseMonth(iso?: string): Date {
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    try {
      return startOfMonth(parseISO(iso));
    } catch {
      // fall through
    }
  }
  return startOfMonth(new Date());
}

export function DatePickerField({
  value,
  onChange,
  placeholder = 'Select date',
  title = 'Select date',
  clearable = false,
  showQuickPresets = false,
  compact = false,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  title?: string;
  clearable?: boolean;
  showQuickPresets?: boolean;
  compact?: boolean;
}) {
  const { C, T } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => safeParseMonth(value));

  useEffect(() => {
    if (open) {
      setViewMonth(safeParseMonth(value));
    }
  }, [open, value]);

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end });
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    return rows;
  }, [viewMonth]);

  const today = todayISO();
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  function handleSelect(iso: string) {
    hapticLight();
    onChange(iso);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={() => {
          hapticLight();
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.fieldBtn,
          compact && styles.fieldBtnCompact,
          {
            backgroundColor: C.surface,
            borderColor: value ? C.lineStrong : C.line,
          },
          pressed && { opacity: 0.78 },
        ]}>
        <IconCalendar size={15} color={value ? C.ink : C.muted} strokeWidth={1.5} />
        <Text
          numberOfLines={1}
          style={[
            styles.fieldText,
            compact && { fontSize: 13.5 },
            { color: value ? C.ink : C.faint },
          ]}>
          {value ? formatDate(value) : placeholder}
        </Text>
        {clearable && Boolean(value) && (
          <Pressable
            accessibilityLabel="Clear date"
            hitSlop={10}
            onPress={(e) => {
              e.stopPropagation();
              hapticLight();
              onChange('');
            }}
            style={styles.clearIconBtn}>
            <IconClose size={11} color={C.muted} />
          </Pressable>
        )}
      </Pressable>

      {/* Native Draggable Bottom Sheet Date Picker */}
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        header={
          <View style={styles.header}>
            <Text style={T.micro}>{title}</Text>
            <Pressable
              accessibilityLabel="Close calendar"
              hitSlop={4}
              onPress={() => setOpen(false)}
              style={[styles.closeBtn, { backgroundColor: C.sunken }]}>
              <IconClose size={15} color={C.ink} />
            </Pressable>
          </View>
        }>
        <View
          style={[
            styles.sheetBody,
            { paddingBottom: Math.max(insets.bottom, bottomSafePad) },
          ]}>

          {showQuickPresets && (
            <View style={styles.quickRow}>
              {[
                { label: 'Today', iso: today },
                { label: 'Yesterday', iso: yesterday },
              ].map((preset) => {
                const active = value === preset.iso;
                return (
                  <Pressable
                    key={preset.label}
                    onPress={() => handleSelect(preset.iso)}
                    style={[
                      styles.quickChip,
                      {
                        backgroundColor: active ? C.ink : C.sunken,
                        borderColor: active ? C.ink : C.line,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.quickChipText,
                        { color: active ? C.onInk : C.ink2 },
                      ]}>
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
              {clearable && Boolean(value) && (
                <Pressable
                  onPress={() => handleSelect('')}
                  style={[
                    styles.quickChip,
                    { backgroundColor: C.sunken, borderColor: C.line },
                  ]}>
                  <Text style={[styles.quickChipText, { color: C.muted }]}>Clear</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Month navigation */}
          <View
            style={[
              styles.monthNav,
              { backgroundColor: C.paper, borderColor: C.line },
            ]}>
            <Pressable
              accessibilityLabel="Previous month"
              onPress={() => setViewMonth((m) => startOfMonth(subMonths(m, 1)))}
              style={[
                styles.monthArrow,
                { backgroundColor: C.surface, borderColor: C.line },
              ]}>
              <IconChevronLeft size={15} color={C.ink} strokeWidth={1.8} />
            </Pressable>
            <Text style={[styles.monthTitle, { color: C.ink }]}>
              {format(viewMonth, 'MMMM yyyy')}
            </Text>
            <Pressable
              accessibilityLabel="Next month"
              onPress={() => setViewMonth((m) => startOfMonth(addMonths(m, 1)))}
              style={[
                styles.monthArrow,
                { backgroundColor: C.surface, borderColor: C.line },
              ]}>
              <IconChevronRight size={15} color={C.ink} strokeWidth={1.8} />
            </Pressable>
          </View>

          {/* Weekday header */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <View key={`${w}-${i}`} style={styles.dayCell}>
                <Text style={[styles.weekdayText, { color: C.muted }]}>{w}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          <View style={{ gap: 4 }}>
            {weeks.map((week, wIdx) => (
              <View key={wIdx} style={styles.weekRow}>
                {week.map((day) => {
                  const iso = format(day, 'yyyy-MM-dd');
                  const inMonth = isSameMonth(day, viewMonth);
                  const isSelected = value === iso;
                  const todayFlag = isToday(day);

                  return (
                    <Pressable
                      key={iso}
                      onPress={() => handleSelect(iso)}
                      style={({ pressed }) => [
                        styles.dayCell,
                        styles.dayBtn,
                        isSelected && { backgroundColor: C.ink },
                        !isSelected && todayFlag && {
                          borderWidth: 1,
                          borderColor: C.ink,
                        },
                        pressed && !isSelected && { backgroundColor: C.sunken },
                      ]}>
                      <Text
                        style={[
                          styles.dayNum,
                          { color: inMonth ? C.ink : C.faint },
                          todayFlag && !isSelected && { fontWeight: '700' },
                          isSelected && { color: C.onInk, fontWeight: '700' },
                        ]}>
                        {format(day, 'd')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </BottomSheet>
    </>
  );
}

export function DateRangePresets({
  from,
  to,
  onSelectRange,
}: {
  from: string;
  to: string;
  onSelectRange: (nextFrom: string, nextTo: string) => void;
}) {
  const { C } = useAppTheme();

  const presets = useMemo(() => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const last30 = format(subDays(now, 29), 'yyyy-MM-dd');
    return [
      { id: 'all', label: 'All time', from: '', to: '' },
      { id: 'week', label: 'This week', from: weekStart, to: todayStr },
      { id: 'month', label: 'This month', from: monthStart, to: todayStr },
      { id: '30d', label: 'Last 30 days', from: last30, to: todayStr },
    ];
  }, []);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.presetScroll}>
      {presets.map((p) => {
        const active = from === p.from && to === p.to;
        return (
          <Pressable
            key={p.id}
            onPress={() => {
              hapticLight();
              onSelectRange(p.from, p.to);
            }}
            style={({ pressed }) => [
              styles.presetChip,
              {
                backgroundColor: active ? C.ink : C.surface,
                borderColor: active ? C.ink : C.line,
              },
              pressed && { opacity: 0.8 },
            ]}>
            <Text
              style={[
                styles.presetText,
                { color: active ? C.onInk : C.ink2 },
              ]}>
              {p.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fieldBtn: {
    height: METRICS.touchMin,
    borderRadius: R.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  fieldBtnCompact: {
    height: 40,
    borderRadius: R.sm,
    paddingHorizontal: 12,
  },
  fieldText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '500',
    ...tabular,
  },
  clearIconBtn: {
    padding: 4,
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: R.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: R.md,
    borderWidth: 1,
    padding: 6,
  },
  monthArrow: {
    width: 38,
    height: 38,
    borderRadius: R.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBtn: {
    height: 42,
    borderRadius: R.sm,
    margin: 1,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 4,
  },
  dayNum: {
    fontSize: 14,
    fontWeight: '500',
    ...tabular,
  },
  presetScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: R.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});
