import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { ConfigNotice } from "@/components/layout/config-notice";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
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

  return (
    <div className="min-h-screen lg:pl-60">
      <Sidebar email={user.email} />
      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
