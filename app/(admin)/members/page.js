import { getLedger } from "@/lib/data";
import { MembersView } from "@/components/members/members-view";

export const metadata = { title: "Members" };

export default async function MembersPage({ searchParams }) {
  const [ledger, params] = await Promise.all([getLedger(), searchParams]);
  return <MembersView ledger={ledger} initialOpen={params?.new === "1"} />;
}
