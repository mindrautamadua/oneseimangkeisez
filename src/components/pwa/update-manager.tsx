"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { BUILD_ID } from "@/lib/version";
import {
  COUNTDOWN_SECONDS,
  POSTPONE_MS,
  UPDATE_CHECK_INTERVAL_MS,
  decideApply,
  isNewVersion,
} from "@/lib/pwa/update-policy";

const ATTEMPT_KEY = "onekinra:update-attempt";
const SW_ENABLED = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_SW === "true";

function readAttempt(): string | null {
  try {
    return sessionStorage.getItem(ATTEMPT_KEY);
  } catch {
    return null;
  }
}
function writeAttempt(v: string) {
  try {
    sessionStorage.setItem(ATTEMPT_KEY, v);
  } catch {
    /* storage unavailable: loop guard degrades to in-memory only */
  }
}
const hasUnsavedWork = () => !!document.querySelector('[data-unsaved="true"]');

/**
 * Registers the service worker and keeps the installed app on the latest deployment:
 *  1. checks /api/version and asks the browser to re-fetch /sw.js every few minutes,
 *     when the app becomes visible again and when the network comes back;
 *  2. when a new build is detected, applies it automatically at a safe moment
 *     (immediately if the app is in the background, after a short countdown otherwise,
 *     never while a form has unsaved changes).
 */
export function UpdateManager() {
  const regRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadingRef = useRef(false);
  const postponedUntil = useRef(0);
  const [pending, setPending] = useState<{ version: string; buildId: string } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);

  const apply = useCallback(() => {
    if (reloadingRef.current || !pending) return;
    reloadingRef.current = true;
    writeAttempt(pending.buildId);
    const waiting = regRef.current?.waiting;
    if (waiting && navigator.serviceWorker.controller) {
      // The controllerchange listener reloads once the new worker takes over.
      waiting.postMessage({ type: "SKIP_WAITING" });
      setTimeout(() => window.location.reload(), 4000); // safety net
    } else {
      window.location.reload();
    }
  }, [pending]);

  const check = useCallback(async () => {
    try {
      await regRef.current?.update();
    } catch {
      /* offline or SW unavailable */
    }
    try {
      const res = await fetch("/api/version", { cache: "no-store", headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const data = (await res.json()) as { version?: string; buildId?: string };
      if (data.buildId && isNewVersion(BUILD_ID, data.buildId, readAttempt())) {
        setPending({ version: data.version ?? "", buildId: data.buildId });
      }
    } catch {
      /* offline: try again later */
    }
  }, []);

  // Service worker registration + update detection.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (!SW_ENABLED) {
      // Avoid stale workers during local development.
      navigator.serviceWorker
        .getRegistrations()
        .then((rs) => rs.forEach((r) => r.unregister()))
        .catch(() => {});
      return;
    }
    let cancelled = false;
    const onControllerChange = () => {
      if (reloadingRef.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        if (cancelled) return;
        regRef.current = reg;
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          sw?.addEventListener("statechange", () => {
            // A new worker finished installing while an old one controls the page.
            if (sw.state === "installed" && navigator.serviceWorker.controller) void check();
          });
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, [check]);

  // Periodic and event-driven checks.
  useEffect(() => {
    const first = setTimeout(check, 3000);
    const interval = setInterval(check, Number(process.env.NEXT_PUBLIC_UPDATE_CHECK_MS) || UPDATE_CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      window.removeEventListener("online", check);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  // Decide when to apply a pending update.
  useEffect(() => {
    if (!pending) return;
    const evaluate = () => {
      const unsaved = hasUnsavedWork();
      const decision = decideApply({
        hidden: document.visibilityState === "hidden",
        unsavedWork: unsaved,
        postponed: Date.now() < postponedUntil.current,
      });
      setBlocked(unsaved);
      if (decision === "apply-now") apply();
      else if (decision === "countdown") setCountdown((c) => c ?? COUNTDOWN_SECONDS);
      else setCountdown(null);
    };
    evaluate();
    document.addEventListener("visibilitychange", evaluate);
    const poll = setInterval(evaluate, 2000); // notices when unsaved work gets saved
    return () => {
      document.removeEventListener("visibilitychange", evaluate);
      clearInterval(poll);
    };
  }, [pending, apply]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      apply();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, apply]);

  if (!pending) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:justify-end">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-navy-900 p-4 text-white shadow-lift ring-1 ring-white/10"
        data-testid="update-toast"
      >
        <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Versi baru OneSeiMangkeiSEZ tersedia</p>
          <p className="mt-0.5 text-sm text-slate-300" data-testid="update-message">
            {blocked
              ? "Ada perubahan yang belum disimpan. Pembaruan diterapkan setelah Anda menyimpan."
              : countdown !== null
                ? `Memperbarui otomatis dalam ${countdown} detik…`
                : "Pembaruan diterapkan otomatis saat aplikasi tidak sedang dipakai."}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={apply}
              className="min-h-9 rounded-lg bg-sky-500 px-3 text-sm font-semibold text-navy-950 transition-colors hover:bg-sky-400"
              data-testid="update-now"
            >
              Perbarui sekarang
            </button>
            {countdown !== null ? (
              <button
                type="button"
                onClick={() => {
                  postponedUntil.current = Date.now() + POSTPONE_MS;
                  setCountdown(null);
                }}
                className="min-h-9 rounded-lg px-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
                data-testid="update-postpone"
              >
                Tunda
              </button>
            ) : null}
          </div>
        </div>
        {countdown === null && !blocked ? (
          <button
            type="button"
            onClick={() => setPending(null)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Tutup pemberitahuan"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
