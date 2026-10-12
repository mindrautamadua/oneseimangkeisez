"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { buttonClass } from "../ui";

interface Ent {
  id: string;
  roleKey: string;
  organizationId: string;
  orgName: string;
  orgType: string;
}

export function EntitlementManager({
  appId,
  audience,
  initial,
  orgs,
}: {
  appId: string;
  audience: string;
  initial: Ent[];
  orgs: Array<{ id: string; displayName: string; orgType: string }>;
}) {
  const allowed = orgs.filter((o) => audience === "both" || (audience === "internal" ? o.orgType === "kinra" : o.orgType === "tenant"));
  const [ents, setEnts] = useState(initial);
  const [orgId, setOrgId] = useState(allowed[0]?.id ?? "");
  const [roleKey, setRoleKey] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch(`/api/admin/applications/${appId}/entitlements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: orgId, roleKey: roleKey.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setEnts(data.entitlements);
      setRoleKey("");
      setMsg("Hak akses ditambahkan.");
    } else {
      const fields = data.error?.fields as Record<string, string> | undefined;
      setMsg(fields ? Object.values(fields).join(" ") : data.error?.message ?? "Gagal menambahkan hak akses.");
    }
  }

  async function revoke(id: string) {
    setMsg(null);
    const res = await fetch(`/api/admin/applications/${appId}/entitlements/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setConfirmId(null);
    if (res.ok) {
      setEnts(data.entitlements);
      setMsg("Hak akses dicabut.");
    } else setMsg(data.error?.message ?? "Gagal mencabut hak akses.");
  }

  return (
    <div>
      <p className="text-sm text-muted">
        Anggota organisasi dengan kunci peran (dari identity provider) berikut dapat melihat dan membuka aplikasi ini.
        Tanpa baris hak akses, aplikasi tidak tampil bagi siapa pun (deny-by-default).
      </p>
      {msg ? (
        <p role="status" className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm">
          {msg}
        </p>
      ) : null}
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
        {ents.length === 0 ? <li className="px-3 py-3 text-sm text-muted">Belum ada hak akses.</li> : null}
        {ents.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
            <span className="font-medium">{e.orgName}</span>
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{e.roleKey}</code>
            {confirmId === e.id ? (
              <span className="ml-auto flex items-center gap-2">
                <span className="text-xs text-rose-800">Cabut?</span>
                <button type="button" onClick={() => revoke(e.id)} className="rounded bg-rose-700 px-2 py-1 text-xs font-semibold text-white">
                  Ya, cabut
                </button>
                <button type="button" onClick={() => setConfirmId(null)} className="rounded border border-line px-2 py-1 text-xs">
                  Batal
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmId(e.id)}
                className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Cabut<span className="sr-only"> akses {e.orgName} {e.roleKey}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={grant} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="ent-org" className="block text-sm font-medium">
            Organisasi
          </label>
          <select id="ent-org" value={orgId} onChange={(e) => setOrgId(e.target.value)} className="mt-1.5 min-h-10 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15">
            {allowed.map((o) => (
              <option key={o.id} value={o.id}>
                {o.displayName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ent-role" className="block text-sm font-medium">
            Kunci peran
          </label>
          <input
            id="ent-role"
            value={roleKey}
            onChange={(e) => setRoleKey(e.target.value)}
            placeholder="mis. employee, tenant_user"
            className="mt-1.5 min-h-10 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
          />
        </div>
        <button type="submit" className={buttonClass.secondary} disabled={!orgId || !roleKey.trim()}>
          Tambah hak akses
        </button>
      </form>
    </div>
  );
}
