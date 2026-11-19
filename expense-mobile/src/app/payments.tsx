import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconCheck } from '@/components/icons';
import { MobileScreenWrapper } from '@/components/mobile-shell';
import {
  ActionSheetModal,
  Avatar,
  ChipRow,
  ConfirmModal,
  ListGroup,
  ListRow,
  MobileEmpty,
  PageTitleBar,
  PaginationBar,
  SearchField,
  SectionLabel,
  UnderlineTabs,
} from '@/components/mobile-ui';
import { SwipeableRow } from '@/components/swipeable-row';
import { useLedger } from '@/context/ledger-context';
import { useAppTheme } from '@/context/theme-context';
import { R, tabular } from '@/design/tokens';
import { deletePayment, settleShare } from '@/lib/actions';
import { PAGE_SIZE } from '@/lib/constants';
import { dayLabel, formatDate, groupByDate, shortDate, todayISO } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import { LedgerPayment, LedgerShare } from '@/lib/ledger';
import { formatPHP, sumCents } from '@/lib/money';

export default function PaymentsScreen() {
  const { C, T } = useAppTheme();
  const { ledger, openPaymentForm, refresh, showToast } = useLedger();

  const [memberFilter, setMemberFilter] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<'unpaid' | 'history'>('unpaid');

  const [shareMenu, setShareMenu] = useState<LedgerShare | null>(null);
  const [paymentMenu, setPaymentMenu] = useState<LedgerPayment | null>(null);
  const [toSettle, setToSettle] = useState<LedgerShare | null>(null);
  const [toDelete, setToDelete] = useState<LedgerPayment | null>(null);
  const [pending, setPending] = useState(false);

  const outstanding = useMemo(
    () =>
      ledger.shares
        .filter((s) => !s.isPayer && s.remainingCents > 0 && (!memberFilter || s.memberId === memberFilter))
        .sort((a, b) => (a.expenseDate < b.expenseDate ? -1 : 1)),
    [ledger.shares, memberFilter]
  );

  const history = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ledger.payments.filter(
      (p) =>
        (!memberFilter || p.memberId === memberFilter) &&
        (!q || `${p.memberName} ${p.expenseDescription} ${p.notes}`.toLowerCase().includes(q))
    );
  }, [ledger.payments, memberFilter, query]);

  const pageCount = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = history.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const groupedHistory = useMemo(() => groupByDate(rows, (p) => p.date), [rows]);
  const outstandingTotal = useMemo(
    () => sumCents(outstanding.map((s) => s.remainingCents)),
    [outstanding]
  );

  const memberChips = useMemo(
    () => [{ value: '', label: 'All people' }, ...ledger.members.map((m) => ({ value: m.id, label: m.name }))],
    [ledger.members]
  );

  async function handleConfirmSettle() {
    if (!toSettle) return;
    setPending(true);
    const res = await settleShare(toSettle.id, todayISO());
    setPending(false);
    if (!res.ok) {
      showToast(res.error || 'Could not settle share', 'error');
      return;
    }
    setToSettle(null);
    await refresh(true);
    showToast('Marked as settled');
  }

  async function handleConfirmDelete() {
    if (!toDelete) return;
    setPending(true);
    const res = await deletePayment(toDelete.id);
    setPending(false);
    if (!res.ok) {
      showToast(res.error || 'Could not delete payment', 'error');
      return;
    }
    setToDelete(null);
    await refresh(true);
    showToast('Payment deleted');
  }

  return (
    <MobileScreenWrapper>
      <PageTitleBar
        eyebrow="Settlements"
        title="Payments"
        subtitle={
          outstanding.length > 0
            ? `${outstanding.length} unpaid ${
                outstanding.length === 1 ? 'share' : 'shares'
              } · ${formatPHP(outstandingTotal)}`
            : 'All shares settled'
        }
      />

      <View style={styles.stack}>
        <UnderlineTabs
          tabs={[
            { id: 'unpaid', label: 'To collect', count: outstanding.length },
            { id: 'history', label: 'History', count: history.length },
          ]}
          value={tab}
          onChange={(v) => setTab(v as 'unpaid' | 'history')}
        />

        {ledger.members.length > 0 && (
          <ChipRow
            options={memberChips}
            value={memberFilter}
            onChange={(val) => {
              setMemberFilter(val);
              setPage(1);
            }}
          />
        )}

        {/* Tab 1: Unpaid Shares (with Swipe-to-Settle) */}
        {tab === 'unpaid' && (
          <View style={{ gap: 8 }}>
            {outstanding.length > 0 && (
              <Text style={[styles.swipeHint, { color: C.muted }]}>
                Tip: swipe left on any row to settle quickly
              </Text>
            )}
            <ListGroup>
              {outstanding.length === 0 ? (
                <MobileEmpty
                  code="OK"
                  title="All caught up"
                  description="No unpaid expense shares right now."
                />
              ) : (
                outstanding.map((s) => (
                  <SwipeableRow
                    key={s.id}
                    actionLabel="Settle"
                    actionTone="paid"
                    actionIcon={<IconCheck size={14} color="#FFFFFF" strokeWidth={2.3} />}
                    onAction={() => setToSettle(s)}>
                    <View style={styles.unpaidRow}>
                      <Pressable
                        onPress={() => {
                          hapticLight();
                          setShareMenu(s);
                        }}
                        style={({ pressed }) => [styles.unpaidLeft, pressed && { opacity: 0.7 }]}>
                        <Avatar name={s.memberName} id={s.memberId} />
                        <View style={{ flex: 1 }}>
                          <Text style={T.bodyStrong} numberOfLines={1}>
                            {s.memberName}
                          </Text>
                          <Text style={[styles.rowSubtitle, { color: C.muted }]} numberOfLines={1}>
                            {s.expenseDescription} · {shortDate(s.expenseDate)}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[T.amount, { color: C.owed }]}>
                            {formatPHP(s.remainingCents)}
                          </Text>
                          <Text style={[styles.rowMeta, { color: C.faint }]}>
                            {s.paidCents > 0 ? `of ${formatPHP(s.owedCents)}` : 'unpaid'}
                          </Text>
                        </View>
                      </Pressable>

                      <Pressable
                        hitSlop={4}
                        onPress={() => {
                          hapticLight();
                          setToSettle(s);
                        }}
                        style={({ pressed }) => [
                          styles.settleBtn,
                          { backgroundColor: C.ink },
                          pressed && { opacity: 0.85 },
                        ]}>
                        <Text style={[styles.settleBtnText, { color: C.onInk }]}>Settle</Text>
                      </Pressable>
                    </View>
                  </SwipeableRow>
                ))
              )}
            </ListGroup>
          </View>
        )}

        {/* Tab 2: Payment History */}
        {tab === 'history' && (
          <View style={{ gap: 16 }}>
            {ledger.payments.length > 0 && (
              <SearchField
                value={query}
                onChangeText={(q) => {
                  setQuery(q);
                  setPage(1);
                }}
                placeholder="Search payments…"
              />
            )}

            {ledger.payments.length === 0 ? (
              <ListGroup>
                <MobileEmpty
                  code="PY"
                  title="No payments yet"
                  description="Payments will appear here once someone pays you back."
                />
              </ListGroup>
            ) : history.length === 0 ? (
              <ListGroup>
                <MobileEmpty
                  code="00"
                  title="No matching payments"
                  description="Try another person or search term."
                />
              </ListGroup>
            ) : (
              <View style={{ gap: 20 }}>
                {groupedHistory.map(([date, items]) => (
                  <View key={date}>
                    <SectionLabel
                      action={
                        <Text style={[styles.dayTotalText, { color: C.paid }]}>
                          +{formatPHP(sumCents(items.map((i) => i.amountCents)))}
                        </Text>
                      }>
                      {dayLabel(date)}
                    </SectionLabel>
                    <ListGroup>
                      {items.map((p) => (
                        <ListRow
                          key={p.id}
                          onPress={() => setPaymentMenu(p)}
                          leading={<Avatar name={p.memberName} id={p.memberId} />}
                          title={p.memberName}
                          subtitle={`${p.expenseDescription}${p.notes ? ` · “${p.notes}”` : ''}`}
                          trailing={
                            <Text style={[styles.positiveAmount, { color: C.paid }]}>
                              +{formatPHP(p.amountCents)}
                            </Text>
                          }
                        />
                      ))}
                    </ListGroup>
                  </View>
                ))}
                {history.length > PAGE_SIZE && (
                  <ListGroup>
                    <PaginationBar
                      page={safePage}
                      pageSize={PAGE_SIZE}
                      total={history.length}
                      onPageChange={setPage}
                    />
                  </ListGroup>
                )}
              </View>
            )}
          </View>
        )}
      </View>

      <ActionSheetModal
        open={Boolean(shareMenu)}
        onClose={() => setShareMenu(null)}
        title={shareMenu ? `${shareMenu.memberName} · ${shareMenu.expenseDescription}` : ''}
        description={
          shareMenu
            ? `${formatPHP(shareMenu.remainingCents)} remaining of ${formatPHP(shareMenu.owedCents)}`
            : ''
        }
        actions={[
          shareMenu && {
            label: `Settle ${formatPHP(shareMenu.remainingCents)}`,
            description: 'Mark this share as paid in full today',
            code: 'CHECK',
            primary: true,
            onSelect: () => setToSettle(shareMenu),
          },
          shareMenu && {
            label: 'Record partial payment',
            description: 'Enter a custom amount or date',
            code: 'PY',
            onSelect: () => openPaymentForm({ shareId: shareMenu.id }),
          },
        ]}
      />

      <ActionSheetModal
        open={Boolean(paymentMenu)}
        onClose={() => setPaymentMenu(null)}
        title={paymentMenu ? `${formatPHP(paymentMenu.amountCents)} from ${paymentMenu.memberName}` : ''}
        description={
          paymentMenu ? `${paymentMenu.expenseDescription} · ${formatDate(paymentMenu.date)}` : ''
        }
        actions={[
          paymentMenu && {
            label: 'Edit payment',
            code: 'ED',
            onSelect: () => openPaymentForm({ payment: paymentMenu }),
          },
          paymentMenu && {
            label: 'Delete payment',
            code: 'RM',
            destructive: true,
            onSelect: () => setToDelete(paymentMenu),
          },
        ]}
      />

      <ConfirmModal
        open={Boolean(toSettle)}
        onClose={() => setToSettle(null)}
        title="Mark as fully settled?"
        description={
          toSettle
            ? `This records a payment of ${formatPHP(toSettle.remainingCents)} from ${
                toSettle.memberName
              } for “${toSettle.expenseDescription}”, dated today.`
            : ''
        }
        confirmLabel="Mark as settled"
        loading={pending}
        onConfirm={handleConfirmSettle}
      />

      <ConfirmModal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Delete this payment?"
        description={
          toDelete
            ? `${formatPHP(toDelete.amountCents)} from ${toDelete.memberName} on ${formatDate(
                toDelete.date
              )} will be removed and their balance will go back up.`
            : ''
        }
        confirmLabel="Delete payment"
        destructive
        loading={pending}
        onConfirm={handleConfirmDelete}
      />
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
  },
  swipeHint: {
    fontSize: 12,
    paddingHorizontal: 2,
  },
  unpaidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  unpaidLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  rowMeta: {
    fontSize: 11.5,
    marginTop: 2,
    ...tabular,
  },
  settleBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dayTotalText: {
    fontSize: 12,
    fontWeight: '600',
    ...tabular,
  },
  positiveAmount: {
    fontSize: 14.5,
    fontWeight: '600',
    ...tabular,
  },
});
