import { getLedger } from "@/lib/data";
import { PaymentsView } from "@/components/payments/payments-view";

export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const ledger = await getLedger();
  return <PaymentsView ledger={ledger} />;
}
