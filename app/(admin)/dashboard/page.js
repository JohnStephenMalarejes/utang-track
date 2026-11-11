import { getLedger } from "@/lib/data";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ledger = await getLedger();
  return <DashboardView ledger={ledger} />;
}
