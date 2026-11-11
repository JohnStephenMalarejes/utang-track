export function PageHeader({ title, description, eyebrow, children }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1 text-teal-700">{eyebrow}</p>}
        <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.02em] text-slate-900">{title}</h1>
        {description && <p className="mt-1 max-w-prose text-[13.5px] text-slate-600">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
