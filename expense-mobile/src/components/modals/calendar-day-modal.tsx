import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { IconClose, IconTrash } from '@/components/icons';
import { SwipeableRow } from '@/components/swipeable-row';
import { useLedger } from '@/context/ledger-context';
import { useAppTheme } from '@/context/theme-context';
import { bottomSafePad, R, tabular } from '@/design/tokens';
import {
  CalendarExpense,
  deleteCalendarExpense,
  saveCalendarExpense,
} from '@/lib/actions';
import { formatDate, formatDateLong } from '@/lib/dates';
import { centsToDecimal, formatPHP, sumCents } from '@/lib/money';

export function CalendarDayModal({
  dateIso,
  onClose,
}: {
  dateIso: string | null;
  onClose: () => void;
}) {
  const { C, T } = useAppTheme();
  const { calendarExpenses, refresh, showToast } = useLedger();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

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
    }
  }, [dateIso]);

  function startEdit(item: CalendarExpense) {
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

  async function handleDelete(item: CalendarExpense) {
    setPending(true);
    const res = await deleteCalendarExpense(item.id);
    setPending(false);
    if (!res.ok) {
      showToast(res.error || 'Could not delete expense', 'error');
      return;
    }
    if (editingId === item.id) {
      cancelEdit();
    }
    await refresh(true);
    showToast('Expense removed');
  }

  const inputTheme = {
    borderColor: C.lineStrong,
    color: C.ink,
    backgroundColor: C.surface,
  };

  return (
    <Modal visible={Boolean(dateIso)} transparent animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.backdrop, { backgroundColor: C.scrim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !pending && onClose()} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <View style={[styles.handle, { backgroundColor: C.lineStrong }]} />
            <View style={[styles.header, { borderBottomColor: C.line }]}>
              <View style={{ flex: 1 }}>
                <Text style={T.micro}>Daily expenses</Text>
                <Text style={[styles.title, { color: C.ink }]}>
                  {dateIso ? formatDateLong(dateIso) : ''}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close"
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: C.sunken }]}>
                <IconClose size={13} color={C.ink2} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={{ gap: 18, paddingBottom: 12 }}
              keyboardShouldPersistTaps="handled">
              {/* Input Form for Expense Name & Amount */}
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
                  <Pressable onPress={cancelEdit} style={styles.cancelEditBtn}>
                    <Text style={[styles.cancelEditText, { color: C.muted }]}>Cancel editing</Text>
                  </Pressable>
                )}

                {error ? <Text style={[styles.errorText, { color: C.owed }]}>{error}</Text> : null}
              </View>

              {/* Day's Expense List (with Swipe-to-Delete) */}
              <View style={{ gap: 8 }}>
                <View style={styles.listHeaderRow}>
                  <Text style={T.micro}>Logged on this day</Text>
                  <Text style={[styles.countText, { color: C.muted }]}>
                    {dayItems.length} {dayItems.length === 1 ? 'item' : 'items'}
                    {dayItems.length > 0 ? ' · swipe left to delete' : ''}
                  </Text>
                </View>

                {dayItems.length === 0 ? (
                  <View style={[styles.emptyBox, { borderColor: C.line }]}>
                    <Text style={[styles.emptyText, { color: C.muted }]}>
                      No expenses recorded for this date yet.
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.itemsCard, { borderColor: C.line }]}>
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
                            actionIcon={<IconTrash size={14} color="#FFFFFF" strokeWidth={1.7} />}
                            onAction={() => handleDelete(item)}>
                            <View
                              style={[
                                styles.itemRow,
                                isEditing && { backgroundColor: C.paper },
                              ]}>
                              <View style={{ flex: 1 }}>
                                <Text style={T.bodyStrong} numberOfLines={2}>
                                  {item.name}
                                </Text>
                                <View style={styles.itemActions}>
                                  <Pressable onPress={() => startEdit(item)}>
                                    <Text style={[styles.itemEditLink, { color: C.ink2 }]}>
                                      Edit
                                    </Text>
                                  </Pressable>
                                  <Text style={[styles.dotSep, { color: C.faint }]}>·</Text>
                                  <Pressable disabled={pending} onPress={() => handleDelete(item)}>
                                    <Text style={[styles.itemDeleteLink, { color: C.owed }]}>
                                      Delete
                                    </Text>
                                  </Pressable>
                                </View>
                              </View>
                              <Text style={[styles.itemAmount, { color: C.ink }]}>
                                {formatPHP(item.amountCents)}
                              </Text>
                            </View>
                          </SwipeableRow>
                        </React.Fragment>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Below the modal: Total expenses for that day */}
            <View
              style={[
                styles.totalFooter,
                { backgroundColor: C.cardBg, borderTopColor: C.cardBorder },
              ]}>
              <View>
                <Text style={[styles.totalLabel, { color: C.cardMuted }]}>
                  TOTAL FOR {dateIso ? formatDate(dateIso).toUpperCase() : 'DAY'}
                </Text>
                <Text style={[styles.totalCountSub, { color: C.cardMuted }]}>
                  {dayItems.length} {dayItems.length === 1 ? 'expense' : 'expenses'}
                </Text>
              </View>
              <Text style={[styles.totalValue, { color: C.cardText }]}>
                {formatPHP(dayTotalCents)}
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginTop: 3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    height: 44,
    borderRadius: R.md,
    borderWidth: 1,
    paddingHorizontal: 13,
    fontSize: 15,
  },
  addBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelEditBtn: {
    alignSelf: 'flex-start',
  },
  cancelEditText: {
    fontSize: 12.5,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  errorText: {
    fontSize: 12.5,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countText: {
    fontSize: 11.5,
    ...tabular,
  },
  emptyBox: {
    borderRadius: R.lg,
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  itemEditLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  dotSep: {
    fontSize: 12,
  },
  itemDeleteLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '700',
    ...tabular,
  },
  totalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: bottomSafePad,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.0,
  },
  totalCountSub: {
    fontSize: 12,
    marginTop: 2,
    ...tabular,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.6,
    ...tabular,
  },
});
