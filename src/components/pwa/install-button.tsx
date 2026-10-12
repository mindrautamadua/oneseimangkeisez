"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** "Pasang" button. Only rendered when the browser offers installation (Chrome/Edge/Android). */
export function InstallButton({ variant = "header" }: { variant?: "header" | "panel" }) {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setEvt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!evt) return null;
  const install = async () => {
    await evt.prompt();
    await evt.userChoice.catch(() => null);
    setEvt(null);
  };
  return variant === "header" ? (
    <button
      type="button"
      onClick={install}
      className="hidden h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-300 transition-colors duration-200 hover:bg-white/10 hover:text-white sm:flex"
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      Pasang
    </button>
  ) : (
    <button
      type="button"
      onClick={install}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      Pasang OneSeiMangkeiSEZ di perangkat ini
    </button>
  );
}

/** Shows whether the app runs installed (standalone), plus iOS instructions when relevant. */
export function InstallStatus() {
  const [mode, setMode] = useState<"standalone" | "ios" | "browser" | null>(null);
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only APIs after mount
    setMode(standalone ? "standalone" : ios ? "ios" : "browser");
  }, []);
  if (mode === "standalone") {
    return <p className="text-sm text-emerald-800">OneSeiMangkeiSEZ berjalan sebagai aplikasi terpasang.</p>;
  }
  if (mode === "ios") {
    return (
      <p className="text-sm text-muted">
        Di iPhone/iPad: buka di Safari, ketuk <strong>Bagikan</strong>, lalu pilih <strong>Tambah ke Layar Utama</strong>.
      </p>
    );
  }
  if (mode === "browser") {
    return (
      <p className="text-sm text-muted">
        Bila tombol pasang tidak muncul, gunakan menu browser (Chrome/Edge): <strong>Instal OneSeiMangkeiSEZ</strong>.
      </p>
    );
  }
  return null;
}
