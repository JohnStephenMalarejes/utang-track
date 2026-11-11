import { HandCoins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/components/layout/login-form";
import { ConfigNotice } from "@/components/layout/config-notice";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  if (!isSupabaseConfigured()) return <ConfigNotice />;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-accent">
          <HandCoins className="h-5 w-5" />
        </span>
        <span className="text-lg font-semibold tracking-tight">Utang Tracker</span>
      </div>
      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <h1 className="text-lg font-semibold">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">Administrator access only.</p>
          </div>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
