export function PageHeader({ title, description, eyebrow, children }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-0.5 hidden text-teal-700 sm:block">{eyebrow}</p>}
        <h1 className="truncate text-[19px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[22px]">{title}</h1>
        {description && <p className="mt-0.5 max-w-prose text-[12.5px] text-slate-600 sm:mt-1 sm:text-[13.5px]">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
