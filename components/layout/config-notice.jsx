import { Card, CardContent } from "@/components/ui/card";
import { Database } from "lucide-react";

export function ConfigNotice() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4">
      <Card className="w-full">
        <CardContent className="space-y-3 p-6">
          <Database className="h-6 w-6 text-accent-strong" />
          <h1 className="text-lg font-semibold">Connect Supabase to get started</h1>
          <p className="text-sm text-muted-foreground">
            The app can't find <code className="rounded bg-muted px-1">SUPABASE_URL</code> and{" "}
            <code className="rounded bg-muted px-1">SUPABASE_ANON_KEY</code>. Copy <code className="rounded bg-muted px-1">.env.example</code> to{" "}
            <code className="rounded bg-muted px-1">.env.local</code>, fill in both values, then restart the dev server.
          </p>
          <p className="text-sm text-muted-foreground">The README walks through creating the project and running the SQL migrations.</p>
        </CardContent>
      </Card>
    </main>
  );
}
