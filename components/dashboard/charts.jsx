"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/empty-state";
import { formatPHP } from "@/lib/utils";

// Teal leads; the rest step through ink and cool grays so categories stay distinct without a rainbow.
export const CHART_COLORS = ["#00ADB5", "#222831", "#5FC4C9", "#6B7380", "#A9B0BA", "#CDEFF0"];
const AXIS = { fontSize: 11, fill: "#7A828E", fontFamily: "var(--font-geist-mono)" };
const GRID = "#EDF0F3";

const pesos = (cents) => Math.round(cents) / 100;
const compact = (v) => (v >= 1000 ? `₱${+(v / 1000).toFixed(1)}k` : `₱${v}`);

function ChartTooltip({ active, payload, label, valueLabel }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-[12px] shadow-pop">
      <p className="mb-1 text-muted-foreground">{label ?? item.name}</p>
      <p className="tabular font-medium">
        {formatPHP(Math.round(Number(item.value) * 100))}
        {valueLabel && <span className="ml-1.5 font-sans font-normal text-muted-foreground">{valueLabel}</span>}
      </p>
    </div>
  );
}

/** Charts only render after mount (recharts measures the DOM), which also gives us a loading skeleton. */
export function ChartCard({ title, description, empty, emptyText = "No data yet", className, aside, children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {aside}
      </CardHeader>
      <CardContent>
        <div className="h-60">
          {!mounted ? (
            <Skeleton className="h-full w-full" />
          ) : empty ? (
            <EmptyState icon={BarChart3} title={emptyText} className="h-full py-4" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {children}
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Bar chart of { label, totalCents } rows (daily, weekly or monthly spending). */
export function SpendingBarChart({ title, description, data, emptyText, tickInterval = "preserveStartEnd" }) {
  const rows = data.map((d) => ({ label: d.label, amount: pesos(d.totalCents) }));
  const total = data.reduce((s, d) => s + d.totalCents, 0);
  return (
    <ChartCard
      title={title}
      description={description}
      empty={data.every((d) => d.totalCents === 0)}
      emptyText={emptyText}
      aside={<span className="tabular text-[13px] font-medium">{formatPHP(total)}</span>}
    >
      <BarChart data={rows} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={tickInterval} minTickGap={16} dy={6} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} width={52} />
        <Tooltip content={<ChartTooltip valueLabel="spent" />} cursor={{ fill: "#F3F5F7" }} />
        <Bar dataKey="amount" fill="#00ADB5" radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ChartCard>
  );
}

/** Donut chart of categories [{ category, totalCents }] with a ranked legend beside it. */
export function CategoryChart({ title = "Spending by category", description, data }) {
  const rows = data.map((d) => ({ name: d.category, value: pesos(d.totalCents) }));
  const total = data.reduce((s, d) => s + d.totalCents, 0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {!mounted ? (
          <Skeleton className="h-60 w-full" />
        ) : data.length === 0 ? (
          <EmptyState icon={BarChart3} title="No expenses yet" className="h-60 py-4" />
        ) : (
          <div className="flex h-60 items-center gap-6">
            <div className="relative h-full w-1/2 min-w-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rows} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={1.5} stroke="#fff" strokeWidth={2}>
                    {rows.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="eyebrow">Total</span>
                <span className="tabular mt-0.5 text-[13px] font-medium">{formatPHP(total)}</span>
              </div>
            </div>
            <ul className="flex-1 space-y-2.5 text-[12.5px]">
              {data.map((d, i) => (
                <li key={d.category} className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} aria-hidden="true" />
                  <span className="flex-1 truncate">{d.category}</span>
                  <span className="tabular text-muted-foreground">{total ? Math.round((d.totalCents / total) * 100) : 0}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Settled vs outstanding comparison. */
export function SettlementChart({ title = "Settled vs unsettled", description, settledCents, outstandingCents }) {
  const rows = [
    { name: "Received", value: pesos(settledCents), fill: "#00ADB5" },
    { name: "Outstanding", value: pesos(outstandingCents), fill: "#222831" },
  ];
  return (
    <ChartCard title={title} description={description} empty={settledCents === 0 && outstandingCents === 0} emptyText="Nothing to compare yet">
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} />
        <YAxis type="category" dataKey="name" tick={{ ...AXIS, fontFamily: "var(--font-geist-sans)", fontSize: 12 }} tickLine={false} axisLine={false} width={84} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F3F5F7" }} />
        <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={32}>
          {rows.map((r) => (
            <Cell key={r.name} fill={r.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartCard>
  );
}
