import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconClose, IconTrash } from '@/components/icons';
import { BottomSheet, ConfirmModal, ErrorBanner, NumericDoneBar } from '@/components/mobile-ui';
import { SwipeableRow } from '@/components/swipeable-row';
import { useLedger } from '@/context/ledger-context';
import { useAppTheme } from '@/context/theme-context';
import { bottomSafePad, METRICS, R, tabular } from '@/design/tokens';
import {
  CalendarExpense,
  deleteCalendarExpense,
  saveCalendarExpense,
} from '@/lib/actions';
import { formatDate, formatDateLong } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import { centsToDecimal, formatPHP, sumCents } from '@/lib/money';

const CALENDAR_AMOUNT_ACCESSORY_ID = 'calendar-amount-done';

export function CalendarDayModal({
  dateIso,
  onClose,
}: {
  dateIso: string | null;
  onClose: () => void;
}) {
  const { C, T } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { calendarExpenses, refresh, showToast } = useLedger();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<CalendarExpense | null>(null);

  const dayItems = useMemo(
    () => (dateIso ? calendarExpenses.filter((e) => e.date === dateIso) : []),
    [calendarExpenses, dateIso]
  );

  const dayTotalCents = useMemo(
    () => sumCents(dayItems.map((e) => e.amountCents)),
    [dayItems]
  );

  useEffect(() => {
    if (dateIso) {
      setEditingId(null);
      setName('');
      setAmount('');
      setError('');
      setConfirmDeleteItem(null);
    }
  }, [dateIso]);

  function startEdit(item: CalendarExpense) {
    hapticLight();
    setEditingId(item.id);
    setName(item.name);
    setAmount(centsToDecimal(item.amountCents));
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setName('');
    setAmount('');
    setError('');
  }

  async function handleSubmit() {
    if (!dateIso) return;
    setError('');
    setPending(true);
    const res = await saveCalendarExpense({
      id: editingId ?? undefined,
      name,
      amount,
      expense_date: dateIso,
    });
    setPending(false);

    if (!res.ok) {
      setError(res.error || 'Could not save expense');
      return;
    }

    await refresh(true);
    showToast(editingId ? 'Expense updated' : 'Expense added');
    setEditingId(null);
    setName('');
    setAmount('');
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteItem) return;
    setPending(true);
    const res = await deleteCalendarExpense(confirmDeleteItem.id);
    setPending(false);
    if (!res.ok) {
      showToast(res.error || 'Could not delete expense', 'error');
      return;
    }
    if (editingId === confirmDeleteItem.id) {
      cancelEdit();
    }
    setConfirmDeleteItem(null);
    await refresh(true);
    showToast('Expense removed');
  }

  const inputTheme = {
    borderColor: C.line,
    color: C.ink,
    backgroundColor: C.surface,
  };

  const sheetHeader = (
    <View style={[styles.header, { borderBottomColor: C.line }]}>
      <View style={{ flex: 1 }}>
        <Text style={T.micro}>Personal daily log</Text>
        <Text style={[styles.title, { color: C.ink }]}>
          {dateIso ? formatDateLong(dateIso) : ''}
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Close"
        hitSlop={4}
        onPress={onClose}
        style={[styles.closeBtn, { backgroundColor: C.sunken }]}>
        <IconClose size={16} color={C.ink} />
      </Pressable>
    </View>
  );

  return (
    <>
      <BottomSheet
        open={Boolean(dateIso)}
        onClose={onClose}
        dismissible={!pending}
        maxHeight="90%"
        avoidKeyboard
        header={sheetHeader}>
        <ScrollView
          style={styles.body}
          contentContainerStyle={{ gap: 18, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          {/* Quick Entry Form */}
          <View
            style={[
              styles.formCard,
              { backgroundColor: C.paper, borderColor: C.line },
            ]}>
            <View style={styles.field}>
              <Text style={T.micro}>Expense name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                maxLength={200}
                placeholder="e.g. Lunch, Grab ride, Groceries"
                placeholderTextColor={C.faint}
                style={[styles.input, inputTheme]}
              />
            </View>

            <View style={styles.amountActionRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={T.micro}>Amount (₱)</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  inputAccessoryViewID={CALENDAR_AMOUNT_ACCESSORY_ID}
                  placeholder="0.00"
                  placeholderTextColor={C.faint}
                  onSubmitEditing={handleSubmit}
                  style={[styles.input, inputTheme, tabular]}
                />
              </View>

              <View style={styles.submitCol}>
                <Pressable
                  disabled={pending}
                  onPress={handleSubmit}
                  style={({ pressed }) => [
                    styles.addBtn,
                    { backgroundColor: C.ink },
                    pressed && { opacity: 0.88 },
                    pending && { opacity: 0.5 },
                  ]}>
                  {pending ? (
                    <ActivityIndicator size="small" color={C.onInk} />
                  ) : (
                    <Text style={[styles.addBtnText, { color: C.onInk }]}>
                      {editingId ? 'Save' : 'Add'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>

            {editingId && (
              <Pressable hitSlop={8} onPress={cancelEdit} style={styles.cancelEditBtn}>
                <Text style={[styles.cancelEditText, { color: C.muted }]}>Cancel editing</Text>
              </Pressable>
            )}

            <ErrorBanner message={error} />
          </View>

          {/* Day's Expense List (tap row to edit, swipe left to delete safely with confirmation) */}
          <View style={{ gap: 8 }}>
            <View style={styles.listHeaderRow}>
              <Text style={T.micro}>Logged on this day</Text>
              <Text style={[styles.countText, { color: C.muted }]}>
                {dayItems.length} {dayItems.length === 1 ? 'item' : 'items'}
                {dayItems.length > 0 ? ' · tap to edit · swipe to delete' : ''}
              </Text>
            </View>

            {dayItems.length === 0 ? (
              <View style={[styles.emptyBox, { borderColor: C.line }]}>
                <Text style={[styles.emptyText, { color: C.muted }]}>
                  No expenses recorded for this date yet.
                </Text>
              </View>
            ) : (
              <View style={[styles.itemsCard, { borderColor: C.line, backgroundColor: C.surface }]}>
                {dayItems.map((item, idx) => {
                  const isEditing = editingId === item.id;
                  return (
                    <React.Fragment key={item.id}>
                      {idx > 0 && (
                        <View style={[styles.divider, { backgroundColor: C.line }]} />
                      )}
                      <SwipeableRow
                        disabled={pending}
                        actionLabel="Delete"
                        actionTone="owed"
                        actionIcon={<IconTrash size={16} color="#FFFFFF" />}
                        onAction={() => setConfirmDeleteItem(item)}>
                        <Pressable
                          onPress={() => startEdit(item)}
                          style={({ pressed }) => [
                            styles.itemRow,
                            isEditing && { backgroundColor: C.sunken },
                            pressed && { backgroundColor: C.sunken },
                          ]}>
                          <View style={{ flex: 1 }}>
                            <Text style={T.bodyStrong} numberOfLines={2}>
                              {item.name}
                            </Text>
                            <Text style={[styles.itemEditHint, { color: C.muted }]}>
                              {isEditing ? 'Editing above…' : 'Tap to edit'}
                            </Text>
                          </View>
                          <Text style={[styles.itemAmount, { color: C.ink }]}>
                            {formatPHP(item.amountCents)}
                          </Text>
                        </Pressable>
                      </SwipeableRow>
                    </React.Fragment>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        <NumericDoneBar nativeID={CALENDAR_AMOUNT_ACCESSORY_ID} />

        {/* Clean Light Hairline Day Total Footer */}
        <View
          style={[
            styles.totalFooter,
            {
              backgroundColor: C.paper,
              borderTopColor: C.line,
              paddingBottom: Math.max(insets.bottom, bottomSafePad),
            },
          ]}>
          <View>
            <Text style={[styles.totalLabel, { color: C.muted }]}>
              TOTAL · {dateIso ? formatDate(dateIso).toUpperCase() : 'DAY'}
            </Text>
            <Text style={[styles.totalCountSub, { color: C.muted }]}>
              {dayItems.length} {dayItems.length === 1 ? 'expense' : 'expenses'}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={[styles.totalValue, { color: C.ink }]}>
            {formatPHP(dayTotalCents)}
          </Text>
        </View>
      </BottomSheet>

      <ConfirmModal
        open={Boolean(confirmDeleteItem)}
        onClose={() => setConfirmDeleteItem(null)}
        title={`Delete “${confirmDeleteItem?.name ?? ''}”?`}
        description={
          confirmDeleteItem
            ? `Remove ${formatPHP(confirmDeleteItem.amountCents)} from ${
                dateIso ? formatDate(dateIso) : 'this day'
              }. This can't be undone.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        loading={pending}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  formCard: {
    borderRadius: R.lg,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  field: {
    gap: 6,
  },
  amountActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  submitCol: {
    justifyContent: 'flex-end',
  },
  input: {
    height: METRICS.touchMin,
    borderRadius: R.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  addBtn: {
    height: METRICS.touchMin,
    paddingHorizontal: 22,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  cancelEditBtn: {
    alignSelf: 'flex-start',
  },
  cancelEditText: {
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  countText: {
    fontSize: 12,
    ...tabular,
  },
  emptyBox: {
    borderRadius: R.lg,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13.5,
  },
  itemsCard: {
    borderRadius: R.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: METRICS.rowMinHeight,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  itemEditHint: {
    fontSize: 12,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 15.5,
    fontWeight: '700',
    ...tabular,
  },
  totalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  totalCountSub: {
    fontSize: 12.5,
    marginTop: 2,
    ...tabular,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.66,
    ...tabular,
  },
});
