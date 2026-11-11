import { LogOut } from "lucide-react";
import { getLedger } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ExportButton } from "@/components/layout/export-button";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const [ledger, { data }] = await Promise.all([getLedger(), supabase.auth.getUser()]);
  const { totals } = ledger;

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Settings" description="Account, data and app information." />
      <div className="grid max-w-3xl gap-4">
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
