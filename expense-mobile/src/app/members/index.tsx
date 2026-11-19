import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconChevronRight, IconMore } from '@/components/icons';
import { MobileScreenWrapper } from '@/components/mobile-shell';
import {
  ActionSheetModal,
  Amount,
  Avatar,
  ConfirmModal,
  ExportPillButton,
  HeaderPlusButton,
  ListGroup,
  MiniMeter,
  MobileEmpty,
  PageTitleBar,
  PaginationBar,
  SearchField,
} from '@/components/mobile-ui';
import { useLedger } from '@/context/ledger-context';
import { useAppTheme } from '@/context/theme-context';
import { deleteMember } from '@/lib/actions';
import { PAGE_SIZE } from '@/lib/constants';
import { todayISO } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import { LedgerMember } from '@/lib/ledger';
import { formatPHP } from '@/lib/money';
import { exportLedgerSummaryPdf } from '@/lib/pdf';

export default function MembersScreen() {
  const router = useRouter();
  const { C, T } = useAppTheme();
  const { ledger, openMemberForm, refresh, showToast } = useLedger();
  const { members } = ledger;

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [menuMember, setMenuMember] = useState<LedgerMember | null>(null);
  const [toDelete, setToDelete] = useState<LedgerMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? members.filter((m) => `${m.name} ${m.contact} ${m.notes}`.toLowerCase().includes(q))
      : members;
  }, [members, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function askDelete(member: LedgerMember) {
    if (member.expenseCount > 0 || member.paymentCount > 0) {
      showToast(
        `${member.name} has ${member.expenseCount} expense ${
          member.expenseCount === 1 ? 'share' : 'shares'
        } and ${member.paymentCount} ${
          member.paymentCount === 1 ? 'payment' : 'payments'
        } on record. Remove those first.`,
        'error'
      );
      return;
    }
    setToDelete(member);
  }

  async function handleConfirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const res = await deleteMember(toDelete.id);
    setDeleting(false);
    if (!res.ok) {
      showToast(res.error || 'Could not delete member', 'error');
      return;
    }
    setToDelete(null);
    await refresh(true);
    showToast('Member deleted');
  }

  return (
    <MobileScreenWrapper>
      <PageTitleBar
        eyebrow="Directory"
        title="People"
        subtitle={
          members.length > 0
            ? `${members.length} ${members.length === 1 ? 'person' : 'people'} · ${formatPHP(
                ledger.totals.outstandingCents
              )} owed`
            : 'People you split bills with'
        }
        right={
          <>
            {filtered.length > 0 && (
              <ExportPillButton
                label="Export"
                onPress={() =>
                  exportLedgerSummaryPdf({
                    filename: `debt-tracker-members-${todayISO()}.pdf`,
                    shareTitle: 'Debt Tracker Member Balances',
                    members: filtered,
                    expenses: ledger.expenses,
                  })
                }
              />
            )}
            <HeaderPlusButton onPress={() => openMemberForm(null)} />
          </>
        }
      />

      {members.length === 0 ? (
        <ListGroup>
          <MobileEmpty
            code="MB"
            title="No people yet"
            description="Add the friends you split bills with. Everyone you add here can be chosen as a participant in an expense."
            actionLabel="Add first member"
            onAction={() => openMemberForm(null)}
          />
        </ListGroup>
      ) : (
        <View style={styles.stack}>
          <SearchField
            value={query}
            onChangeText={(q) => {
              setQuery(q);
              setPage(1);
            }}
            placeholder="Search people…"
          />

          {filtered.length === 0 ? (
            <ListGroup>
              <MobileEmpty
                code="00"
                title="No matching people"
                description="Try a different name or clear the search."
              />
            </ListGroup>
          ) : (
            <View style={{ gap: 16 }}>
              <ListGroup>
                {rows.map((m) => {
                  const pct = m.assignedCents > 0 ? (m.paidCents / m.assignedCents) * 100 : 100;
                  return (
                    <View key={m.id} style={styles.memberRow}>
                      <Pressable
                        onPress={() => router.push(`/members/${m.id}`)}
                        style={({ pressed }) => [styles.memberLink, pressed && { opacity: 0.7 }]}>
                        <Avatar name={m.name} id={m.id} />
                        <View style={{ flex: 1 }}>
                          <Text style={T.bodyStrong} numberOfLines={1}>
                            {m.name}
                          </Text>
                          <Text style={[styles.memberSub, { color: C.muted }]} numberOfLines={1}>
                            {m.contact || `${m.expenseCount} ${m.expenseCount === 1 ? 'bill' : 'bills'}`}
                            {m.assignedCents > 0 ? ` · ${formatPHP(m.paidCents)} paid` : ''}
                          </Text>
                          {m.assignedCents > 0 && <MiniMeter value={pct} />}
                        </View>
                        <Amount
                          value={formatPHP(Math.max(m.balanceCents, 0))}
                          caption={
                            m.balanceCents > 0 ? 'owes' : m.expenseCount > 0 ? 'settled' : 'no bills'
                          }
                          tone={m.balanceCents > 0 ? 'owed' : 'muted'}
                        />
                        <IconChevronRight size={13} color={C.faint} />
                      </Pressable>

                      <Pressable
                        accessibilityLabel={`Actions for ${m.name}`}
                        onPress={() => {
                          hapticLight();
                          setMenuMember(m);
                        }}
                        style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.6 }]}>
                        <IconMore size={16} color={C.muted} />
                      </Pressable>
                    </View>
                  );
                })}
              </ListGroup>

              {filtered.length > PAGE_SIZE && (
                <ListGroup>
                  <PaginationBar
                    page={safePage}
                    pageSize={PAGE_SIZE}
                    total={filtered.length}
                    onPageChange={setPage}
                  />
                </ListGroup>
              )}
            </View>
          )}
        </View>
      )}

      <ActionSheetModal
        open={Boolean(menuMember)}
        onClose={() => setMenuMember(null)}
        title={menuMember?.name}
        description={
          menuMember?.contact ||
          `${menuMember?.expenseCount ?? 0} bills · ${formatPHP(
            menuMember?.balanceCents ?? 0
          )} outstanding`
        }
        actions={[
          menuMember && {
            label: 'Edit member',
            code: 'ED',
            onSelect: () => openMemberForm(menuMember),
          },
          menuMember && {
            label: 'Delete member',
            code: 'RM',
            destructive: true,
            onSelect: () => askDelete(menuMember),
          },
        ]}
      />

      <ConfirmModal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title={`Delete ${toDelete?.name}?`}
        description="This permanently removes the member. This can't be undone."
        confirmLabel="Delete member"
        destructive
        loading={deleting}
        onConfirm={handleConfirmDelete}
      />
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 12,
    gap: 6,
  },
  memberLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  moreBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
