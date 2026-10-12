"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Bot, RotateCcw, Sparkles, Square, X } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };

const SUGGESTIONS = [
  "Aplikasi apa yang bisa saya buka sekarang?",
  "Bagaimana cara mengajukan akses aplikasi baru?",
  "Aplikasi mana yang masih dalam roadmap?",
];

/** Workspace AI assistant: floating launcher + chat panel. Answers come from /api/assistant (NDJSON stream). */
export function Assistant({ enabled, tenant }: { enabled: boolean; tenant: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const accent = tenant ? "bg-tenant-700 hover:bg-tenant-900" : "bg-brand-600 hover:bg-brand-700";

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    // Failed assistant turns are UI-only; never send them back as history.
    const history = [...msgs.filter((m) => !m.error), { role: "user" as const, content: q }].slice(-20);
    setMsgs([...msgs, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const update = (fn: (m: Msg) => Msg) =>
      setMsgs((all) => {
        const copy = [...all];
        copy[copy.length - 1] = fn(copy[copy.length - 1]!);
        return copy;
      });

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) router.push("/session-expired");
        update(() => ({ role: "assistant", content: data.error?.message ?? "Asisten tidak dapat dihubungi.", error: true }));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line) as { t: string; v?: string };
          if (ev.t === "text") update((m) => ({ ...m, content: m.content + ev.v }));
          else if (ev.t === "error") update((m) => ({ role: "assistant", content: m.content ? `${m.content}\n\n${ev.v}` : ev.v!, error: true }));
        }
      }
    } catch {
      if (ctrl.signal.aborted) update((m) => (m.content ? m : { ...m, content: "Dihentikan.", error: true }));
      else update(() => ({ role: "assistant", content: "Koneksi terputus. Periksa jaringan Anda lalu coba lagi.", error: true }));
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-lift transition-colors ${accent}`}
          data-testid="assistant-open"
        >
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          Tanya Asisten
        </button>
      ) : null}

      {open ? (
        <section
          role="dialog"
          aria-label="Asisten OneSeiMangkeiSEZ"
          className="fixed inset-0 z-50 flex flex-col bg-white sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(640px,calc(100vh-2.5rem))] sm:w-[400px] sm:rounded-2xl sm:border sm:border-line sm:shadow-lift"
          data-testid="assistant-panel"
        >
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${tenant ? "bg-tenant-700" : "bg-brand-600"}`}>
              <Bot className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-sm font-semibold text-ink">Asisten OneSeiMangkeiSEZ</h2>
              <p className="truncate text-xs text-muted">Tanya seputar aplikasi di katalog Anda</p>
            </div>
            {msgs.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  abortRef.current?.abort();
                  setMsgs([]);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink"
                aria-label="Mulai percakapan baru"
                title="Percakapan baru"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink"
              aria-label="Tutup asisten"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite" data-testid="assistant-messages">
            {!enabled ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
                Asisten belum dikonfigurasi oleh administrator. Sementara itu, gunakan pencarian di beranda atau hubungi Helpdesk TI KINRA.
              </p>
            ) : msgs.length === 0 ? (
              <div>
                <p className="text-sm text-muted">
                  Halo! Saya bisa membantu menemukan aplikasi, menjelaskan fungsinya, cara masuk, status, dan kontak dukungannya.
                </p>
                <ul className="mt-4 space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => ask(s)}
                        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-left text-sm text-ink transition-colors hover:border-slate-300 hover:bg-slate-50"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              msgs.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md px-3 py-2 text-sm text-white ${tenant ? "bg-tenant-700" : "bg-brand-600"}`}>
                      {m.content}
                    </p>
                  </div>
                ) : (
                  <div key={i} className={`max-w-[95%] text-sm leading-6 ${m.error ? "text-rose-800" : "text-ink"}`}>
                    {m.content ? <Rich text={m.content} /> : <TypingDots />}
                  </div>
                ),
              )
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
            className="border-t border-line p-3"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-line bg-white p-1.5 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15">
              <label htmlFor="assistant-input" className="sr-only">
                Pertanyaan untuk asisten
              </label>
              <textarea
                ref={inputRef}
                id="assistant-input"
                rows={1}
                maxLength={2000}
                value={input}
                disabled={!enabled}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void ask(input);
                  }
                }}
                placeholder={enabled ? "Tulis pertanyaan…" : "Asisten belum tersedia"}
                className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink outline-none placeholder:text-slate-500 disabled:cursor-not-allowed"
                data-testid="assistant-input"
              />
              {busy ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white"
                  aria-label="Hentikan jawaban"
                >
                  <Square className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!enabled || !input.trim()}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition-colors disabled:bg-slate-300 ${accent}`}
                  aria-label="Kirim pertanyaan"
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <p className="mt-2 px-1 text-[11px] leading-4 text-muted">
              Jawaban dibuat AI dari data katalog Anda dan bisa keliru. Isi percakapan tidak disimpan.
            </p>
          </form>
        </section>
      ) : null}
    </>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-2" aria-label="Asisten sedang mengetik">
      {[0, 150, 300].map((d) => (
        <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

/**
 * Minimal, safe Markdown subset: paragraphs, "-"/"*"/"1." lists, **bold**, and links to in-portal
 * /apps/<slug> pages only. No HTML is ever injected; any other link renders as plain text.
 */
function Rich({ text }: { text: string }) {
  const blocks: Array<{ list: "ul" | "ol" | null; lines: string[] }> = [];
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const kind = ul ? "ul" : ol ? "ol" : null;
    const content = ul?.[1] ?? ol?.[1] ?? line;
    const prev = blocks.at(-1);
    if (!line.trim()) {
      blocks.push({ list: null, lines: [] });
    } else if (prev && prev.list === kind && (kind || prev.lines.length > 0)) {
      prev.lines.push(content);
    } else {
      blocks.push({ list: kind, lines: [content] });
    }
  }
  return (
    <div className="space-y-2">
      {blocks
        .filter((b) => b.lines.length > 0)
        .map((b, i) =>
          b.list === "ul" ? (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {b.lines.map((l, j) => (
                <li key={j}>
                  <Inline text={l} />
                </li>
              ))}
            </ul>
          ) : b.list === "ol" ? (
            <ol key={i} className="list-decimal space-y-1 pl-5">
              {b.lines.map((l, j) => (
                <li key={j}>
                  <Inline text={l} />
                </li>
              ))}
            </ol>
          ) : (
            <p key={i}>
              {b.lines.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 ? <br /> : null}
                  <Inline text={l} />
                </Fragment>
              ))}
            </p>
          ),
        )}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(p);
        if (link) {
          const [, label, href] = link;
          return /^\/apps\/[a-z0-9-]{1,64}$/.test(href!) ? (
            <Link key={i} href={href!} className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900">
              {label}
            </Link>
          ) : (
            <Fragment key={i}>{label}</Fragment>
          );
        }
        const bold = /^\*\*([^*]+)\*\*$/.exec(p);
        if (bold) return <strong key={i} className="font-semibold">{bold[1]}</strong>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
