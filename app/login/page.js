import { ConfigNotice } from "@/components/layout/config-notice";
import { LoginForm } from "@/components/layout/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  if (!isSupabaseConfigured()) return <ConfigNotice />;
  return (
    <main className="flex min-h-dvh w-full flex-col justify-center bg-canvas px-5 sm:bg-slate-50 sm:px-4">
      <div className="mx-auto w-full max-w-sm rounded-2xl bg-white p-6 shadow-hairline sm:rounded-lg sm:border sm:border-slate-200/90 sm:p-7 sm:shadow-sm">
        <div className="mb-6 flex flex-col items-start sm:items-center sm:text-center">
          <img src="/logo-mark.png" alt="Utang Tracker" className="mb-3.5 h-10 w-10 object-contain" />
          <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-ink sm:text-lg sm:tracking-tight sm:text-slate-900">Sign in</h1>
          <p className="mt-0.5 text-[13px] text-slate-500 sm:text-xs">Utang Tracker · Shared expense ledger</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
