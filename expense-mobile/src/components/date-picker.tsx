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
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
} from '@/components/icons';
import { useAppTheme } from '@/context/theme-context';
import { R, tabular } from '@/design/tokens';
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
        <IconCalendar size={14} color={value ? C.ink : C.muted} />
        <Text
          numberOfLines={1}
          style={[
            styles.fieldText,
            compact && { fontSize: 13 },
            { color: value ? C.ink : C.faint },
          ]}>
          {value ? formatDate(value) : placeholder}
        </Text>
        {clearable && Boolean(value) && (
          <Pressable
            accessibilityLabel="Clear date"
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation();
              hapticLight();
              onChange('');
            }}
            style={styles.clearIconBtn}>
            <IconClose size={10} color={C.muted} />
          </Pressable>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={[styles.backdrop, { backgroundColor: C.scrim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View
            style={[
              styles.card,
              { backgroundColor: C.surface, borderColor: C.line },
            ]}>
            <View style={styles.header}>
              <Text style={T.micro}>{title}</Text>
              <Pressable
                accessibilityLabel="Close calendar"
                onPress={() => setOpen(false)}
                style={[styles.closeBtn, { backgroundColor: C.sunken }]}>
                <IconClose size={12} color={C.ink2} />
              </Pressable>
            </View>

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
                      { backgroundColor: C.owedSoft, borderColor: C.owedSoft },
                    ]}>
                    <Text style={[styles.quickChipText, { color: C.owed }]}>Clear</Text>
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
                <IconChevronLeft size={14} color={C.ink} strokeWidth={2} />
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
                <IconChevronRight size={14} color={C.ink} strokeWidth={2} />
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
            <View style={{ gap: 2 }}>
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
        </View>
      </Modal>
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
                backgroundColor: active ? C.ink : C.sunken,
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
    height: 44,
    borderRadius: R.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldBtnCompact: {
    height: 38,
    borderRadius: R.sm,
    paddingHorizontal: 10,
  },
  fieldText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    ...tabular,
  },
  clearIconBtn: {
    padding: 3,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: R.lg,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  quickChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: R.sm,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: R.md,
    borderWidth: 1,
    padding: 5,
  },
  monthArrow: {
    width: 32,
    height: 32,
    borderRadius: R.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.2,
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
    height: 36,
    borderRadius: R.sm,
    margin: 1,
  },
  weekdayText: {
    fontSize: 10.5,
    fontWeight: '700',
    paddingVertical: 4,
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '500',
    ...tabular,
  },
  presetScroll: {
    gap: 7,
    paddingVertical: 1,
  },
  presetChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: R.sm,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
