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
import { savePayment } from '@/lib/actions';
import { formatDate, todayISO } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import { LedgerShare } from '@/lib/ledger';
import { centsToDecimal, formatPHP, parseAmount } from '@/lib/money';

export function PaymentFormModal() {
  const { C, T } = useAppTheme();
  const { paymentFormState, closePaymentForm, ledger, refresh, showToast } = useLedger();
  const { open, preset } = paymentFormState;
  const payment = preset?.payment ?? null;
  const editing = Boolean(payment);

  const [memberId, setMemberId] = useState('');
  const [shareId, setShareId] = useState('');
  const [amount, setAmount] = useState('');
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

    // Auto-select if a specific share is preset OR if this member only has 1 unpaid share
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

  function pickMember(id: string) {
    if (editing) return;
    hapticLight();
    setMemberId(id);
    setConfirmOver(false);

    // Auto-select when this member has only one unpaid share
    const openForMember = ledger.shares.filter(
      (s) => s.memberId === id && !s.isPayer && s.remainingCents > 0
    );
    if (openForMember.length === 1) {
      setShareId(openForMember[0].id);
      setAmount(centsToDecimal(openForMember[0].remainingCents));
    } else {
      setShareId('');
      setAmount('');
    }
  }

  function pickShare(id: string) {
    if (editing) return;
    hapticLight();
    setShareId(id);
    setConfirmOver(false);
    const s = ledger.shares.find((x) => x.id === id);
    if (s) {
      const avail = availableFor(s);
      setAmount(avail > 0 ? centsToDecimal(avail) : '');
    }
  }

  async function handleSubmit() {
    if (!memberId) return setError('Select who is paying');
    if (!shareId) return setError('Select which expense is being paid');
    if (amountCents === null || amountCents <= 0)
      return setError('Enter an amount above ₱0.00 with at most 2 decimals');
    if (!date) return setError('Select the payment date');
    if (overpays && !confirmOver)
      return setError('This is more than the remaining balance. Tick the confirmation box to continue.');

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
    borderColor: C.lineStrong,
    color: C.ink,
    backgroundColor: C.surface,
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={closePaymentForm}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.backdrop, { backgroundColor: C.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => !pending && closePaymentForm()} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <View style={[styles.handle, { backgroundColor: C.lineStrong }]} />
          <View style={[styles.header, { borderBottomColor: C.line }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: C.ink }]}>
                {editing ? 'Edit payment' : 'Record payment'}
              </Text>
              <Text style={[styles.subtitle, { color: C.muted }]}>
                Partial payments are fine. The balance updates right away.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close"
              onPress={closePaymentForm}
              style={[styles.closeBtn, { backgroundColor: C.sunken }]}>
              <IconClose size={13} color={C.ink2} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={{ gap: 16, paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled">
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
                <View style={styles.field}>
                  <Text style={T.micro}>Member</Text>
                  <View style={styles.optionList}>
                    {memberOptions.map((m) => {
                      const selected = memberId === m.id;
                      return (
                        <Pressable
                          key={m.id}
                          disabled={editing}
                          onPress={() => pickMember(m.id)}
                          style={[
                            styles.optionItem,
                            { borderColor: C.line, backgroundColor: C.paper },
                            selected && { backgroundColor: C.ink, borderColor: C.ink },
                            editing && { opacity: 0.6 },
                          ]}>
                          <Text
                            style={[
                              styles.optionTitle,
                              { color: selected ? C.onInk : C.ink },
                            ]}>
                            {m.name}
                          </Text>
                          <Text
                            style={[
                              styles.optionMeta,
                              { color: selected ? C.onInkMuted : C.ink2 },
                            ]}>
                            owes {formatPHP(Math.max(m.balanceCents, 0))}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {memberId ? (
                  <View style={styles.field}>
                    <Text style={T.micro}>Expense</Text>
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
                              { borderColor: C.line, backgroundColor: C.paper },
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
                                { color: selected ? C.onInkMuted : C.ink2 },
                              ]}>
                              {formatPHP(Math.max(availableFor(s), 0))} left
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                <View style={styles.row2}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={T.micro}>Amount (₱)</Text>
                    {share ? (
                      <Text style={[styles.hint, { color: C.muted }]}>
                        Remaining: {formatPHP(Math.max(available, 0))}
                      </Text>
                    ) : null}
                    <TextInput
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={C.faint}
                      style={[styles.input, inputTheme, tabular]}
                    />
                  </View>

                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={T.micro}>Payment date</Text>
                    {share ? <Text style={[styles.hint, { color: C.muted }]}>Tap to change</Text> : null}
                    <DatePickerField
                      title="Payment date"
                      value={date}
                      onChange={setDate}
                      showQuickPresets
                    />
                  </View>
                </View>

                {share && available > 0 && (
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      setAmount(centsToDecimal(available));
                    }}
                    style={[styles.payFullBtn, { backgroundColor: C.paidSoft }]}>
                    <Text style={[styles.payFullText, { color: C.paid }]}>
                      Pay full balance ({formatPHP(available)})
                    </Text>
                  </Pressable>
                )}

                {overpays && amountCents !== null && (
                  <View
                    style={[
                      styles.warningBox,
                      { backgroundColor: C.partialSoft, borderColor: C.partialBorder },
                    ]}>
                    <Text style={[styles.warningTitle, { color: C.partial }]}>
                      This is {formatPHP(amountCents - available)} more than the remaining balance.
                    </Text>
                    <Pressable
                      onPress={() => {
                        hapticLight();
                        setConfirmOver((v) => !v);
                      }}
                      style={styles.checkboxRow}>
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor: C.partial, backgroundColor: C.surface },
                          confirmOver && { backgroundColor: C.partial },
                        ]}>
                        {confirmOver && <IconCheck size={12} color="#FFFFFF" />}
                      </View>
                      <Text style={[styles.checkboxLabel, { color: C.partial }]}>
                        Yes, record this overpayment
                      </Text>
                    </Pressable>
                  </View>
                )}

                <View style={styles.field}>
                  <Text style={T.micro}>Notes (optional)</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    maxLength={1000}
                    multiline
                    numberOfLines={2}
                    placeholder="Optional payment note"
                    placeholderTextColor={C.faint}
                    style={[styles.input, inputTheme, styles.textarea]}
                  />
                </View>
              </>
            )}

            {error ? <Text style={[styles.errorText, { color: C.owed }]}>{error}</Text> : null}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: C.line }]}>
            <Pressable
              disabled={pending}
              onPress={closePaymentForm}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor: C.lineStrong },
                pressed && { opacity: 0.8 },
              ]}>
              <Text style={[styles.cancelBtnText, { color: C.ink }]}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={pending || (memberOptions.length === 0 && !editing)}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: C.ink },
                pressed && { opacity: 0.85 },
                (pending || (memberOptions.length === 0 && !editing)) && { opacity: 0.45 },
              ]}>
              {pending && (
                <ActivityIndicator size="small" color={C.onInk} style={{ marginRight: 6 }} />
              )}
              <Text style={[styles.submitBtnText, { color: C.onInk }]}>
                {editing ? 'Save changes' : 'Record payment'}
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
    maxHeight: '92%',
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
  emptyNotice: {
    borderWidth: 1,
    padding: 14,
    borderRadius: R.md,
  },
  emptyNoticeText: {
    fontSize: 13.5,
  },
  field: {
    gap: 6,
  },
  row2: {
    flexDirection: 'row',
    gap: 12,
  },
  hint: {
    fontSize: 11.5,
    marginTop: -2,
    ...tabular,
  },
  optionList: {
    gap: 6,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: R.md,
    borderWidth: 1,
    gap: 8,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
  optionMeta: {
    fontSize: 12.5,
    fontWeight: '600',
    ...tabular,
  },
  input: {
    height: 44,
    borderRadius: R.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textarea: {
    height: 72,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  payFullBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: R.sm,
  },
  payFullText: {
    fontSize: 12.5,
    fontWeight: '600',
    ...tabular,
  },
  warningBox: {
    borderWidth: 1,
    borderRadius: R.md,
    padding: 12,
    gap: 10,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13,
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
