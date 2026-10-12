import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Building2, KeyRound, Network, ShieldAlert, ShieldCheck } from "lucide-react";
import { getAuthState } from "@/lib/auth/current";
import { MOCK_USERS } from "@/lib/auth/mock-users";
import { env, mockAuthActive } from "@/lib/env";
import { safeReturnPath } from "@/lib/security/url";
import { KinraLogo, Wordmark } from "@/components/wordmark";
import { LoginParticles } from "@/components/login-orbit";
import aerial from "../../../public/brand/kawasan-aerial.jpg";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Masuk" };

/** Stagger delay for the kn-enter entrance animation (see globals.css). */
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

const ERRORS: Record<string, string> = {
  idp_unavailable:
    "Layanan identitas (identity provider) sedang tidak dapat dihubungi. Coba beberapa saat lagi atau hubungi Helpdesk TI.",
  login_failed: "Proses masuk tidak berhasil. Silakan coba lagi.",
  state: "Sesi masuk kedaluwarsa atau tidak valid. Silakan ulangi proses masuk.",
  rate_limited: "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.",
  invalid_credentials: "Email/NIK atau kata sandi salah.",
  app_not_allowed:
    "Akun Anda belum memiliki akses ke OneSeiMangkeiSEZ. Ajukan akses melalui Helpdesk TI KINRA.",
};

const PILLARS = [
  { icon: Network, title: "One Gateway", text: "Satu alamat untuk seluruh layanan digital KINRA." },
  {
    icon: ShieldCheck,
    title: "One Identity",
    text: "Satu akun dengan akses sesuai peran dan organisasi.",
  },
  {
    icon: Building2,
    title: "Connected Services",
    text: "Karyawan dan tenant terhubung ke layanan yang tepat.",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const auth = await getAuthState();
  const next = safeReturnPath(sp.next);
  if (auth.status === "ok") redirect(next);
  const error = sp.error ? (ERRORS[sp.error] ?? ERRORS.login_failed) : null;
  const mock = mockAuthActive();
  const iam = !mock && env().AUTH_PROVIDER === "kinra_iam";
  const inputClass =
    "mt-1.5 h-12 w-full rounded-xl border border-line bg-white px-3 text-base shadow-card focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15";

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <aside className="relative isolate hidden overflow-hidden bg-navy-900 px-12 py-10 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between">
        {/* Aerial of the estate with a slow Ken Burns drift */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
          <Image
            src={aerial}
            alt=""
            fill
            preload
            placeholder="blur"
            sizes="(min-width: 1024px) 55vw, 0px"
            className="kn-kenburns object-cover object-[72%_center]"
          />
          {/* Readability layers: navy wash behind the copy, vignette, and a dusk glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900/85 via-navy-900/45 to-navy-900/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_5%,rgba(251,191,36,0.22),transparent_60%)]" />
          <div className="kn-sweep absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="kn-grid absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:48px_48px]" />
          <LoginParticles />
        </div>
        <p className="kn-enter text-2xl">
          <Wordmark inverted />
        </p>
        <div className="max-w-xl py-8">
          <p
            className="kn-enter inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-200 ring-1 ring-inset ring-white/15 backdrop-blur"
            style={delay(200)}
          >
            <span className="relative flex h-2 w-2">
              <span className="kn-ping absolute inline-flex h-full w-full rounded-full bg-sky-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-300" />
            </span>
            Single Digital Gateway
          </p>
          <h2
            className="kn-enter mt-5 text-5xl font-semibold leading-[1.1] tracking-tight [text-shadow:0_2px_24px_rgba(2,6,23,0.6)]"
            style={delay(300)}
          >
            Satu pintu untuk layanan digital{" "}
            <span className="bg-gradient-to-r from-sky-300 to-teal-200 bg-clip-text text-transparent">
              kawasan.
            </span>
          </h2>
          <ul className="mt-10 space-y-4">
            {PILLARS.map((p, i) => (
              <li
                key={p.title}
                className="kn-enter flex gap-4 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10 backdrop-blur-md transition hover:bg-white/10"
                style={delay(450 + i * 120)}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/15 ring-1 ring-inset ring-sky-300/25">
                  <p.icon className="h-5 w-5 text-sky-300" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold">{p.title}</span>
                  <span className="block text-sm text-slate-300">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="kn-enter text-xs text-slate-300/80" style={delay(800)}>
          PT Kawasan Industri Nusantara · KEK Sei Mangkei
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="kn-enter w-full max-w-md" style={delay(100)}>
          <KinraLogo className="mb-8 h-14 w-auto" />
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Masuk ke OneSeiMangkeiSEZ</h1>
          <p className="mt-2 text-muted">
            Gunakan akun KINRA atau akun tenant Anda yang terdaftar.
          </p>

          {sp.logged_out ? (
            <p
              role="status"
              className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-inset ring-emerald-600/20"
            >
              Anda telah keluar. Sesi di aplikasi tujuan mungkin perlu diakhiri terpisah.
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-900 ring-1 ring-inset ring-rose-600/20"
              data-testid="login-error"
            >
              {error}
            </p>
          ) : null}

          {mock ? (
            <div className="mt-8">
              <div className="mb-5 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <p>
                  <strong>MOCK — hanya pengembangan lokal.</strong> Pilih identitas demo. Ini bukan
                  autentikasi produksi dan dinonaktifkan otomatis bila APP_ENV=production.
                </p>
              </div>
              <form action="/api/auth/mock-login" method="post" className="space-y-4">
                <input type="hidden" name="next" value={next} />
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-ink">
                    Identitas demo
                  </label>
                  <select
                    id="username"
                    name="username"
                    required
                    className="mt-1.5 h-12 w-full rounded-xl border border-line bg-white px-3 text-base shadow-card focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                  >
                    {MOCK_USERS.map((u) => (
                      <option key={u.username} value={u.username}>
                        {u.name} — {u.description}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className={`${buttonClass.primary} h-12 w-full text-base`}>
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  Masuk (mock)
                </button>
              </form>
            </div>
          ) : iam ? (
            <form action="/api/auth/iam-login" method="post" className="mt-8 space-y-4">
              <input type="hidden" name="next" value={next} />
              <div>
                <label htmlFor="identifier" className="block text-sm font-semibold text-ink">
                  Email atau NIK SAP
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  required
                  maxLength={320}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="nama@kinra.co.id"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-ink">
                  Kata sandi
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  maxLength={1024}
                  autoComplete="current-password"
                  className={inputClass}
                />
              </div>
              <button type="submit" className={`${buttonClass.primary} h-12 w-full text-base`}>
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Masuk
              </button>
            </form>
          ) : (
            <a
              href={`/api/auth/login?next=${encodeURIComponent(next)}`}
              className={`${buttonClass.primary} mt-8 h-12 w-full text-base`}
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Masuk dengan Akun KINRA
            </a>
          )}
          <p className="mt-8 border-t border-line pt-6 text-sm text-muted">
            Kesulitan masuk? Hubungi Helpdesk TI KINRA atau Tenant Service Center.
          </p>
        </div>
      </main>
    </div>
  );
}
