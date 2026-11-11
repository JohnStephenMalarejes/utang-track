import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, description, children, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {Icon && (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border bg-card text-muted-foreground shadow-card">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="text-[13.5px] font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
      {children && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
