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
import { savePayment } from '@/lib/actions';
import { formatDate, todayISO } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import { LedgerShare } from '@/lib/ledger';
import { centsToDecimal, formatPHP, parseAmount } from '@/lib/money';

const PAYMENT_AMOUNT_ACCESSORY_ID = 'payment-amount-done';

function heroFontSizeFor(text: string): number {
  const len = text.length;
  if (len >= 11) return 26;
  if (len >= 8) return 34;
  return 42;
}

export function PaymentFormModal() {
  const { C, T } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { paymentFormState, closePaymentForm, ledger, refresh, showToast } = useLedger();
  const { open, preset } = paymentFormState;
  const payment = preset?.payment ?? null;
  const editing = Boolean(payment);

  const [memberId, setMemberId] = useState('');
  const [shareId, setShareId] = useState('');
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [confirmOver, setConfirmOver] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const availableFor = (share: LedgerShare) =>
    share.remainingCents + (editing && payment && share.id === payment.shareId ? payment.amountCents : 0);

  const payable = (share: LedgerShare) =>
    !share.isPayer && (availableFor(share) > 0 || Boolean(editing && payment && share.id === payment.shareId));

  const memberOptions = useMemo(() => {
    const ids = new Set(ledger.shares.filter(payable).map((s) => s.memberId));
    return ledger.members.filter((m) => ids.has(m.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledger, payment]);

  const shareOptions = useMemo(
    () => ledger.shares.filter((s) => s.memberId === memberId && payable(s)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ledger, memberId, payment]
  );

  const share = shareOptions.find((s) => s.id === shareId);
  const available = share ? availableFor(share) : 0;
  const amountCents = parseAmount(amount);
  const overpays = Boolean(share && amountCents !== null && amountCents > available);

  useEffect(() => {
    if (!open) return;
    setError('');
    setConfirmOver(false);
    setAmountTouched(false);
    if (payment) {
      setMemberId(payment.memberId);
      setShareId(payment.shareId);
      setAmount(centsToDecimal(payment.amountCents));
      setDate(payment.date);
      setNotes(payment.notes);
      return;
    }
    const presetShare = preset?.shareId ? ledger.shares.find((s) => s.id === preset.shareId) : null;
    const m = presetShare?.memberId ?? preset?.memberId ?? '';
    setMemberId(m);

    if (presetShare) {
      setShareId(presetShare.id);
      setAmount(presetShare.remainingCents > 0 ? centsToDecimal(presetShare.remainingCents) : '');
    } else if (m) {
      const openForMember = ledger.shares.filter(
        (s) => s.memberId === m && !s.isPayer && s.remainingCents > 0
      );
      if (openForMember.length === 1) {
        setShareId(openForMember[0].id);
        setAmount(centsToDecimal(openForMember[0].remainingCents));
      } else {
        setShareId('');
        setAmount('');
      }
    } else {
      setShareId('');
      setAmount('');
    }
    setDate(todayISO());
    setNotes('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payment?.id, preset?.memberId, preset?.shareId]);

  function handleAmountChange(text: string) {
    setAmount(text);
    setAmountTouched(text.trim().length > 0);
  }

  function pickMember(id: string) {
    if (editing) return;
    hapticLight();
    setMemberId(id);
    setConfirmOver(false);

    const openForMember = ledger.shares.filter(
      (s) => s.memberId === id && !s.isPayer && s.remainingCents > 0
    );
    if (openForMember.length === 1) {
      setShareId(openForMember[0].id);
      if (!amountTouched) {
        setAmount(centsToDecimal(openForMember[0].remainingCents));
      }
    } else {
      setShareId('');
      if (!amountTouched) {
        setAmount('');
      }
    }
  }

  function pickShare(id: string) {
    if (editing) return;
    hapticLight();
    setShareId(id);
    setConfirmOver(false);
    const s = ledger.shares.find((x) => x.id === id);
    if (s && !amountTouched) {
      const avail = availableFor(s);
      setAmount(avail > 0 ? centsToDecimal(avail) : '');
    }
  }

  async function handleSubmit() {
    if (!memberId) return setError('Select who is paying');
    if (!shareId) return setError('Select which bill is being paid');
    if (amountCents === null || amountCents <= 0)
      return setError('Enter an amount above ₱0.00 with at most 2 decimals');
    if (!date) return setError('Select the payment date');
    if (overpays && !confirmOver)
      return setError('Amount exceeds the remaining balance. Confirm overpayment below to continue.');

    setError('');
    setPending(true);
    const res = await savePayment({
      id: payment?.id,
      member_id: memberId,
      expense_share_id: shareId,
      amount,
      payment_date: date,
      notes,
      confirmOverpay: Boolean(overpays && confirmOver),
    });
    setPending(false);

    if (!res.ok) {
      setError(res.error || 'Could not record payment');
      return;
    }
    await refresh(true);
    showToast(editing ? 'Payment updated' : 'Payment recorded');
    closePaymentForm();
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
          {editing ? 'Edit payment' : 'Record payment'}
        </Text>
        <Text style={[styles.subtitle, { color: C.muted }]}>
          Partial or full payments update balances right away.
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Close"
        hitSlop={4}
        onPress={closePaymentForm}
        style={[styles.closeBtn, { backgroundColor: C.sunken }]}>
        <IconClose size={16} color={C.ink} />
      </Pressable>
    </View>
  );

  const dynamicAmountSize = heroFontSizeFor(amount);

  return (
    <BottomSheet
      open={open}
      onClose={closePaymentForm}
      dismissible={!pending}
      avoidKeyboard
      header={sheetHeader}>
      <ScrollView
        style={styles.body}
        contentContainerStyle={{ gap: 18, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        {memberOptions.length === 0 && !editing ? (
          <View
            style={[
              styles.emptyNotice,
              { backgroundColor: C.paper, borderColor: C.line },
            ]}>
            <Text style={[styles.emptyNoticeText, { color: C.muted }]}>
              Nobody owes anything right now, so there is nothing to pay.
            </Text>
          </View>
        ) : (
          <>
            {/* Step 1: Compact Horizontal Debtor Selector (scales to 20+ friends) */}
            <View style={styles.field}>
              <Text style={T.micro}>Paid by</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.memberChipRow}>
                {memberOptions.map((m) => {
                  const selected = memberId === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      disabled={editing}
                      onPress={() => pickMember(m.id)}
                      style={[
                        styles.memberChip,
                        { borderColor: C.line, backgroundColor: C.surface },
                        selected && { backgroundColor: C.ink, borderColor: C.ink },
                        editing && { opacity: 0.6 },
                      ]}>
                      <Text
                        style={[
                          styles.memberChipName,
                          { color: selected ? C.onInk : C.ink },
                        ]}>
                        {m.name}
                      </Text>
                      <Text
                        style={[
                          styles.memberChipBal,
                          { color: selected ? C.onInkMuted : C.muted },
                        ]}>
                        {formatPHP(Math.max(m.balanceCents, 0))}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Step 2: Bill Selection (appears immediately when a person is chosen) */}
            {memberId ? (
              <View style={styles.field}>
                <Text style={T.micro}>Bill</Text>
                <View style={styles.optionList}>
                  {shareOptions.map((s) => {
                    const selected = shareId === s.id;
                    return (
                      <Pressable
                        key={s.id}
                        disabled={editing}
                        onPress={() => pickShare(s.id)}
                        style={[
                          styles.optionItem,
                          { borderColor: C.line, backgroundColor: C.surface },
                          selected && { backgroundColor: C.ink, borderColor: C.ink },
                          editing && { opacity: 0.6 },
                        ]}>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.optionTitle,
                              { color: selected ? C.onInk : C.ink },
                            ]}
                            numberOfLines={1}>
                            {s.expenseDescription}
                          </Text>
                          <Text
                            style={[
                              styles.optionSub,
                              { color: selected ? C.onInkMuted : C.muted },
                            ]}>
                            {formatDate(s.expenseDate)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.optionMeta,
                            { color: selected ? C.onInkMuted : C.ink },
                          ]}>
                          {formatPHP(Math.max(availableFor(s), 0))} left
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Step 3: Cash App-Inspired Hero Currency Input (never wiped on selection) */}
            <View
              style={[
                styles.heroAmountBox,
                { backgroundColor: C.paper, borderColor: overpays ? C.dangerBorder : C.line },
              ]}>
              <Text style={[styles.heroAmountEyebrow, { color: C.muted }]}>
                PAYMENT AMOUNT
              </Text>
              <View style={styles.heroAmountInputRow}>
                <Text style={[styles.heroCurrencySign, { color: C.muted }]}>₱</Text>
                <TextInput
                  value={amount}
                  onChangeText={handleAmountChange}
                  keyboardType="decimal-pad"
                  inputAccessoryViewID={PAYMENT_AMOUNT_ACCESSORY_ID}
                  placeholder="0.00"
                  placeholderTextColor={C.faint}
                  style={[
                    styles.heroAmountInput,
                    { color: C.ink, fontSize: dynamicAmountSize },
                  ]}
                />
              </View>
              {share && available > 0 ? (
                <View style={styles.heroQuickRow}>
                  <Text style={[styles.heroRemainingText, { color: C.muted }]}>
                    Remaining: {formatPHP(available)}
                  </Text>
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      setAmount(centsToDecimal(available));
                      setAmountTouched(true);
                    }}
                    style={({ pressed }) => [
                      styles.payFullPill,
                      { backgroundColor: C.paidSoft, borderColor: C.paidBorder },
                      pressed && { opacity: 0.78 },
                    ]}>
                    <Text style={[styles.payFullText, { color: C.paid }]}>
                      Pay full {formatPHP(available)}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={[styles.heroHintText, { color: C.muted }]}>
                  {memberId ? 'Select a bill above to see remaining balance' : 'Select who is paying above'}
                </Text>
              )}
            </View>

            {/* Overpayment Alert */}
            {overpays && amountCents !== null && (
              <View
                style={[
                  styles.warningBox,
                  { backgroundColor: C.dangerSoft, borderColor: C.dangerBorder },
                ]}>
                <View style={styles.warningHead}>
                  <IconAlertCircle size={17} color={C.danger} />
                  <Text style={[styles.warningTitle, { color: C.danger }]}>
                    {formatPHP(amountCents - available)} above remaining balance
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    hapticLight();
                    setConfirmOver((v) => !v);
                  }}
                  style={styles.checkboxRow}>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: C.danger, backgroundColor: C.surface },
                      confirmOver && { backgroundColor: C.danger },
                    ]}>
                    {confirmOver && <IconCheck size={13} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: C.ink }]}>
                    Confirm and record this overpayment
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Payment date */}
            <View style={styles.field}>
              <Text style={T.micro}>Payment date</Text>
              <DatePickerField
                title="Payment date"
                value={date}
                onChange={setDate}
                showQuickPresets
              />
            </View>

            {/* Optional note */}
            <View style={styles.field}>
              <Text style={T.micro}>Notes (optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                maxLength={1000}
                multiline
                numberOfLines={2}
                placeholder="e.g. GCash transfer, cash handed over"
                placeholderTextColor={C.faint}
                style={[styles.input, inputTheme, styles.textarea]}
              />
            </View>
          </>
        )}

        <ErrorBanner message={error} />
      </ScrollView>

      <NumericDoneBar nativeID={PAYMENT_AMOUNT_ACCESSORY_ID} />

      {/* Thumb-zone solid near-black CTA */}
      <View
        style={[
          styles.footer,
          {
            borderTopColor: C.line,
            paddingBottom: Math.max(insets.bottom, bottomSafePad),
          },
        ]}>
        <Pressable
          disabled={pending || (memberOptions.length === 0 && !editing)}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: C.ink },
            pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
            (pending || (memberOptions.length === 0 && !editing)) && { opacity: 0.4 },
          ]}>
          {pending && (
            <ActivityIndicator size="small" color={C.onInk} style={{ marginRight: 8 }} />
          )}
          <Text style={[styles.submitBtnText, { color: C.onInk }]}>
            {editing
              ? 'Save changes'
              : amountCents && amountCents > 0
                ? `Record ${formatPHP(amountCents)}`
                : 'Record payment'}
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
    paddingTop: 16,
  },
  memberChipRow: {
    gap: 8,
    paddingVertical: 2,
  },
  memberChip: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R.md,
    borderWidth: 1,
    justifyContent: 'center',
  },
  memberChipName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  memberChipBal: {
    fontSize: 12,
    marginTop: 1,
    ...tabular,
  },
  heroAmountBox: {
    borderRadius: R.lg,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  heroAmountEyebrow: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  heroAmountInputRow: {
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
  heroQuickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  heroRemainingText: {
    fontSize: 13,
    fontWeight: '500',
    ...tabular,
  },
  payFullPill: {
    minHeight: 34,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: R.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payFullText: {
    fontSize: 13,
    fontWeight: '600',
    ...tabular,
  },
  heroHintText: {
    fontSize: 13,
    textAlign: 'center',
  },
  emptyNotice: {
    borderWidth: 1,
    padding: 16,
    borderRadius: R.lg,
  },
  emptyNoticeText: {
    fontSize: 14,
    textAlign: 'center',
  },
  field: {
    gap: 8,
  },
  optionList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: R.md,
    borderWidth: 1,
    gap: 10,
  },
  optionTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  optionSub: {
    fontSize: 12.5,
    marginTop: 2,
    ...tabular,
  },
  optionMeta: {
    fontSize: 13.5,
    fontWeight: '600',
    ...tabular,
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
  warningBox: {
    borderWidth: 1,
    borderRadius: R.lg,
    padding: 14,
    gap: 10,
  },
  warningHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    flex: 1,
    ...tabular,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 13.5,
    fontWeight: '500',
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
    ...tabular,
  },
});
