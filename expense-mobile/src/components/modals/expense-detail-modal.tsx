import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconClose } from '@/components/icons';
import {
  Avatar,
  BottomSheet,
  CategoryGlyph,
  ConfirmModal,
  ExportPillButton,
  StatusText,
} from '@/components/mobile-ui';
import { useLedger } from '@/context/ledger-context';
import { useAppTheme } from '@/context/theme-context';
import { bottomSafePad, METRICS, R, tabular } from '@/design/tokens';
import { deleteExpense } from '@/lib/actions';
import { formatDateLong } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import { LedgerShare } from '@/lib/ledger';
import { formatPHP } from '@/lib/money';
import { exportExpenseDetailPdf } from '@/lib/pdf';

export function ExpenseDetailModal() {
  const router = useRouter();
  const { C, T } = useAppTheme();
  const insets = useSafeAreaInsets();
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

  function handleOpenMember(memberId: string) {
    hapticLight();
    closeExpenseDetail();
    setTimeout(() => router.push(`/members/${memberId}`), 120);
  }

  function handleOpenPay(share: LedgerShare) {
    hapticLight();
    closeExpenseDetail();
    setTimeout(
      () => openPaymentForm({ memberId: share.memberId, shareId: share.id }),
      120
    );
  }

  const sheetHeader = (
    <View style={[styles.header, { borderBottomColor: C.line }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: C.ink }]}>{expense.description}</Text>
        <Text style={[styles.subtitle, { color: C.muted }]}>
          {formatDateLong(expense.date)}
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Close"
        hitSlop={4}
        onPress={closeExpenseDetail}
        style={[styles.closeBtn, { backgroundColor: C.sunken }]}>
        <IconClose size={16} color={C.ink} />
      </Pressable>
    </View>
  );

  return (
    <>
      <BottomSheet
        open={open}
        onClose={closeExpenseDetail}
        maxHeight="90%"
        header={sheetHeader}>
        <ScrollView
          style={styles.body}
          contentContainerStyle={{ gap: 20, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}>
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
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[styles.receiptTotal, { color: C.ink }]}>
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
              <Text style={[styles.splitHint, { color: C.muted }]}>
                Tap person to view ledger
              </Text>
            </View>
            <View style={[styles.splitList, { borderColor: C.line, backgroundColor: C.surface }]}>
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
                          <Pressable
                            accessibilityLabel={`Record payment for ${s.memberName}`}
                            hitSlop={4}
                            onPress={() => handleOpenPay(s)}
                            style={({ pressed }) => [
                              styles.payPill,
                              { backgroundColor: C.surface, borderColor: C.line },
                              pressed && { backgroundColor: C.sunken },
                            ]}>
                            <Text style={[styles.payPillText, { color: C.ink }]}>Pay</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              borderTopColor: C.line,
              paddingBottom: Math.max(insets.bottom, bottomSafePad),
            },
          ]}>
          <Pressable
            onPress={() => {
              hapticLight();
              setConfirmDeleteOpen(true);
            }}
            style={({ pressed }) => [
              styles.deleteBtn,
              { backgroundColor: C.dangerSoft, borderColor: C.dangerBorder },
              pressed && { opacity: 0.78 },
            ]}>
            <Text style={[styles.deleteBtnText, { color: C.danger }]}>Delete</Text>
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
                setTimeout(() => openExpenseForm(target), 120);
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
      </BottomSheet>

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
  receiptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: R.lg,
    borderWidth: 1,
    padding: 16,
  },
  receiptMeta: {
    fontSize: 12.5,
  },
  receiptTotal: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: -0.78,
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
    fontSize: 12,
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
    minHeight: METRICS.rowMinHeight,
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  participantTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  youTile: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  youTileText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  participantSub: {
    fontSize: 12.5,
    marginTop: 2,
    ...tabular,
  },
  youShareAmount: {
    fontSize: 14.5,
    fontWeight: '600',
    ...tabular,
  },
  shareRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  payPill: {
    height: 40,
    minWidth: 54,
    paddingHorizontal: 14,
    borderRadius: R.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  deleteBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  editBtn: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
});
