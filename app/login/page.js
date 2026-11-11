import { Card, CardContent } from "@/components/ui/card";
import { ConfigNotice } from "@/components/layout/config-notice";
import { LoginForm } from "@/components/layout/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  if (!isSupabaseConfigured()) return <ConfigNotice />;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4">
      <Card className="border-slate-200/90 shadow-sm">
        <CardContent className="space-y-6 p-6 sm:p-7">
          <div className="flex flex-col items-center text-center">
            <img src="/logo-mark.png" alt="Utang Tracker" className="mb-3 h-10 w-10 object-contain" />
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">Sign in</h1>
            <p className="mt-0.5 text-xs text-slate-500">Utang Tracker</p>
          </div>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
