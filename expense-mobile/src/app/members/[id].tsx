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
import { METRICS, R, tabular } from '@/design/tokens';
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
        {/* Member Header */}
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

        {/* Flat Hero Balance + Emerald Payoff Bar + 2-Column Hairline Strip */}
        <View style={styles.heroBlock}>
          <Text style={[styles.heroLabel, { color: C.muted }]}>
            {member.balanceCents < 0 ? 'Credit (overpaid)' : 'Outstanding balance'}
          </Text>
          <View style={{ marginTop: 6 }}>
            <BigMoney cents={Math.abs(member.balanceCents)} size={42} />
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: C.muted }]}>Payoff progress</Text>
              <Text
                style={[
                  styles.progressPct,
                  { color: paidPct > 0 ? C.paid : C.muted },
                ]}>
                {Math.round(paidPct)}% paid
              </Text>
            </View>
            <SplitBar value={paidPct} />
          </View>

          <View
            style={[
              styles.metricStrip,
              { backgroundColor: C.surface, borderColor: C.line },
            ]}>
            <View style={styles.metricCell}>
              <Text style={[styles.metricLabel, { color: C.muted }]}>Paid back</Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[
                  styles.metricValue,
                  { color: member.paidCents > 0 ? C.paid : C.ink },
                ]}>
                {formatPHP(member.paidCents)}
              </Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: C.line }]} />
            <View style={styles.metricCell}>
              <Text style={[styles.metricLabel, { color: C.muted }]}>Assigned</Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[styles.metricValue, { color: C.ink }]}>
                {formatPHP(member.assignedCents)}
              </Text>
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
                pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
              ]}>
              <IconCheck size={14} color={C.onInk} strokeWidth={2.2} />
              <Text style={[styles.primaryBtnInkText, { color: C.onInk }]}>Settle all</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                hapticLight();
                openPaymentForm({ memberId: member.id });
              }}
              style={({ pressed }) => [
                styles.primaryBtnWhite,
                { backgroundColor: C.surface, borderColor: C.line },
                pressed && { backgroundColor: C.sunken, transform: [{ scale: 0.985 }] },
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
                      hitSlop={4}
                      onPress={() => {
                        hapticLight();
                        openPaymentForm({ memberId: member.id, shareId: s.id });
                      }}
                      style={({ pressed }) => [
                        styles.payPillBtn,
                        { backgroundColor: C.surface, borderColor: C.line },
                        pressed && { backgroundColor: C.sunken },
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
    alignItems: 'center',
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
    letterSpacing: -0.66,
  },
  memberMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editTextIcon: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroBlock: {
    paddingTop: 2,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  progressWrap: {
    marginTop: 18,
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  progressPct: {
    fontSize: 12.5,
    fontWeight: '600',
    ...tabular,
  },
  metricStrip: {
    marginTop: 14,
    borderRadius: R.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  metricCell: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  metricDivider: {
    width: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
    ...tabular,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtnInk: {
    flex: 1,
    height: METRICS.buttonHeight,
    borderRadius: R.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnInkText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  primaryBtnWhite: {
    flex: 1,
    height: METRICS.buttonHeight,
    borderRadius: R.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnWhiteText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: METRICS.rowMinHeight,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowSubtitle: {
    fontSize: 13,
    marginTop: 2,
    ...tabular,
  },
  payPillBtn: {
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
  positiveAmount: {
    fontSize: 15,
    fontWeight: '600',
    ...tabular,
  },
});
