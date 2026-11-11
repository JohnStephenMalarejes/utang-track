import { getLedger } from "@/lib/data";
import { ReportsView } from "@/components/reports/reports-view";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const ledger = await getLedger();
  return <ReportsView ledger={ledger} />;
}
