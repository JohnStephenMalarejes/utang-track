import { getLedger } from "@/lib/data";
import { PaymentsView } from "@/components/payments/payments-view";

export const metadata = { title: "Payments" };

export default async function PaymentsPage({ searchParams }) {
  const [ledger, params] = await Promise.all([getLedger(), searchParams]);
  return <PaymentsView ledger={ledger} initialOpen={params?.new === "1"} />;
}
