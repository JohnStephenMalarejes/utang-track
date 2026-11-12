import { LogOut } from "lucide-react";
import { getLedger } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ExportButton } from "@/components/layout/export-button";
import { ListGroup, ListRow, SectionLabel } from "@/components/layout/mobile";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const [ledger, { data }] = await Promise.all([getLedger(), supabase.auth.getUser()]);
  const { totals } = ledger;
  const email = data.user?.email || "Administrator";
  const initial = email.trim().charAt(0).toUpperCase();

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Account, data and app information."
        mobileSubtitle="Account, backups & app info"
      />

      {/* ==================== MOBILE SCREEN (< md) ==================== */}
      <div className="space-y-6 md:hidden">
        <section aria-label="Account">
          <SectionLabel>Account</SectionLabel>
          <ListGroup>
            <ListRow
              leading={
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-[14px] font-semibold text-mint">
                  {initial}
                </span>
              }
              title={email}
              subtitle="Administrator"
              trailing={
                <form action={signOut}>
                  <button
                    type="submit"
                    className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-[12.5px] font-semibold text-ink"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </form>
              }
            />
          </ListGroup>
        </section>

        <section aria-label="Ledger records">
          <SectionLabel>Ledger</SectionLabel>
          <ListGroup>
            <ListRow title="People" trailing={<span className="tabular text-[14.5px] font-semibold text-ink">{totals.memberCount}</span>} />
            <ListRow title="Expenses" trailing={<span className="tabular text-[14.5px] font-semibold text-ink">{totals.expenseCount}</span>} />
            <ListRow title="Payments" trailing={<span className="tabular text-[14.5px] font-semibold text-ink">{totals.paymentCount}</span>} />
            <div className="p-4">
              <ExportButton ledger={ledger} />
            </div>
          </ListGroup>
        </section>

        <section aria-label="About">
          <SectionLabel>About</SectionLabel>
          <ListGroup>
            <ListRow title="Version" trailing={<span className="tabular text-[13.5px] text-slate-500">1.0.0</span>} />
            <ListRow title="Currency" trailing={<span className="text-[13.5px] text-slate-500">Philippine peso (₱)</span>} />
            <ListRow title="Precision" subtitle="All splits and balances are calculated in integer centavos." />
          </ListGroup>
        </section>
      </div>

      {/* ==================== DESKTOP VIEW (md+) ==================== */}
      <div className="hidden max-w-3xl gap-4 md:grid">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>You're signed in as the administrator.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">{data.user?.email}</p>
            <form action={signOut}>
              <Button type="submit" variant="outline">
                <LogOut /> Sign out
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your data</CardTitle>
            <CardDescription>Stored in your own Supabase project.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Members</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular">{totals.memberCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expenses</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular">{totals.expenseCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Payments</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular">{totals.paymentCount}</dd>
              </div>
            </dl>
            <ExportButton ledger={ledger} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Utang Tracker v1.0.0</p>
            <p>Currency: Philippine peso (₱). All amounts are calculated in whole centavos.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
