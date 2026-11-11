import { getLedger } from "@/lib/data";
import { ExpensesView } from "@/components/expenses/expenses-view";

export const metadata = { title: "Expenses" };

export default async function ExpensesPage({ searchParams }) {
  const [ledger, params] = await Promise.all([getLedger(), searchParams]);
  return <ExpensesView ledger={ledger} initialOpen={params?.new === "1"} />;
}
