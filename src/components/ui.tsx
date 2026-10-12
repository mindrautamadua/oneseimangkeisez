import type { ReactNode } from "react";
import { STATUS_LABEL } from "./labels";

const STATUS_TONE: Record<string, { pill: string; dot: string }> = {
  available: { pill: "bg-emerald-50 text-emerald-800 ring-emerald-600/20", dot: "bg-emerald-500" },
  pilot: { pill: "bg-sky-50 text-sky-800 ring-sky-600/20", dot: "bg-sky-500" },
  planned: { pill: "bg-slate-100 text-slate-700 ring-slate-500/20", dot: "bg-slate-400" },
  maintenance: { pill: "bg-amber-50 text-amber-900 ring-amber-600/25", dot: "bg-amber-500" },
  retired: { pill: "bg-rose-50 text-rose-800 ring-rose-600/20", dot: "bg-rose-500" },
};

/** Status pill with a dot so colour is never the only indicator (text label always present). */
export function StatusBadge({ status }: { status: string }) {
  const t = STATUS_TONE[status] ?? STATUS_TONE.planned!;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${t.pill}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "warn" | "brand" }) {
  const tones = {
    neutral: "bg-white text-slate-700 ring-slate-300",
    warn: "bg-amber-50 text-amber-900 ring-amber-600/30",
    brand: "bg-brand-50 text-brand-700 ring-brand-600/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface shadow-card ${className}`}>{children}</div>;
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold text-ink sm:text-[1.75rem]">{title}</h1>
        {description ? <div className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

const base =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";

export const buttonClass = {
  primary: `${base} bg-brand-600 text-white shadow-sm hover:bg-brand-700`,
  secondary: `${base} border border-line bg-white text-ink shadow-sm hover:border-slate-300 hover:bg-slate-50`,
  danger: `${base} bg-rose-700 text-white hover:bg-rose-800`,
  ghost: `${base} text-muted hover:bg-slate-100 hover:text-ink`,
};

export function StatePanel({
  icon,
  title,
  children,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      {icon ? (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-600/10">
          {icon}
        </div>
      ) : null}
      <h1 className="text-xl font-semibold text-ink sm:text-2xl">{title}</h1>
      {children ? <div className="mt-2 text-sm leading-6 text-muted sm:text-base">{children}</div> : null}
      {actions ? <div className="mt-7 flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </div>
  );
}
