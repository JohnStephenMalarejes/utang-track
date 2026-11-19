import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconMoon, IconSun } from '@/components/icons';
import { MobileScreenWrapper } from '@/components/mobile-shell';
import {
  ExportPillButton,
  ListGroup,
  ListRow,
  PageTitleBar,
  SectionLabel,
} from '@/components/mobile-ui';
import { useLedger } from '@/context/ledger-context';
import { ThemeMode, useAppTheme } from '@/context/theme-context';
import { R, tabular } from '@/design/tokens';
import { todayISO } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import { exportJsonBackup, exportLedgerSummaryPdf } from '@/lib/pdf';
import { DB_NAME } from '@/lib/sqlite';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, ledger } = useLedger();
  const { C, mode, setMode, isDark } = useAppTheme();
  const { totals } = ledger;

  const displayName = user?.name || 'Administrator';
  const email = user?.email || 'Local workspace';
  const initial = displayName.trim().charAt(0).toUpperCase();

  async function handleSignOut() {
    hapticLight();
    await signOut();
    router.replace('/login');
  }

  return (
    <MobileScreenWrapper>
      <PageTitleBar
        eyebrow="Workspace"
        title="Settings"
        subtitle="Appearance, account, local database & backups"
      />

      <View style={styles.stack}>
        {/* Appearance — Light / Night Ledger / System */}
        <View>
          <SectionLabel>Appearance</SectionLabel>
          <ListGroup>
            <View style={styles.themeRow}>
              <View style={styles.themeHeader}>
                <View
                  style={[
                    styles.themeIconTile,
                    { backgroundColor: C.sunken, borderColor: C.line },
                  ]}>
                  {isDark ? (
                    <IconMoon size={16} color={C.ink} />
                  ) : (
                    <IconSun size={16} color={C.ink} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.themeTitle, { color: C.ink }]}>Theme</Text>
                  <Text style={[styles.themeSub, { color: C.muted }]}>
                    {isDark ? 'Night Ledger active' : 'Warm Paper Ledger active'}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.segmentTrack,
                  { backgroundColor: C.sunken, borderColor: C.line },
                ]}>
                {THEME_OPTIONS.map((opt) => {
                  const active = mode === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        hapticLight();
                        setMode(opt.value);
                      }}
                      style={[
                        styles.segmentBtn,
                        active && {
                          backgroundColor: C.ink,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.segmentText,
                          { color: active ? C.onInk : C.muted },
                          active && { fontWeight: '700' },
                        ]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ListGroup>
        </View>

        {/* Account */}
        <View>
          <SectionLabel>Account</SectionLabel>
          <ListGroup>
            <ListRow
              leading={
                <View style={[styles.adminSquare, { backgroundColor: C.ink }]}>
                  <Text style={[styles.adminSquareText, { color: C.onInk }]}>{initial}</Text>
                </View>
              }
              title={displayName}
              subtitle={email}
              trailing={
                <Pressable
                  onPress={handleSignOut}
                  style={({ pressed }) => [
                    styles.signOutBtn,
                    { backgroundColor: C.sunken, borderColor: C.line },
                    pressed && { opacity: 0.78 },
                  ]}>
                  <Text style={[styles.signOutText, { color: C.ink }]}>Sign out</Text>
                </Pressable>
              }
            />
          </ListGroup>
        </View>

        {/* Database */}
        <View>
          <SectionLabel>Storage</SectionLabel>
          <ListGroup>
            <ListRow
              leading={
                <View
                  style={[
                    styles.dbSquare,
                    { backgroundColor: C.sunken, borderColor: C.line },
                  ]}>
                  <Text style={[styles.dbSquareText, { color: C.ink2 }]}>DB</Text>
                </View>
              }
              title="Local SQLite"
              subtitle={`${DB_NAME} · Offline on-device storage`}
              trailing={<Text style={[styles.statusActive, { color: C.paid }]}>Active</Text>}
            />
          </ListGroup>
        </View>

        {/* Ledger */}
        <View>
          <SectionLabel>Ledger</SectionLabel>
          <ListGroup>
            <ListRow
              title="People"
              trailing={<Text style={[styles.countText, { color: C.ink }]}>{totals.memberCount}</Text>}
            />
            <ListRow
              title="Expenses"
              trailing={<Text style={[styles.countText, { color: C.ink }]}>{totals.expenseCount}</Text>}
            />
            <ListRow
              title="Payments"
              trailing={<Text style={[styles.countText, { color: C.ink }]}>{totals.paymentCount}</Text>}
            />
            <View style={styles.exportRow}>
              <ExportPillButton
                label="Export PDF report"
                onPress={() =>
                  exportLedgerSummaryPdf({
                    filename: `debt-tracker-report-${todayISO()}.pdf`,
                    shareTitle: 'Debt Tracker Full Report',
                    members: ledger.members,
                    expenses: ledger.expenses,
                  })
                }
              />
              <ExportPillButton
                label="Download JSON backup"
                onPress={() => exportJsonBackup(ledger)}
              />
            </View>
          </ListGroup>
        </View>

        {/* About */}
        <View>
          <SectionLabel>About</SectionLabel>
          <ListGroup>
            <ListRow
              title="Version"
              trailing={<Text style={[styles.metaText, { color: C.muted }]}>1.0.0</Text>}
            />
            <ListRow
              title="Currency"
              trailing={<Text style={[styles.metaText, { color: C.muted }]}>Philippine peso (₱)</Text>}
            />
            <ListRow
              title="Precision"
              subtitle="All splits and balances are calculated in integer centavos."
            />
          </ListGroup>
        </View>
      </View>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 24,
  },
  themeRow: {
    padding: 14,
    gap: 12,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeIconTile: {
    width: 38,
    height: 38,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeTitle: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  themeSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: R.md,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    height: 34,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  adminSquare: {
    width: 38,
    height: 38,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminSquareText: {
    fontSize: 14,
    fontWeight: '700',
  },
  signOutBtn: {
    height: 34,
    paddingHorizontal: 13,
    borderRadius: R.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  dbSquare: {
    width: 38,
    height: 38,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dbSquareText: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusActive: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  countText: {
    fontSize: 14.5,
    fontWeight: '600',
    ...tabular,
  },
  exportRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 14,
  },
  metaText: {
    fontSize: 13.5,
  },
});
