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
import { DatePickerField } from '@/components/date-picker';
import { IconAlertCircle, IconCheck, IconClose } from '@/components/icons';
import { BottomSheet, ErrorBanner, NumericDoneBar } from '@/components/mobile-ui';
import { useLedger } from '@/context/ledger-context';
import { useAppTheme } from '@/context/theme-context';
import { bottomSafePad, METRICS, R, tabular } from '@/design/tokens';
import { saveExpense } from '@/lib/actions';
import { CATEGORIES } from '@/lib/constants';
import { todayISO } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import { LedgerExpense, LedgerMember } from '@/lib/ledger';
import { centsToDecimal, formatPHP, parseAmount, splitEqual, sumCents } from '@/lib/money';

const EXPENSE_AMOUNT_ACCESSORY_ID = 'expense-amount-done';

function heroFontSizeFor(text: string): number {
  const len = text.length;
  if (len >= 11) return 26;
  if (len >= 8) return 34;
  return 42;
}

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
  const insets = useSafeAreaInsets();
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

  const splitSummary = useMemo(() => {
    if (members.length === 0) return null;
    if (!totalCents || totalCents <= 0) {
      return {
        label: 'Enter total amount to calculate shares',
        state: 'neutral' as const,
      };
    }
    if (participants.length === 0) {
      return {
        label: `Total ${formatPHP(totalCents)} · select participants`,
        state: 'neutral' as const,
      };
    }
    if (form.mode === 'equal') {
      const perHead = splitEqual(totalCents, splitCount)[0] ?? 0;
      return {
        label: `Equal · ~${formatPHP(perHead)} each · ${splitCount} ${
          splitCount === 1 ? 'person' : 'people'
        }`,
        state: 'balanced' as const,
      };
    }
    if (diff === 0 && allValid) {
      return {
        label: `Balanced · ${formatPHP(totalCents)} assigned`,
        state: 'balanced' as const,
      };
    }
    if (diff > 0) {
      return {
        label: `${formatPHP(diff)} left to assign`,
        state: 'error' as const,
      };
    }
    if (diff < 0) {
      return {
        label: `${formatPHP(-diff)} over total`,
        state: 'error' as const,
      };
    }
    return {
      label: 'Enter each share above ₱0.00',
      state: 'neutral' as const,
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
      return `Shares are ${formatPHP(Math.abs(diff))} ${diff > 0 ? 'short of' : 'over'} the total`;
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
    borderColor: C.line,
    color: C.ink,
    backgroundColor: C.surface,
  };

  const sheetHeader = (
    <View style={[styles.header, { borderBottomColor: C.line }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: C.ink }]}>
          {editing ? 'Edit expense' : 'New expense'}
        </Text>
        <Text style={[styles.subtitle, { color: C.muted }]}>
          Record a bill and assign who owes what.
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Close"
        hitSlop={4}
        onPress={closeExpenseForm}
        style={[styles.closeBtn, { backgroundColor: C.sunken }]}>
        <IconClose size={16} color={C.ink} />
      </Pressable>
    </View>
  );

  const dynamicAmountSize = heroFontSizeFor(form.total);

  return (
    <BottomSheet
      open={open}
      onClose={closeExpenseForm}
      dismissible={!pending}
      maxHeight="94%"
      avoidKeyboard
      header={sheetHeader}>
      <ScrollView
        style={styles.body}
        contentContainerStyle={{ gap: 18, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        {members.length === 0 ? (
          <View
            style={[
              styles.noMembersNotice,
              { backgroundColor: C.paper, borderColor: C.line },
            ]}>
            <Text style={[styles.noMembersText, { color: C.ink2 }]}>
              Add at least one person before splitting a bill.
            </Text>
            <Pressable
              onPress={() => {
                closeExpenseForm();
                setTimeout(() => openMemberForm(), 120);
              }}
              style={[styles.addMemberLinkBtn, { backgroundColor: C.ink }]}>
              <Text style={[styles.addMemberLinkText, { color: C.onInk }]}>Add person</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Cash App-Inspired Distraction-Free Hero Total Amount */}
        <View
          style={[
            styles.heroAmountBox,
            { backgroundColor: C.paper, borderColor: C.line },
          ]}>
          <Text style={[styles.heroAmountEyebrow, { color: C.muted }]}>TOTAL BILL</Text>
          <View style={styles.heroAmountRow}>
            <Text style={[styles.heroCurrencySign, { color: C.muted }]}>₱</Text>
            <TextInput
              value={form.total}
              onChangeText={(v) => update({ total: v })}
              keyboardType="decimal-pad"
              inputAccessoryViewID={EXPENSE_AMOUNT_ACCESSORY_ID}
              placeholder="0.00"
              placeholderTextColor={C.faint}
              style={[
                styles.heroAmountInput,
                { color: C.ink, fontSize: dynamicAmountSize },
              ]}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={T.micro}>Description</Text>
          <TextInput
            value={form.description}
            onChangeText={(v) => update({ description: v })}
            maxLength={200}
            placeholder="e.g. Dinner at Manam, Electricity bill"
            placeholderTextColor={C.faint}
            style={[styles.input, inputTheme]}
          />
        </View>

        <View style={styles.field}>
          <Text style={T.micro}>Expense date</Text>
          <DatePickerField
            title="Expense date"
            value={form.date}
            onChange={(iso) => update({ date: iso })}
            showQuickPresets
          />
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
                    { backgroundColor: C.surface, borderColor: C.line },
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
          <Text style={T.micro}>Paid by</Text>
          <View style={styles.chipsWrap}>
            <Pressable
              onPress={() => {
                hapticLight();
                update({ paidBy: '' });
              }}
              style={[
                styles.chip,
                { backgroundColor: C.surface, borderColor: C.line },
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
                    { backgroundColor: C.surface, borderColor: C.line },
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
              <Text style={T.micro}>Split</Text>
              <View style={[styles.modeToggle, { backgroundColor: C.sunken, borderColor: C.line }]}>
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
                        {m === 'equal' ? 'Equal' : 'Custom'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.quickSelectRow}>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  hapticLight();
                  update({
                    includeUser: true,
                    selected: Object.fromEntries(members.map((m) => [m.id, true])),
                  });
                }}
                style={styles.quickSelectBtn}>
                <Text style={[styles.quickSelectText, { color: C.ink }]}>Select all</Text>
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  hapticLight();
                  update({ selected: {} });
                }}
                style={styles.quickSelectBtn}>
                <Text style={[styles.quickSelectMutedText, { color: C.muted }]}>Clear</Text>
              </Pressable>
            </View>

            <View style={[styles.participantBox, { borderColor: C.line, backgroundColor: C.surface }]}>
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
                    {form.includeUser && <IconCheck size={13} color={C.onInk} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={T.bodyStrong}>You</Text>
                    {form.includeUser && (
                      <Text style={[styles.participantHint, { color: C.muted }]}>
                        Your own share
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
                            <Text style={[styles.fillRestText, { color: C.ink }]}>Fill</Text>
                          </Pressable>
                        )}
                      <TextInput
                        value={form.userCustom}
                        onChangeText={(v) => update({ userCustom: v })}
                        keyboardType="decimal-pad"
                        inputAccessoryViewID={EXPENSE_AMOUNT_ACCESSORY_ID}
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
                          {checked && <IconCheck size={13} color={C.onInk} />}
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
                                <Text style={[styles.fillRestText, { color: C.ink }]}>
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
                              inputAccessoryViewID={EXPENSE_AMOUNT_ACCESSORY_ID}
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
                  { backgroundColor: C.dangerSoft, borderColor: C.dangerBorder },
                ]}>
                <View style={styles.mismatchHead}>
                  <IconAlertCircle size={16} color={C.danger} />
                  <Text style={[styles.mismatchTitle, { color: C.danger }]}>
                    Shares total {formatPHP(sharesTotal)} vs bill {formatPHP(totalCents)}
                  </Text>
                </View>
                <Text style={[styles.mismatchSub, { color: C.ink2 }]}>
                  {diff > 0
                    ? `${formatPHP(diff)} unassigned — tap Fill on any row to balance.`
                    : `Shares exceed the bill by ${formatPHP(-diff)}.`}
                </Text>
                <Pressable hitSlop={6} onPress={() => update({ mode: 'equal' })}>
                  <Text style={[styles.mismatchLink, { color: C.ink }]}>
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

        <ErrorBanner message={error} />
      </ScrollView>

      <NumericDoneBar nativeID={EXPENSE_AMOUNT_ACCESSORY_ID} />

      {/* Live Split Status Strip */}
      {splitSummary && (
        <View
          style={[
            styles.stickyStatusBar,
            {
              backgroundColor:
                splitSummary.state === 'balanced'
                  ? C.paidSoft
                  : splitSummary.state === 'error'
                    ? C.dangerSoft
                    : C.paper,
              borderTopColor: C.line,
            },
          ]}>
          <Text
            style={[
              styles.stickyStatusText,
              {
                color:
                  splitSummary.state === 'balanced'
                    ? C.paid
                    : splitSummary.state === 'error'
                      ? C.danger
                      : C.ink2,
              },
            ]}>
            {splitSummary.label}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.footer,
          {
            borderTopColor: C.line,
            paddingBottom: Math.max(insets.bottom, bottomSafePad),
          },
        ]}>
        <Pressable
          disabled={pending || members.length === 0}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: C.ink },
            pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
            (pending || members.length === 0) && { opacity: 0.4 },
          ]}>
          {pending && (
            <ActivityIndicator size="small" color={C.onInk} style={{ marginRight: 8 }} />
          )}
          <Text style={[styles.submitBtnText, { color: C.onInk }]}>
            {editing ? 'Save changes' : 'Save expense'}
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
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
  },
  subtitle: {
    fontSize: 13,
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
  noMembersNotice: {
    borderWidth: 1,
    padding: 16,
    borderRadius: R.lg,
    gap: 12,
  },
  noMembersText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  addMemberLinkBtn: {
    alignSelf: 'flex-start',
    height: 40,
    paddingHorizontal: 16,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMemberLinkText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  heroAmountBox: {
    borderRadius: R.lg,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
  },
  heroAmountEyebrow: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 4,
  },
  heroCurrencySign: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 4,
  },
  heroAmountInput: {
    fontWeight: '700',
    letterSpacing: -1.1,
    minWidth: 120,
    flexShrink: 1,
    textAlign: 'center',
    paddingVertical: 4,
    ...tabular,
  },
  field: {
    gap: 8,
  },
  input: {
    minHeight: METRICS.touchMin,
    borderRadius: R.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textarea: {
    height: 76,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: R.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  splitHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: R.sm,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickSelectRow: {
    flexDirection: 'row',
    gap: 18,
  },
  quickSelectBtn: {
    paddingVertical: 4,
  },
  quickSelectText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  quickSelectMutedText: {
    fontSize: 13.5,
    fontWeight: '500',
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
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  participantLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantHint: {
    fontSize: 12.5,
    marginTop: 1,
  },
  shareReadout: {
    fontSize: 14.5,
    fontWeight: '600',
    ...tabular,
  },
  customInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fillRestBtn: {
    height: 38,
    paddingHorizontal: 11,
    borderRadius: R.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fillRestText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  shareInput: {
    width: 96,
    height: 40,
    borderRadius: R.sm,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 14,
    textAlign: 'right',
    ...tabular,
  },
  mismatchBox: {
    borderWidth: 1,
    borderRadius: R.lg,
    padding: 14,
    gap: 8,
  },
  mismatchHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mismatchTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    flex: 1,
    ...tabular,
  },
  mismatchSub: {
    fontSize: 13,
    lineHeight: 19,
  },
  mismatchLink: {
    fontSize: 13.5,
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  stickyStatusBar: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  stickyStatusText: {
    fontSize: 13,
    fontWeight: '600',
    ...tabular,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  submitBtn: {
    height: METRICS.buttonHeight,
    borderRadius: R.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 15.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
