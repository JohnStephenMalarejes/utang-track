"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/empty-state";
import { formatPHP } from "@/lib/utils";

// Chart palette built from the brand colours plus tints so six categories stay distinguishable.
export const CHART_COLORS = ["#00ADB5", "#222831", "#7FD3D8", "#6B7280", "#B6BCC4", "#BFE9EC"];
const AXIS = { fontSize: 12, fill: "#5b6573" };

const pesos = (cents) => Math.round(cents) / 100;
const compact = (v) => (v >= 1000 ? `₱${+(v / 1000).toFixed(1)}k` : `₱${v}`);
const tooltipMoney = (value) => formatPHP(Math.round(Number(value) * 100));
const tooltipStyle = { borderRadius: 8, border: "1px solid #dfe5ec", fontSize: 12, boxShadow: "0 1px 3px rgb(34 40 49 / 0.08)" };

/** Charts only render after mount (recharts measures the DOM), which also gives us a loading skeleton. */
export function ChartCard({ title, description, empty, emptyText = "No data yet", className, children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-64">
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
  return (
    <ChartCard title={title} description={description} empty={data.every((d) => d.totalCents === 0)} emptyText={emptyText}>
      <BarChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e8edf3" />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={tickInterval} minTickGap={16} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} width={52} />
        <Tooltip formatter={(v) => [tooltipMoney(v), "Spent"]} contentStyle={tooltipStyle} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey="amount" fill="#00ADB5" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ChartCard>
  );
}

/** Donut chart of categories [{ category, totalCents }]. */
export function CategoryChart({ title = "Spending by category", description, data }) {
  const rows = data.map((d) => ({ name: d.category, value: pesos(d.totalCents) }));
  return (
    <ChartCard title={title} description={description} empty={data.length === 0} emptyText="No expenses yet">
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2} stroke="#fff" strokeWidth={2}>
          {rows.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v, name) => [tooltipMoney(v), name]} contentStyle={tooltipStyle} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ChartCard>
  );
}

/** Settled vs outstanding comparison. */
export function SettlementChart({ title = "Settled vs unsettled", description, settledCents, outstandingCents }) {
  const rows = [
    { name: "Settled", value: pesos(settledCents), fill: "#00ADB5" },
    { name: "Unsettled", value: pesos(outstandingCents), fill: "#222831" },
  ];
  return (
    <ChartCard title={title} description={description} empty={settledCents === 0 && outstandingCents === 0} emptyText="Nothing to compare yet">
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke="#e8edf3" />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} />
        <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={72} />
        <Tooltip formatter={(v) => tooltipMoney(v)} contentStyle={tooltipStyle} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={36}>
          {rows.map((r) => (
            <Cell key={r.name} fill={r.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartCard>
  );
}
