"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";

export default function Error({ error, reset }) {
  return (
    <Card>
      <EmptyState icon={AlertTriangle} title="We couldn't load your data" description={error?.message || "Something went wrong while talking to the database."}>
        <Button onClick={reset}>Try again</Button>
      </EmptyState>
    </Card>
  );
}
