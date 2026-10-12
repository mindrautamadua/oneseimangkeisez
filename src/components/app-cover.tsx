import { ArrowUpRight } from "lucide-react";
import type { CatalogueApp } from "@/lib/catalogue/service";
import { AppIcon } from "./app-icon";

/**
 * Per-category cover palette. Generated visuals (gradient + pattern + watermark icon) give each app
 * a cover without needing image assets. Unknown categories fall back to a slug hash.
 */
const COVERS: Record<string, { bg: string; fg: string }> = {
  engagement: { bg: "from-sky-500 to-indigo-600", fg: "text-white" },
  "operasi-kawasan": { bg: "from-emerald-500 to-teal-700", fg: "text-white" },
  "enterprise-core": { bg: "from-slate-600 to-slate-900", fg: "text-white" },
  "dokumen-kolaborasi": { bg: "from-violet-500 to-purple-700", fg: "text-white" },
  insight: { bg: "from-fuchsia-500 to-rose-600", fg: "text-white" },
  "layanan-ti": { bg: "from-cyan-600 to-blue-800", fg: "text-white" },
  "layanan-tenant": { bg: "from-teal-500 to-cyan-700", fg: "text-white" },
  "tagihan-utilitas": { bg: "from-amber-400 to-orange-600", fg: "text-white" },
  "perizinan-ehs": { bg: "from-emerald-500 to-green-800", fg: "text-white" },
  "layanan-digital": { bg: "from-blue-500 to-sky-700", fg: "text-white" },
  akun: { bg: "from-indigo-500 to-navy-900", fg: "text-white" },
};
const FALLBACK_COVERS = Object.values(COVERS);

function coverFor(slug: string) {
  const known = COVERS[slug];
  if (known) return known;
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK_COVERS[h % FALLBACK_COVERS.length] ?? COVERS.engagement!;
}

const VARIANT = {
  card: {
    box: "h-24 rounded-t-2xl",
    watermark: "-bottom-6 right-12 h-28 w-28",
  },
  hero: {
    box: "h-36 sm:h-52 rounded-t-2xl",
    watermark: "-bottom-10 right-8 h-44 w-44 sm:h-60 sm:w-60",
  },
};

/** Decorative cover: uploaded image when present, otherwise the generated category cover. */
export function AppCover({
  app,
  variant,
}: {
  app: Pick<CatalogueApp, "iconKey" | "launchable" | "thumbnailUrl" | "category">;
  variant: keyof typeof VARIANT;
}) {
  const cover = coverFor(app.category.slug);
  const v = VARIANT[variant];
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${v.box} ${app.launchable ? cover.bg : "from-slate-300 to-slate-400"}`}
      aria-hidden="true"
    >
      {app.thumbnailUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- authenticated API image; next/image optimizer would not forward the session. */}
          <img
            src={app.thumbnailUrl}
            alt=""
            loading={variant === "hero" ? "eager" : "lazy"}
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${app.launchable ? "" : "grayscale"}`}
          />
          {/* keeps overlaid controls legible on bright photos */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />
        </>
      ) : (
        <>
          {/* dot grid */}
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:14px_14px]" />
          {/* soft light blob */}
          <div className="absolute -left-10 -top-16 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
          {/* watermark icon */}
          <AppIcon
            iconKey={app.iconKey}
            className={`absolute rotate-[-12deg] opacity-25 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-110 ${v.watermark} ${cover.fg}`}
          />
        </>
      )}
      {variant === "card" && app.launchable ? (
        <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors duration-200 group-hover:bg-white group-hover:text-ink">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  );
}
