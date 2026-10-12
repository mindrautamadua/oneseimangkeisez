import { describe, expect, it } from "vitest";
import { buildAssistantSystem } from "@/lib/assistant/prompt";
import type { CatalogueApp } from "@/lib/catalogue/service";
import type { ActiveContext } from "@/lib/authz/types";

const app = (over: Partial<CatalogueApp>): CatalogueApp => ({
  id: "1",
  slug: "it-service-desk",
  name: "IT Service Desk",
  description: "Tiket insiden dan permintaan akun.",
  iconKey: "life-buoy",
  category: { id: "c", slug: "layanan-ti", name: "Layanan TI" },
  audience: "internal",
  integrationMode: "oidc_sso",
  status: "available",
  applicationOwner: "Divisi TI",
  businessOwner: "Divisi TI",
  supportContact: "servicedesk@kinra.example",
  featured: false,
  isDemo: true,
  initiativeRef: "IT-02",
  targetPeriod: "2027",
  thumbnailUrl: null,
  launchable: true,
  ...over,
});

const ctx: ActiveContext = { org: { id: "o", externalOrgId: "kinra", displayName: "PT KINRA", orgType: "kinra" }, roles: ["employee"] };

describe("buildAssistantSystem", () => {
  it("includes only the apps it is given, with link slugs and launch state", () => {
    const s = buildAssistantSystem(
      [app({}), app({ slug: "digital-twin", name: "Digital Twin", status: "planned", launchable: false, targetPeriod: "2030" })],
      ctx,
      "Andi",
    );
    expect(s).toContain("### IT Service Desk");
    expect(s).toContain("slug: it-service-desk");
    expect(s).toContain("Tersedia (bisa dibuka sekarang)");
    expect(s).toContain("Direncanakan (belum bisa dibuka)");
    expect(s).toContain("target 2030");
    expect(s).toContain("Jumlah aplikasi di katalog: 2");
    expect(s).not.toContain("SAP");
  });

  it("states an empty catalogue explicitly", () => {
    expect(buildAssistantSystem([], ctx, "Andi")).toContain("(Belum ada aplikasi untuk pengguna ini.)");
  });
});
