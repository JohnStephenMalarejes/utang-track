import { Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ConfigNotice() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4">
      <Card className="w-full">
        <CardContent className="space-y-3 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-accent-soft text-accent-strong">
            <Database className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </div>
          <h1 className="text-[16px] font-semibold tracking-[-0.01em]">Connect Supabase to get started</h1>
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            The app can't find <code className="tabular rounded bg-muted px-1 text-[12px]">SUPABASE_URL</code> and{" "}
            <code className="tabular rounded bg-muted px-1 text-[12px]">SUPABASE_ANON_KEY</code>. Copy{" "}
            <code className="tabular rounded bg-muted px-1 text-[12px]">.env.example</code> to{" "}
            <code className="tabular rounded bg-muted px-1 text-[12px]">.env.local</code>, fill in both values, then restart the dev server.
          </p>
          <p className="text-[13.5px] text-muted-foreground">The README walks through creating the project and running the SQL migrations.</p>
        </CardContent>
      </Card>
    </main>
  );
}
