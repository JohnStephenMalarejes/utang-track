/**
 * Page title block.
 * - Phones (< md): large-title pattern; `mobileSubtitle` replaces the description and
 *   `mobileActions` (compact icon buttons) replace the desktop buttons.
 * - md+: eyebrow, title, description and full buttons, as before.
 */
export function PageHeader({ title, description, eyebrow, children, mobileSubtitle, mobileActions }) {
  return (
    <>
      <div className="mb-5 flex items-end justify-between gap-3 md:hidden">
        <div className="min-w-0">
          <h1 className="truncate text-[28px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink">{title}</h1>
          {mobileSubtitle && <p className="mt-1 truncate text-[13px] text-slate-500">{mobileSubtitle}</p>}
        </div>
        {mobileActions && <div className="flex shrink-0 items-center gap-2">{mobileActions}</div>}
      </div>

      <div className="mb-7 hidden flex-row items-end justify-between gap-3 md:flex">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-0.5 text-teal-700">{eyebrow}</p>}
          <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.02em] text-slate-900">{title}</h1>
          {description && <p className="mt-1 max-w-prose text-[13.5px] text-slate-600">{description}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </>
  );
}
