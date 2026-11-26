import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { statusFor } from "@/lib/calculations/ledger";
import { sumCents, toCents } from "@/lib/utils/money";
import { PublicStatement } from "@/components/share/public-statement";

export const metadata = {
  title: "Utang Statement",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function buildStatementFromRpc(payload) {
  const rawShares = Array.isArray(payload.shares) ? payload.shares : [];
  const rawPayments = Array.isArray(payload.payments) ? payload.payments : [];

  const paidByShare = new Map();
  for (const p of rawPayments) {
    paidByShare.set(p.expense_share_id, (paidByShare.get(p.expense_share_id) || 0) + toCents(p.amount));
  }

  const shares = rawShares.map((s) => {
    const amountCents = toCents(s.share_amount);
    const isPayer = Boolean(s.is_payer);
    const owedCents = isPayer ? 0 : amountCents;
    const paidCents = paidByShare.get(s.id) || 0;
    const remainingCents = owedCents - paidCents;
    return {
      id: s.id,
      expenseId: s.expense_id,
      amountCents,
      owedCents,
      paidCents,
      remainingCents,
      isPayer,
      status: statusFor(owedCents, paidCents),
      expenseDescription: s.expense_description,
      expenseCategory: s.expense_category,
      expenseDate: s.expense_date,
    };
  });

  const payments = rawPayments.map((p) => ({
    id: p.id,
    shareId: p.expense_share_id,
    amountCents: toCents(p.amount),
    date: p.payment_date,
    paymentMethod: p.payment_method || "Cash",
    batchId: p.batch_id || null,
    notes: p.notes || "",
    expenseDescription: p.expense_description || "Expense",
  }));

  const assignedCents = sumCents(shares.map((s) => s.owedCents));
  const paidCents = sumCents(payments.map((p) => p.amountCents));
  const balanceCents = assignedCents - paidCents;

  return {
    member: {
      id: payload.member.id,
      name: payload.member.name,
      createdAt: payload.member.created_at,
      assignedCents,
      paidCents,
      balanceCents,
    },
    shares,
    payments,
    paymentDetails: payload.payment_details || "",
  };
}

export default async function PublicSharePage({ params }) {
  const { token } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-hairline">
          <h1 className="text-base font-semibold text-ink">Statement unavailable</h1>
          <p className="mt-1.5 text-sm text-slate-500">This app isn’t connected to a database yet.</p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_member_statement", { p_token: token });

  if (error || !data || !data.member) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-hairline">
          <h1 className="text-base font-semibold text-ink">Link expired or invalid</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            This statement link doesn’t exist or was disabled by the tracker admin. Ask them for a fresh link.
          </p>
        </div>
      </div>
    );
  }

  return <PublicStatement statement={buildStatementFromRpc(data)} />;
}
