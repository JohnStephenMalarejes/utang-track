import { createClient } from "./supabase/server.js";
import { buildLedger } from "./calculations/ledger.js";

const PAGE = 1000; // Supabase returns at most 1000 rows per request

async function fetchAll(buildQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await buildQuery().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

/** Loads every record and returns the derived ledger (balances, statuses, totals). */
export async function getLedger() {
  const supabase = await createClient();
  const [members, expenses, payments] = await Promise.all([
    fetchAll(() => supabase.from("members").select("*").order("name").order("id")),
    fetchAll(() =>
      supabase
        .from("expenses")
        .select("*, expense_shares(*)")
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id")
    ),
    fetchAll(() =>
      supabase.from("payments").select("*").order("payment_date", { ascending: false }).order("created_at", { ascending: false }).order("id")
    ),
  ]);
  return buildLedger({ members, expenses, payments });
}
