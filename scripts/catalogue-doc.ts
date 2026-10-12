/**
 * Generates docs/KATALOG_DEMO.md from scripts/catalogue-rsti.ts so the documented catalogue
 * never drifts from the seed. Run: pnpm catalogue:doc
 */
import { writeFileSync } from "node:fs";
import { APPS, CATEGORIES } from "./catalogue-rsti";

const STATUS: Record<string, string> = {
  available: "Tersedia",
  pilot: "Pilot",
  planned: "Direncanakan",
  maintenance: "Pemeliharaan",
  retired: "Dipensiunkan",
};
const MODE: Record<string, string> = {
  oidc_sso: "SSO (OIDC)",
  saml_sso: "SSO (SAML)",
  authenticated_link: "Login di aplikasi",
  external_link: "Tautan eksternal",
};
const AUDIENCE: Record<string, string> = { internal: "Internal", tenant: "Tenant", both: "Internal & Tenant" };

const cell = (s: string) => s.replace(/\|/g, "\\|");
const grants = (g: Array<[string, string]>) => {
  const by = new Map<string, string[]>();
  for (const [org, role] of g) {
    const label = org === "demo-org-kinra" ? "KINRA" : org === "demo-org-tenant-a" ? "Tenant A" : org === "demo-org-tenant-b" ? "Tenant B" : org;
    by.set(label, [...(by.get(label) ?? []), role]);
  }
  return [...by.entries()].map(([o, r]) => `${o}: ${[...new Set(r)].join(", ")}`).join("; ");
};

const count = (s: string) => APPS.filter((a) => a.status === s).length;
const lines: string[] = [
  "# Katalog Demo OneSeiMangkeiSEZ",
  "",
  "> Dibuat otomatis dari [scripts/catalogue-rsti.ts](../scripts/catalogue-rsti.ts) dengan `pnpm catalogue:doc`.",
  "> Jangan diedit manual. Data simulasi end state RSTI 2030; seluruh URL fiktif kecuali disebut lain.",
  "",
  `**${APPS.length} aplikasi** dalam ${CATEGORIES.length} kategori — ` +
    Object.keys(STATUS)
      .map((s) => `${STATUS[s]}: ${count(s)}`)
      .join(", ") +
    ".",
  "",
];

for (const c of CATEGORIES) {
  const apps = APPS.filter((a) => a.category === c.slug);
  if (apps.length === 0) continue;
  lines.push(`## ${c.name} (${apps.length})`, "", c.description, "");
  lines.push("| Aplikasi | Deskripsi | Audiens | Integrasi | Status | Roadmap | Hak akses |", "| --- | --- | --- | --- | --- | --- | --- |");
  for (const a of apps) {
    const url = a.targetUrl ? ` — URL: \`${a.targetUrl}\`` : "";
    lines.push(
      `| **${cell(a.name)}**<br>\`${a.slug}\` | ${cell(a.description)}${url} | ${AUDIENCE[a.audience]} | ${MODE[a.integrationMode]} | ${STATUS[a.status]} | ${a.initiativeRef} · ${a.targetPeriod} | ${grants(a.grants)} |`,
    );
  }
  lines.push("");
}

writeFileSync(new URL("../docs/KATALOG_DEMO.md", import.meta.url), lines.join("\n"));
console.log(`docs/KATALOG_DEMO.md: ${APPS.length} aplikasi.`);
