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
import { DatePickerField } from '@/components/date-picker';
import { IconCheck, IconClose } from '@/components/icons';
import { useLedger } from '@/context/ledger-context';
import { useAppTheme } from '@/context/theme-context';
import { bottomSafePad, R, tabular } from '@/design/tokens';
import { saveExpense } from '@/lib/actions';
import { CATEGORIES } from '@/lib/constants';
import { todayISO } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import { LedgerExpense, LedgerMember } from '@/lib/ledger';
import { centsToDecimal, formatPHP, parseAmount, splitEqual, sumCents } from '@/lib/money';

interface ExpenseFormData {
  description: string;
  category: string;
  total: string;
  date: string;
  paidBy: string;
  notes: string;
  mode: 'equal' | 'custom';
  includeUser: boolean;
  userCustom: string;
  selected: Record<string, boolean>;
  custom: Record<string, string>;
}

const blankForm = (): ExpenseFormData => ({
  description: '',
  category: 'Lunch',
  total: '',
  date: todayISO(),
  paidBy: '',
  notes: '',
  mode: 'equal',
  includeUser: true,
  userCustom: '',
  selected: {},
  custom: {},
});

function fromExpense(expense: LedgerExpense, members: LedgerMember[]): ExpenseFormData {
  const selected: Record<string, boolean> = {};
  const custom: Record<string, string> = {};
  for (const s of expense.shares) {
    selected[s.memberId] = true;
    custom[s.memberId] = centsToDecimal(s.amountCents);
  }
  const ordered = members.filter((m) => selected[m.id]);
  const includeUser = (expense.userShareCents ?? 0) > 0;
  const splitCount = ordered.length + (includeUser ? 1 : 0);
  const equal = splitEqual(expense.totalCents, splitCount);
  const isEqual =
    ordered.length > 0 &&
    ordered.every(
      (m, i) => expense.shares.find((s) => s.memberId === m.id)?.amountCents === equal[i + (includeUser ? 1 : 0)]
    );

  return {
    description: expense.description,
    category: expense.category,
    total: centsToDecimal(expense.totalCents),
    date: expense.date,
    paidBy: expense.paidBy ?? '',
    notes: expense.notes,
    mode: isEqual ? 'equal' : 'custom',
    includeUser,
    userCustom: includeUser ? centsToDecimal(expense.userShareCents) : '',
    selected,
    custom,
  };
}

