/**
 * ⚠️ MOCK IDENTITY — LOCAL DEVELOPMENT AND AUTOMATED TESTS ONLY.
 * These records simulate what an IAM provider would assert (identity + org membership +
 * role keys). They are NOT access grants: application access is decided by the
 * entitlement table in the database. Never used when APP_ENV=production.
 */
import type { Membership } from "@/lib/authz/types";

export const DEMO_ORG = {
  KINRA: "demo-org-kinra",
  TENANT_A: "demo-org-tenant-a",
  TENANT_B: "demo-org-tenant-b",
} as const;

export interface MockUser {
  username: string;
  name: string;
  email: string;
  description: string;
  memberships: Membership[];
}

export const MOCK_USERS: MockUser[] = [
  {
    username: "andi.karyawan",
    name: "Andi Pratama (Demo)",
    email: "andi.demo@kinra.example",
    description: "Karyawan KINRA (umum)",
    memberships: [{ orgId: DEMO_ORG.KINRA, roles: ["employee"] }],
  },
  {
    username: "sari.eksekutif",
    name: "Sari Wulandari (Demo)",
    email: "sari.demo@kinra.example",
    description: "Direksi / eksekutif KINRA",
    memberships: [{ orgId: DEMO_ORG.KINRA, roles: ["employee", "executive"] }],
  },
  {
    username: "fajar.pemasaran",
    name: "Fajar Nugroho (Demo)",
    email: "fajar.demo@kinra.example",
    description: "Divisi Pemasaran & Penjualan",
    memberships: [{ orgId: DEMO_ORG.KINRA, roles: ["employee", "marketing"] }],
  },
  {
    username: "lina.keuangan",
    name: "Lina Marlina (Demo)",
    email: "lina.demo@kinra.example",
    description: "Divisi Keuangan",
    memberships: [{ orgId: DEMO_ORG.KINRA, roles: ["employee", "finance"] }],
  },
  {
    username: "hendra.sdm",
    name: "Hendra Saputra (Demo)",
    email: "hendra.demo@kinra.example",
    description: "Divisi SDM",
    memberships: [{ orgId: DEMO_ORG.KINRA, roles: ["employee", "hr"] }],
  },
  {
    username: "rudi.operasi",
    name: "Rudi Hartono (Demo)",
    email: "rudi.demo@kinra.example",
    description: "Produksi Kawasan / ME&F / Pengamanan",
    memberships: [{ orgId: DEMO_ORG.KINRA, roles: ["employee", "estate_ops"] }],
  },
  {
    username: "admin.it",
    name: "Admin TI (Demo)",
    email: "admin.demo@kinra.example",
    description: "Divisi TI + administrator portal",
    memberships: [{ orgId: DEMO_ORG.KINRA, roles: ["employee", "it_staff", "portal_admin"] }],
  },
  {
    username: "rina.auditor",
    name: "Rina Auditor (Demo)",
    email: "rina.demo@kinra.example",
    description: "Auditor (hanya-baca)",
    memberships: [{ orgId: DEMO_ORG.KINRA, roles: ["auditor"] }],
  },
  {
    username: "budi.tenant-a",
    name: "Budi Santoso (Demo)",
    email: "budi.demo@tenant-a.example",
    description: "Pengguna Tenant A",
    memberships: [{ orgId: DEMO_ORG.TENANT_A, roles: ["tenant_user"] }],
  },
  {
    username: "citra.tenant-b",
    name: "Citra Lestari (Demo)",
    email: "citra.demo@tenant-b.example",
    description: "Pengguna Tenant B",
    memberships: [{ orgId: DEMO_ORG.TENANT_B, roles: ["tenant_user"] }],
  },
  {
    username: "dewi.multi",
    name: "Dewi Anggraini (Demo)",
    email: "dewi.demo@tenant-a.example",
    description: "Admin Tenant A + pengguna Tenant B (multi-organisasi)",
    memberships: [
      { orgId: DEMO_ORG.TENANT_A, roles: ["tenant_user", "tenant_admin"] },
      { orgId: DEMO_ORG.TENANT_B, roles: ["tenant_user"] },
    ],
  },
  {
    username: "eko.tanpa-akses",
    name: "Eko Tanpa Akses (Demo)",
    email: "eko.demo@kinra.example",
    description: "Terautentikasi tanpa organisasi terdaftar",
    memberships: [{ orgId: "demo-org-unknown", roles: ["employee"] }],
  },
];

export function findMockUser(username: string): MockUser | undefined {
  return MOCK_USERS.find((u) => u.username === username);
}
