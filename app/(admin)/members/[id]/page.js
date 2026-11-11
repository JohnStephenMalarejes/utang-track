import { notFound } from "next/navigation";
import { getLedger } from "@/lib/data";
import { MemberDetail } from "@/components/members/member-detail";

export const metadata = { title: "Member" };

export default async function MemberPage({ params }) {
  const { id } = await params;
  const ledger = await getLedger();
  if (!ledger.members.some((m) => m.id === id)) notFound();
  return <MemberDetail ledger={ledger} memberId={id} />;
}