export function ExpenseFormModal() {
  const { C, T } = useAppTheme();
  const { expenseFormState, closeExpenseForm, openMemberForm, ledger, refresh, showToast } = useLedger();
  const { open, expense } = expenseFormState;
  const editing = Boolean(expense);
  const { members } = ledger;

  const [form, setForm] = useState<ExpenseFormData>(blankForm);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(expense ? fromExpense(expense, members) : blankForm());
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense?.id]);

  const update = (patch: Partial<ExpenseFormData>) => setForm((f) => ({ ...f, ...patch }));

  const participants = useMemo(
    () => members.filter((m) => form.selected[m.id]),
    [members, form.selected]
  );
  const splitCount = participants.length + (form.includeUser ? 1 : 0);
  const totalCents = parseAmount(form.total);

  const { shareCents, userShareCents } = useMemo(() => {
    const out: Record<string, number | null> = {};
    let userCents: number | null = 0;
    if (form.mode === 'equal') {
      const parts = totalCents && splitCount > 0 ? splitEqual(totalCents, splitCount) : [];
      userCents = form.includeUser ? (parts[0] ?? null) : 0;
      participants.forEach((m, i) => {
        out[m.id] = parts[i + (form.includeUser ? 1 : 0)] ?? null;
      });
    } else {
      userCents = form.includeUser ? parseAmount(form.userCustom) : 0;
      participants.forEach((m) => {
        out[m.id] = parseAmount(form.custom[m.id]);
      });
    }
    return { shareCents: out, userShareCents: userCents };
  }, [form.mode, form.custom, form.includeUser, form.userCustom, participants, splitCount, totalCents]);

  const allMembersValid =
    participants.length > 0 && participants.every((m) => shareCents[m.id] !== null && shareCents[m.id]! > 0);
  const userValid = !form.includeUser || (userShareCents !== null && userShareCents > 0);
  const allValid = allMembersValid && userValid;
  const sharesTotal =
    (form.includeUser ? (userShareCents ?? 0) : 0) +
    sumCents(participants.map((m) => shareCents[m.id] ?? 0));
  const diff = totalCents ? totalCents - sharesTotal : 0;
  const mismatch = form.mode === 'custom' && totalCents !== null && participants.length > 0 && diff !== 0;

  function toggleMember(id: string) {
    hapticLight();
    const checked = !form.selected[id];
    update({
      selected: { ...form.selected, [id]: checked },
      custom: checked && form.custom[id] === undefined ? { ...form.custom, [id]: '' } : form.custom,
    });
  }

  function switchMode(mode: 'equal' | 'custom') {
    hapticLight();
    if (mode === 'custom' && form.mode === 'equal') {
      const custom = { ...form.custom };
      participants.forEach((m) => {
        const val = shareCents[m.id];
        if (val !== null && val !== undefined) custom[m.id] = centsToDecimal(val);
      });
      const userCustom =
        form.includeUser && userShareCents !== null && userShareCents !== undefined
          ? centsToDecimal(userShareCents)
          : form.userCustom;
      update({ mode, custom, userCustom });
    } else {
      update({ mode });
    }
  }

  function fillRemainingForUser() {
    if (totalCents === null) return;
    const target = (userShareCents ?? 0) + diff;
    if (target <= 0) return;
    hapticLight();
    update({ userCustom: centsToDecimal(target) });
  }

  function fillRemainingForMember(memberId: string) {
    if (totalCents === null) return;
    const target = (shareCents[memberId] ?? 0) + diff;
    if (target <= 0) return;
    hapticLight();
    update({ custom: { ...form.custom, [memberId]: centsToDecimal(target) } });
  }

  // Live sticky summary readout above footer
  const splitSummary = useMemo(() => {
    if (members.length === 0) return null;
    if (!totalCents || totalCents <= 0) {
      return {
        label: 'Enter total amount to calculate shares',
        tone: 'muted' as const,
      };
    }
    if (participants.length === 0) {
      return {
        label: `Total ${formatPHP(totalCents)} · select participants`,
        tone: 'muted' as const,
      };
    }
    if (form.mode === 'equal') {
      const perHead = splitEqual(totalCents, splitCount)[0] ?? 0;
      return {
        label: `Equal · ~${formatPHP(perHead)} each · ${splitCount} ${
          splitCount === 1 ? 'person' : 'people'
        }`,
        tone: 'paid' as const,
      };
    }
    if (diff === 0 && allValid) {
      return {
        label: `Balanced · ${formatPHP(totalCents)} assigned`,
        tone: 'paid' as const,
      };
    }
    if (diff > 0) {
      return {
        label: `${formatPHP(diff)} left to assign`,
        tone: 'partial' as const,
      };
    }
    if (diff < 0) {
      return {
        label: `${formatPHP(-diff)} over total`,
        tone: 'owed' as const,
      };
    }
    return {
      label: 'Enter each share above ₱0.00',
      tone: 'partial' as const,
    };
  }, [members.length, totalCents, participants.length, form.mode, splitCount, diff, allValid]);

  function validate(): string {
    if (!form.description.trim()) return 'Enter a description';
    if (!form.date) return 'Select the expense date';
    if (totalCents === null || totalCents <= 0)
      return 'Enter a total amount above ₱0.00 with at most 2 decimals';
    if (participants.length === 0) return 'Select at least one participant';
    if (!allValid)
      return form.mode === 'equal'
        ? 'The total is too small to give everyone at least ₱0.01'
        : 'Every participant needs an amount above ₱0.00';
    if (form.mode === 'custom' && diff !== 0)
      return `The shares are ${formatPHP(Math.abs(diff))} ${diff > 0 ? 'short of' : 'over'} the total`;
    return '';
  }

  async function handleSubmit() {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setPending(true);
    const res = await saveExpense({
      id: expense?.id,
      description: form.description,
      category: form.category,
      total_amount: centsToDecimal(totalCents!),
      expense_date: form.date,
      paid_by: form.paidBy,
      notes: form.notes,
      shares: participants.map((m) => ({
        member_id: m.id,
        share_amount: centsToDecimal(shareCents[m.id]!),
      })),
    });
    setPending(false);

    if (!res.ok) {
      setError(res.error || 'Could not save expense');
      return;
    }
    await refresh(true);
    showToast(editing ? 'Expense updated' : 'Expense added');
    closeExpenseForm();
  }

  const inputTheme = {
    borderColor: C.lineStrong,
    color: C.ink,
    backgroundColor: C.surface,
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={closeExpenseForm}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.backdrop, { backgroundColor: C.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => !pending && closeExpenseForm()} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <View style={[styles.handle, { backgroundColor: C.lineStrong }]} />
          <View style={[styles.header, { borderBottomColor: C.line }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: C.ink }]}>
                {editing ? 'Edit expense' : 'Add expense'}
              </Text>
              <Text style={[styles.subtitle, { color: C.muted }]}>
                Record a bill and decide who owes what.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close"
              onPress={closeExpenseForm}
              style={[styles.closeBtn, { backgroundColor: C.sunken }]}>
              <IconClose size={13} color={C.ink2} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={{ gap: 16, paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled">
            {members.length === 0 ? (
              <View
                style={[
                  styles.noMembersNotice,
                  { backgroundColor: C.paper, borderColor: C.line },
                ]}>
                <Text style={[styles.noMembersText, { color: C.ink2 }]}>
                  You need at least one member before you can record an expense.
                </Text>
                <Pressable
                  onPress={() => {
                    closeExpenseForm();
                    setTimeout(() => openMemberForm(), 80);
                  }}
                  style={[styles.addMemberLinkBtn, { backgroundColor: C.ink }]}>
                  <Text style={[styles.addMemberLinkText, { color: C.onInk }]}>Add a member</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={T.micro}>Description</Text>
              <TextInput
                value={form.description}
                onChangeText={(v) => update({ description: v })}
                maxLength={200}
                placeholder="e.g. Chicken inasal at Mang Inasal"
                placeholderTextColor={C.faint}
                style={[styles.input, inputTheme]}
              />
            </View>

            <View style={styles.row2}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={T.micro}>Total amount (₱)</Text>
                <TextInput
                  value={form.total}
                  onChangeText={(v) => update({ total: v })}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={C.faint}
                  style={[styles.input, inputTheme, tabular]}
                />
              </View>

              <View style={[styles.field, { flex: 1 }]}>
                <Text style={T.micro}>Expense date</Text>
                <DatePickerField
                  title="Expense date"
                  value={form.date}
                  onChange={(iso) => update({ date: iso })}
                  showQuickPresets
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={T.micro}>Category</Text>
              <View style={styles.chipsWrap}>
                {CATEGORIES.map((c) => {
                  const active = form.category === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => {
                        hapticLight();
                        update({ category: c });
                      }}
                      style={[
                        styles.chip,
                        { backgroundColor: C.sunken, borderColor: C.line },
                        active && { backgroundColor: C.ink, borderColor: C.ink },
                      ]}>
                      <Text
                        style={[
                          styles.chipText,
                          { color: active ? C.onInk : C.ink2 },
                        ]}>
                        {c}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={T.micro}>Who paid the original bill?</Text>
              <View style={styles.chipsWrap}>
                <Pressable
                  onPress={() => {
                    hapticLight();
                    update({ paidBy: '' });
                  }}
                  style={[
                    styles.chip,
                    { backgroundColor: C.sunken, borderColor: C.line },
                    form.paidBy === '' && { backgroundColor: C.ink, borderColor: C.ink },
                  ]}>
                  <Text
                    style={[
                      styles.chipText,
                      { color: form.paidBy === '' ? C.onInk : C.ink2 },
                    ]}>
                    You (Admin)
                  </Text>
                </Pressable>
                {members.map((m) => {
                  const active = form.paidBy === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => {
                        hapticLight();
                        update({ paidBy: m.id });
                      }}
                      style={[
                        styles.chip,
                        { backgroundColor: C.sunken, borderColor: C.line },
                        active && { backgroundColor: C.ink, borderColor: C.ink },
                      ]}>
                      <Text
                        style={[
                          styles.chipText,
                          { color: active ? C.onInk : C.ink2 },
                        ]}>
                        {m.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {members.length > 0 && (
              <View style={styles.field}>
                <View style={styles.splitHeaderRow}>
                  <Text style={T.micro}>Participants and shares</Text>
                  <View style={[styles.modeToggle, { backgroundColor: C.sunken }]}>
                    {(['equal', 'custom'] as const).map((m) => {
                      const active = form.mode === m;
                      return (
                        <Pressable
                          key={m}
                          onPress={() => switchMode(m)}
                          style={[
                            styles.modeBtn,
                            active && { backgroundColor: C.surface },
                          ]}>
                          <Text
                            style={[
                              styles.modeBtnText,
                              { color: active ? C.ink : C.muted },
                            ]}>
                            {m === 'equal' ? 'Equal split' : 'Custom split'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.quickSelectRow}>
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      update({
                        includeUser: true,
                        selected: Object.fromEntries(members.map((m) => [m.id, true])),
                      });
                    }}
                    style={styles.quickSelectBtn}>
                    <Text style={[styles.quickSelectText, { color: C.paid }]}>Select all</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      update({ selected: {} });
                    }}
                    style={styles.quickSelectBtn}>
                    <Text style={[styles.quickSelectMutedText, { color: C.muted }]}>Clear</Text>
                  </Pressable>
                </View>

                <View style={[styles.participantBox, { borderColor: C.line }]}>
                  {/* You row */}
                  <View style={[styles.participantRow, { backgroundColor: C.paper }]}>
                    <Pressable
                      onPress={() => {
                        hapticLight();
                        update({
                          includeUser: !form.includeUser,
                          userCustom: !form.includeUser && !form.userCustom ? '' : form.userCustom,
                        });
                      }}
                      style={styles.participantLeft}>
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor: C.lineStrong, backgroundColor: C.surface },
                          form.includeUser && { backgroundColor: C.ink, borderColor: C.ink },
                        ]}>
                        {form.includeUser && <IconCheck size={12} color={C.onInk} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={T.bodyStrong}>You</Text>
                        {form.includeUser && (
                          <Text style={[styles.participantHint, { color: C.muted }]}>
                            Included in split (not owed)
                          </Text>
                        )}
                      </View>
                    </Pressable>
                    {form.includeUser &&
                      (form.mode === 'equal' ? (
                        <Text style={[styles.shareReadout, { color: C.ink }]}>
                          {userShareCents ? formatPHP(userShareCents) : '—'}
                        </Text>
                      ) : (
                        <View style={styles.customInputWrap}>
                          {totalCents !== null &&
                            diff !== 0 &&
                            (userShareCents ?? 0) + diff > 0 && (
                              <Pressable
                                onPress={fillRemainingForUser}
                                style={[
                                  styles.fillRestBtn,
                                  { backgroundColor: C.sunken, borderColor: C.line },
                                ]}>
                                <Text style={[styles.fillRestText, { color: C.ink2 }]}>Fill</Text>
                              </Pressable>
                            )}
                          <TextInput
                            value={form.userCustom}
                            onChangeText={(v) => update({ userCustom: v })}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor={C.faint}
                            style={[styles.shareInput, inputTheme]}
                          />
                        </View>
                      ))}
                  </View>

                  {members.map((m) => {
                    const checked = Boolean(form.selected[m.id]);
                    const cents = shareCents[m.id];
                    const canFillRest =
                      checked &&
                      form.mode === 'custom' &&
                      totalCents !== null &&
                      diff !== 0 &&
                      (cents ?? 0) + diff > 0;

                    return (
                      <React.Fragment key={m.id}>
                        <View style={[styles.divider, { backgroundColor: C.line }]} />
                        <View style={styles.participantRow}>
                          <Pressable
                            onPress={() => toggleMember(m.id)}
                            style={styles.participantLeft}>
                            <View
                              style={[
                                styles.checkbox,
                                { borderColor: C.lineStrong, backgroundColor: C.surface },
                                checked && { backgroundColor: C.ink, borderColor: C.ink },
                              ]}>
                              {checked && <IconCheck size={12} color={C.onInk} />}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={T.bodyStrong} numberOfLines={1}>
                                {m.name}
                              </Text>
                              {form.paidBy === m.id && checked && (
                                <Text style={[styles.participantHint, { color: C.muted }]}>
                                  Paid the bill (not owed)
                                </Text>
                              )}
                            </View>
                          </Pressable>
                          {checked &&
                            (form.mode === 'equal' ? (
                              <Text style={[styles.shareReadout, { color: C.ink }]}>
                                {cents ? formatPHP(cents) : '—'}
                              </Text>
                            ) : (
                              <View style={styles.customInputWrap}>
                                {canFillRest && (
                                  <Pressable
                                    onPress={() => fillRemainingForMember(m.id)}
                                    style={[
                                      styles.fillRestBtn,
                                      { backgroundColor: C.sunken, borderColor: C.line },
                                    ]}>
                                    <Text style={[styles.fillRestText, { color: C.ink2 }]}>
                                      Fill
                                    </Text>
                                  </Pressable>
                                )}
                                <TextInput
                                  value={form.custom[m.id] ?? ''}
                                  onChangeText={(v) =>
                                    update({ custom: { ...form.custom, [m.id]: v } })
                                  }
                                  keyboardType="decimal-pad"
                                  placeholder="0.00"
                                  placeholderTextColor={C.faint}
                                  style={[styles.shareInput, inputTheme]}
                                />
                              </View>
                            ))}
                        </View>
                      </React.Fragment>
                    );
                  })}
                </View>

                {mismatch && totalCents !== null && (
                  <View
                    style={[
                      styles.mismatchBox,
                      { backgroundColor: C.partialSoft, borderColor: C.partialBorder },
                    ]}>
                    <Text style={[styles.mismatchTitle, { color: C.partial }]}>
                      Shares add up to {formatPHP(sharesTotal)}, but total is {formatPHP(totalCents)}.
                    </Text>
                    <Text style={[styles.mismatchSub, { color: C.partial }]}>
                      {diff > 0
                        ? `${formatPHP(diff)} is not assigned yet — tap "Fill" on any row to balance.`
                        : `The shares are ${formatPHP(-diff)} over.`}
                    </Text>
                    <Pressable onPress={() => update({ mode: 'equal' })}>
                      <Text style={[styles.mismatchLink, { color: C.partial }]}>
                        Switch back to equal split
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            <View style={styles.field}>
              <Text style={T.micro}>Notes (optional)</Text>
              <TextInput
                value={form.notes}
                onChangeText={(v) => update({ notes: v })}
                maxLength={1000}
                multiline
                numberOfLines={2}
                placeholder="Optional notes"
                placeholderTextColor={C.faint}
                style={[styles.input, inputTheme, styles.textarea]}
              />
            </View>

            {error ? <Text style={[styles.errorText, { color: C.owed }]}>{error}</Text> : null}
          </ScrollView>

          {/* Sticky Live Split Summary Bar */}
          {splitSummary && (
            <View
              style={[
                styles.stickyStatusBar,
                {
                  backgroundColor:
                    splitSummary.tone === 'paid'
                      ? C.paidSoft
                      : splitSummary.tone === 'owed'
                        ? C.owedSoft
                        : splitSummary.tone === 'partial'
                          ? C.partialSoft
                          : C.paper,
                  borderTopColor: C.line,
                },
              ]}>
              <Text
                style={[
                  styles.stickyStatusText,
                  {
                    color:
                      splitSummary.tone === 'paid'
                        ? C.paid
                        : splitSummary.tone === 'owed'
                          ? C.owed
                          : splitSummary.tone === 'partial'
                            ? C.partial
                            : C.muted,
                  },
                ]}>
                {splitSummary.label}
              </Text>
            </View>
          )}

          <View style={[styles.footer, { borderTopColor: C.line }]}>
            <Pressable
              disabled={pending}
              onPress={closeExpenseForm}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor: C.lineStrong },
                pressed && { opacity: 0.8 },
              ]}>
              <Text style={[styles.cancelBtnText, { color: C.ink }]}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={pending || members.length === 0}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: C.ink },
                pressed && { opacity: 0.85 },
                (pending || members.length === 0) && { opacity: 0.45 },
              ]}>
              {pending && (
                <ActivityIndicator size="small" color={C.onInk} style={{ marginRight: 6 }} />
              )}
              <Text style={[styles.submitBtnText, { color: C.onInk }]}>
                {editing ? 'Save changes' : 'Add expense'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '94%',
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
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
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
  noMembersNotice: {
    borderWidth: 1,
    padding: 14,
    borderRadius: R.md,
    gap: 10,
  },
  noMembersText: {
    fontSize: 13.5,
  },
  addMemberLinkBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: R.sm,
  },
  addMemberLinkText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  field: {
    gap: 6,
  },
  row2: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    height: 44,
    borderRadius: R.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textarea: {
    height: 70,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: R.sm,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  splitHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: R.sm,
    padding: 2,
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickSelectRow: {
    flexDirection: 'row',
    gap: 14,
    marginVertical: 2,
  },
  quickSelectBtn: {
    paddingVertical: 4,
  },
  quickSelectText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  quickSelectMutedText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  participantBox: {
    borderRadius: R.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  participantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantHint: {
    fontSize: 11.5,
    marginTop: 1,
  },
  shareReadout: {
    fontSize: 13.5,
    fontWeight: '600',
    ...tabular,
  },
  customInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fillRestBtn: {
    height: 30,
    paddingHorizontal: 8,
    borderRadius: R.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fillRestText: {
    fontSize: 11,
    fontWeight: '700',
  },
  shareInput: {
    width: 92,
    height: 36,
    borderRadius: R.sm,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 14,
    textAlign: 'right',
    ...tabular,
  },
  mismatchBox: {
    borderWidth: 1,
    borderRadius: R.md,
    padding: 12,
    gap: 4,
  },
  mismatchTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  mismatchSub: {
    fontSize: 12.5,
  },
  mismatchLink: {
    fontSize: 12.5,
    fontWeight: '700',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
  },
  stickyStatusBar: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  stickyStatusText: {
    fontSize: 12,
    fontWeight: '700',
    ...tabular,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: bottomSafePad,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: R.md,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: R.md,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
