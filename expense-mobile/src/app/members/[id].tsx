import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconCheck } from '@/components/icons';
import { MobileScreenWrapper } from '@/components/mobile-shell';
import {
  Avatar,
  BigMoney,
  CategoryGlyph,
  ConfirmModal,
  ExportPillButton,
  HeaderActionButton,
  ListGroup,
  ListRow,
  MobileEmpty,
  SplitBar,
  StatusText,
  UnderlineTabs,
} from '@/components/mobile-ui';
import { useLedger } from '@/context/ledger-context';
import { useAppTheme } from '@/context/theme-context';
import { R, tabular } from '@/design/tokens';
import { settleMember } from '@/lib/actions';
import { formatDate, shortDate, todayISO } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import { formatPHP } from '@/lib/money';
import { exportMemberStatementPdf } from '@/lib/pdf';

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { C, T } = useAppTheme();
  const { ledger, openMemberForm, openPaymentForm, refresh, showToast } = useLedger();

  const member = ledger.members.find((m) => m.id === id);
  const shares = ledger.shares.filter((s) => s.memberId === id);
  const payments = ledger.payments.filter((p) => p.memberId === id);
  const openShares = shares.filter((s) => s.remainingCents > 0 && !s.isPayer);
  const hasOutstanding = openShares.length > 0;
  const openCents = openShares.reduce((sum, s) => sum + s.remainingCents, 0);

  const [tab, setTab] = useState<'expenses' | 'payments'>('expenses');
  const [settleOpen, setSettleOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!member) {
    return (
      <MobileScreenWrapper>
        <ListGroup>
          <MobileEmpty
            code="MB"
            title="Member not found"
            description="This member may have been deleted."
            actionLabel="Back to People"
            onAction={() => router.replace('/members')}
          />
        </ListGroup>
      </MobileScreenWrapper>
    );
  }

  const paidPct =
    member.assignedCents > 0 ? Math.min(100, (member.paidCents / member.assignedCents) * 100) : 100;
  const statementFilename = `statement-${
    member.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'member'
  }-${todayISO()}.pdf`;

  async function handleConfirmSettleAll() {
    if (!member) return;
    setPending(true);
    const res = await settleMember(member.id, todayISO());
    setPending(false);
    if (!res.ok) {
      showToast(res.error || 'Could not settle expenses', 'error');
      return;
    }
    setSettleOpen(false);
    await refresh(true);
    showToast('All expenses settled');
  }

  return (
    <MobileScreenWrapper>
      <View style={styles.stack}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.memberHeadLeft}>
            <Avatar name={member.name} id={member.id} size="lg" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberName, { color: C.ink }]} numberOfLines={1}>
                {member.name}
              </Text>
              <Text style={[styles.memberMeta, { color: C.muted }]} numberOfLines={2}>
                {[member.contact, member.notes].filter(Boolean).join(' · ') ||
                  `Since ${formatDate(member.createdAt?.slice(0, 10))}`}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <ExportPillButton
              label="Statement"
              onPress={() =>
                exportMemberStatementPdf({
                  filename: statementFilename,
                  shareTitle: `Statement for ${member.name}`,
                  member,
                  shares,
                })
              }
            />
            <HeaderActionButton
              accessibilityLabel={`Edit ${member.name}`}
              onPress={() => openMemberForm(member)}
              icon={<Text style={[styles.editTextIcon, { color: C.ink }]}>Edit</Text>}
            />
          </View>
        </View>

        {/* Statement summary card */}
        <View
          style={[
            styles.statementCard,
            { backgroundColor: C.surface, borderColor: C.line },
          ]}>
          <Text style={T.micro}>
            {member.balanceCents < 0 ? 'Credit (overpaid)' : 'Outstanding balance'}
          </Text>
          <View style={{ marginTop: 6 }}>
            <BigMoney cents={Math.abs(member.balanceCents)} size={38} />
          </View>

          <View style={{ marginTop: 14 }}>
            <SplitBar value={paidPct} />
          </View>

          <View style={styles.progressReadout}>
            <View style={styles.progressItem}>
              <Text style={T.micro}>Paid back</Text>
              <Text style={[T.amount, { color: C.paid }]}>{formatPHP(member.paidCents)}</Text>
            </View>
            <View style={[styles.progressItem, { alignItems: 'flex-end' }]}>
              <Text style={T.micro}>Assigned</Text>
              <Text style={T.amount}>{formatPHP(member.assignedCents)}</Text>
            </View>
          </View>
        </View>

        {hasOutstanding && (
          <View style={styles.actionsGrid}>
            <Pressable
              onPress={() => {
                hapticLight();
                setSettleOpen(true);
              }}
              style={({ pressed }) => [
                styles.primaryBtnInk,
                { backgroundColor: C.ink },
                pressed && { opacity: 0.88 },
              ]}>
              <IconCheck size={13} color={C.onInk} strokeWidth={2.2} />
              <Text style={[styles.primaryBtnInkText, { color: C.onInk }]}>Settle all</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                hapticLight();
                openPaymentForm({ memberId: member.id });
              }}
              style={({ pressed }) => [
                styles.primaryBtnWhite,
                { backgroundColor: C.surface, borderColor: C.lineStrong },
                pressed && { backgroundColor: C.sunken },
              ]}>
              <Text style={[styles.primaryBtnWhiteText, { color: C.ink }]}>Record payment</Text>
            </Pressable>
          </View>
        )}

        {/* Tabs */}
        <UnderlineTabs
          tabs={[
            { id: 'expenses', label: 'Expenses', count: shares.length },
            { id: 'payments', label: 'Payments', count: payments.length },
          ]}
          value={tab}
          onChange={(v) => setTab(v as 'expenses' | 'payments')}
        />

        {tab === 'expenses' && (
          <ListGroup>
            {shares.length === 0 ? (
              <MobileEmpty
                code="EX"
                title="No expenses yet"
                description={`Bills that include ${member.name} will show up here.`}
              />
            ) : (
              shares.map((s) => (
                <View key={s.id} style={styles.shareRow}>
                  <CategoryGlyph category={s.expenseCategory} />
                  <View style={{ flex: 1 }}>
                    <Text style={T.bodyStrong} numberOfLines={1}>
                      {s.expenseDescription}
                    </Text>
                    <Text style={[styles.rowSubtitle, { color: C.muted }]} numberOfLines={1}>
                      {shortDate(s.expenseDate)} · share {formatPHP(s.amountCents)}
                      {s.isPayer ? ' · paid the bill' : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={T.amount}>{formatPHP(Math.max(s.remainingCents, 0))}</Text>
                    <StatusText status={s.status} />
                  </View>
                  {s.remainingCents > 0 && !s.isPayer && (
                    <Pressable
                      onPress={() => {
                        hapticLight();
                        openPaymentForm({ memberId: member.id, shareId: s.id });
                      }}
                      style={({ pressed }) => [
                        styles.payPillBtn,
                        { backgroundColor: C.sunken, borderColor: C.line },
                        pressed && { opacity: 0.8 },
                      ]}>
                      <Text style={[styles.payPillText, { color: C.ink }]}>Pay</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </ListGroup>
        )}

        {tab === 'payments' && (
          <ListGroup>
            {payments.length === 0 ? (
              <MobileEmpty
                code="PY"
                title="No payments yet"
                description="Payments will appear here after you record them."
              />
            ) : (
              payments.map((p) => (
                <ListRow
                  key={p.id}
                  title={p.expenseDescription}
                  subtitle={`${shortDate(p.date)}${p.notes ? ` · “${p.notes}”` : ''}`}
                  trailing={
                    <Text style={[styles.positiveAmount, { color: C.paid }]}>
                      +{formatPHP(p.amountCents)}
                    </Text>
                  }
                />
              ))
            )}
          </ListGroup>
        )}
      </View>

      <ConfirmModal
        open={settleOpen}
        onClose={() => setSettleOpen(false)}
        title={`Settle everything for ${member.name}?`}
        description={`This records payments totalling ${formatPHP(
          openCents
        )} dated today, marking all of ${member.name}'s open expenses as settled.`}
        confirmLabel="Settle all"
        loading={pending}
        onConfirm={handleConfirmSettleAll}
      />
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  memberHeadLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  memberMeta: {
    fontSize: 12.5,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editTextIcon: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  statementCard: {
    borderRadius: R.lg,
    padding: 18,
    borderWidth: 1,
  },
  progressReadout: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressItem: {
    gap: 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: -6,
  },
  primaryBtnInk: {
    flex: 1,
    height: 44,
    borderRadius: R.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  primaryBtnInkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryBtnWhite: {
    flex: 1,
    height: 44,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnWhiteText: {
    fontSize: 14,
    fontWeight: '600',
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  rowSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
  payPillBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: R.sm,
    borderWidth: 1,
  },
  payPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  positiveAmount: {
    fontSize: 14.5,
    fontWeight: '600',
    ...tabular,
  },
});
