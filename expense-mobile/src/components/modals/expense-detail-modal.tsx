import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { IconCheck, IconClose } from '@/components/icons';
import {
  Avatar,
  CategoryGlyph,
  ConfirmModal,
  ExportPillButton,
  StatusText,
} from '@/components/mobile-ui';
import { useLedger } from '@/context/ledger-context';
import { useAppTheme } from '@/context/theme-context';
import { bottomSafePad, R, tabular } from '@/design/tokens';
import { deleteExpense, settleShare } from '@/lib/actions';
import { formatDateLong, todayISO } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import { LedgerShare } from '@/lib/ledger';
import { formatPHP } from '@/lib/money';
import { exportExpenseDetailPdf } from '@/lib/pdf';

export function ExpenseDetailModal() {
  const router = useRouter();
  const { C, T } = useAppTheme();
  const {
    expenseDetailState,
    closeExpenseDetail,
    openExpenseForm,
    openPaymentForm,
    ledger,
    refresh,
    showToast,
  } = useLedger();
  const { open, expenseId } = expenseDetailState;
  const expense = expenseId ? ledger.expenses.find((e) => e.id === expenseId) ?? null : null;

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settleTarget, setSettleTarget] = useState<LedgerShare | null>(null);
  const [settling, setSettling] = useState(false);

  if (!expense) return null;

  const paymentCount = ledger.payments.filter((p) => p.expenseId === expense.id).length;

  async function handleDelete() {
    if (!expense) return;
    setDeleting(true);
    const res = await deleteExpense(expense.id);
    setDeleting(false);
    if (!res.ok) {
      showToast(res.error || 'Could not delete expense', 'error');
      return;
    }
    setConfirmDeleteOpen(false);
    closeExpenseDetail();
    await refresh(true);
    showToast('Expense deleted');
  }

  async function handleConfirmQuickSettle() {
    if (!settleTarget) return;
    setSettling(true);
    const res = await settleShare(settleTarget.id, todayISO());
    setSettling(false);
    if (!res.ok) {
      showToast(res.error || 'Could not settle share', 'error');
      return;
    }
    setSettleTarget(null);
    await refresh(true);
    showToast(`${settleTarget.memberName}'s share settled`);
  }

  function handleOpenMember(memberId: string) {
    hapticLight();
    closeExpenseDetail();
    setTimeout(() => router.push(`/members/${memberId}`), 80);
  }

  function handleOpenPay(share: LedgerShare) {
    hapticLight();
    closeExpenseDetail();
    setTimeout(
      () => openPaymentForm({ memberId: share.memberId, shareId: share.id }),
      80
    );
  }

  return (
    <>
      <Modal visible={open} transparent animationType="slide" onRequestClose={closeExpenseDetail}>
        <View style={[styles.backdrop, { backgroundColor: C.scrim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeExpenseDetail} />
          <View style={[styles.sheet, { backgroundColor: C.surface }]}>
            <View style={[styles.handle, { backgroundColor: C.lineStrong }]} />
            <View style={[styles.header, { borderBottomColor: C.line }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: C.ink }]}>{expense.description}</Text>
                <Text style={[styles.subtitle, { color: C.muted }]}>
                  {formatDateLong(expense.date)}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close"
                onPress={closeExpenseDetail}
                style={[styles.closeBtn, { backgroundColor: C.sunken }]}>
                <IconClose size={13} color={C.ink2} />
              </Pressable>
            </View>

            <ScrollView style={styles.body} contentContainerStyle={{ gap: 20 }}>
              {/* Receipt summary card */}
              <View
                style={[
                  styles.receiptBanner,
                  { backgroundColor: C.paper, borderColor: C.line },
                ]}>
                <CategoryGlyph category={expense.category} whiteBg />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.receiptMeta, { color: C.muted }]}>
                    {expense.category} · Paid by {expense.paidByName ?? 'You'}
                  </Text>
                  <Text style={[styles.receiptTotal, { color: C.ink }]}>
                    {formatPHP(expense.totalCents)}
                  </Text>
                </View>
                <StatusText status={expense.status} />
              </View>

              {expense.notes ? (
                <View style={{ gap: 6 }}>
                  <Text style={T.micro}>Notes</Text>
                  <Text style={[styles.notesText, { color: C.ink2 }]}>{expense.notes}</Text>
                </View>
              ) : null}

              <View style={{ gap: 8 }}>
                <View style={styles.splitSectionHeader}>
                  <Text style={T.micro}>Split</Text>
                  <Text style={[styles.splitHint, { color: C.faint }]}>
                    Tap person to view profile
                  </Text>
                </View>
                <View style={[styles.splitList, { borderColor: C.line }]}>
                  {expense.userShareCents > 0 && (
                    <View style={styles.splitRow}>
                      <View style={[styles.youTile, { backgroundColor: C.ink }]}>
                        <Text style={[styles.youTileText, { color: C.onInk }]}>YOU</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={T.bodyStrong}>You</Text>
                        <Text style={[styles.participantSub, { color: C.muted }]}>
                          Your own share
                        </Text>
                      </View>
                      <Text style={[styles.youShareAmount, { color: C.muted }]}>
                        {formatPHP(expense.userShareCents)}
                      </Text>
                    </View>
                  )}
                  {expense.shares.map((s, idx) => {
                    const canPay = !s.isPayer && s.remainingCents > 0;
                    return (
                      <React.Fragment key={s.id}>
                        {(idx > 0 || expense.userShareCents > 0) && (
                          <View style={[styles.divider, { backgroundColor: C.line }]} />
                        )}
                        <View style={styles.splitRow}>
                          <Pressable
                            onPress={() => handleOpenMember(s.memberId)}
                            style={({ pressed }) => [
                              styles.participantTap,
                              pressed && { opacity: 0.7 },
                            ]}>
                            <Avatar name={s.memberName} id={s.memberId} />
                            <View style={{ flex: 1 }}>
                              <Text style={T.bodyStrong} numberOfLines={1}>
                                {s.memberName}
                              </Text>
                              <Text style={[styles.participantSub, { color: C.muted }]}>
                                {s.isPayer
                                  ? 'Paid the bill'
                                  : `Share ${formatPHP(s.amountCents)} · paid ${formatPHP(s.paidCents)}`}
                              </Text>
                            </View>
                          </Pressable>

                          <View style={styles.shareRight}>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={T.amount}>
                                {formatPHP(Math.max(s.remainingCents, 0))}
                              </Text>
                              <StatusText status={s.status} />
                            </View>
                            {canPay && (
                              <View style={styles.quickActionRow}>
                                <Pressable
                                  accessibilityLabel={`Record payment for ${s.memberName}`}
                                  onPress={() => handleOpenPay(s)}
                                  style={({ pressed }) => [
                                    styles.payPill,
                                    { backgroundColor: C.sunken, borderColor: C.line },
                                    pressed && { opacity: 0.78 },
                                  ]}>
                                  <Text style={[styles.payPillText, { color: C.ink }]}>Pay</Text>
                                </Pressable>
                                <Pressable
                                  accessibilityLabel={`Settle ${s.memberName} in full`}
                                  onPress={() => {
                                    hapticLight();
                                    setSettleTarget(s);
                                  }}
                                  style={({ pressed }) => [
                                    styles.settleCheckBtn,
                                    { backgroundColor: C.paid },
                                    pressed && { opacity: 0.82 },
                                  ]}>
                                  <IconCheck size={12} color="#FFFFFF" strokeWidth={2.3} />
                                </Pressable>
                              </View>
                            )}
                          </View>
                        </View>
                      </React.Fragment>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: C.line }]}>
              <Pressable
                onPress={() => {
                  hapticLight();
                  setConfirmDeleteOpen(true);
                }}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  { backgroundColor: C.owedSoft },
                  pressed && { opacity: 0.78 },
                ]}>
                <Text style={[styles.deleteBtnText, { color: C.owed }]}>Delete</Text>
              </Pressable>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ExportPillButton
                  label="Receipt PDF"
                  onPress={() =>
                    exportExpenseDetailPdf({
                      filename: `expense-${
                        expense.description
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)/g, '') || 'receipt'
                      }-${expense.date}.pdf`,
                      shareTitle: `Expense: ${expense.description}`,
                      expense,
                    })
                  }
                />
                <Pressable
                  onPress={() => {
                    hapticLight();
                    const target = expense;
                    closeExpenseDetail();
                    setTimeout(() => openExpenseForm(target), 80);
                  }}
                  style={({ pressed }) => [
                    styles.editBtn,
                    { backgroundColor: C.ink },
                    pressed && { opacity: 0.85 },
                  ]}>
                  <Text style={[styles.editBtnText, { color: C.onInk }]}>Edit</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        open={Boolean(settleTarget)}
        onClose={() => setSettleTarget(null)}
        title={`Settle ${settleTarget?.memberName ?? ''}?`}
        description={
          settleTarget
            ? `Record a full payment of ${formatPHP(settleTarget.remainingCents)} from ${
                settleTarget.memberName
              } for “${expense.description}”, dated today.`
            : ''
        }
        confirmLabel="Settle in full"
        loading={settling}
        onConfirm={handleConfirmQuickSettle}
      />

      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title={`Delete “${expense.description}”?`}
        description={`This removes the expense and everyone's share of it${
          paymentCount > 0
            ? `, including ${paymentCount} recorded ${paymentCount === 1 ? 'payment' : 'payments'}`
            : ''
        }. Balances will be recalculated. This can't be undone.`}
        confirmLabel="Delete expense"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
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
  receiptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: R.lg,
    borderWidth: 1,
    padding: 16,
  },
  receiptMeta: {
    fontSize: 12,
  },
  receiptTotal: {
    fontSize: 25,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: -0.6,
    ...tabular,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  splitSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  splitHint: {
    fontSize: 11,
  },
  splitList: {
    borderRadius: R.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  participantTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minWidth: 0,
  },
  youTile: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  youTileText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  participantSub: {
    fontSize: 12,
    marginTop: 1,
    ...tabular,
  },
  youShareAmount: {
    fontSize: 14,
    fontWeight: '600',
    ...tabular,
  },
  shareRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  payPill: {
    height: 28,
    paddingHorizontal: 9,
    borderRadius: R.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payPillText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  settleCheckBtn: {
    width: 28,
    height: 28,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: bottomSafePad,
    borderTopWidth: 1,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: R.md,
  },
  deleteBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  editBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: R.md,
  },
  editBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
});
