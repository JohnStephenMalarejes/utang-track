import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { ConfigNotice } from "@/components/layout/config-notice";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getLedger } from "@/lib/data";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({ children }) {
  if (!isSupabaseConfigured()) return <ConfigNotice />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 px-4">
        <h1 className="text-lg font-semibold tracking-[-0.01em]">This account isn't the administrator</h1>
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          {user.email} is signed in ({user.id}) but hasn't been registered as the admin. Run the "register the administrator" SQL step from the README, then sign in
          again.
        </p>
        {adminError && (
          <p className="rounded bg-destructive/10 p-2 font-mono text-xs text-destructive">
            Supabase RPC error: {adminError.message}
          </p>
        )}
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </main>
    );
  }

  // Build compact search index for Command Palette (deduplicated per-request via React cache())
  let commandIndex = { members: [], unpaidByMember: {}, recentExpenses: [], paymentDetails: "" };
  try {
    const ledger = await getLedger();
    const unpaidByMember = {};
    for (const s of ledger.shares) {
      if (s.isPayer || s.remainingCents <= 0) continue;
      if (!unpaidByMember[s.memberId]) unpaidByMember[s.memberId] = [];
      unpaidByMember[s.memberId].push({
        expenseDescription: s.expenseDescription,
        expenseCategory: s.expenseCategory,
        expenseDate: s.expenseDate,
        remainingCents: s.remainingCents,
        owedCents: s.owedCents,
        paidCents: s.paidCents,
        isPayer: false,
      });
    }
    commandIndex = {
      members: ledger.members.map((m) => ({
        id: m.id,
        name: m.name,
        contact: m.contact,
        balanceCents: m.balanceCents,
        expenseCount: m.expenseCount,
        shareToken: m.shareToken,
      })),
      unpaidByMember,
      recentExpenses: ledger.expenses.slice(0, 50).map((e) => ({
        id: e.id,
        description: e.description,
        category: e.category,
        date: e.date,
        totalCents: e.totalCents,
        status: e.status,
      })),
      paymentDetails: ledger.paymentDetails || "",
    };
  } catch {
    // Non-fatal: let the page's own error boundary handle DB errors if any
  }

  return (
    <AdminShell email={user.email} commandIndex={commandIndex}>
      {children}
    </AdminShell>
  );
}
