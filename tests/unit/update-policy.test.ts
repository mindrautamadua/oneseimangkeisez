import { describe, expect, it } from "vitest";
import { decideApply, isNewVersion } from "@/lib/pwa/update-policy";

describe("isNewVersion", () => {
  it("detects a different server build", () => {
    expect(isNewVersion("100", "200", null)).toBe(true);
  });
  it("ignores same build, missing data, and already-attempted builds (loop guard)", () => {
    expect(isNewVersion("100", "100", null)).toBe(false);
    expect(isNewVersion("100", null, null)).toBe(false);
    expect(isNewVersion("100", "200", "200")).toBe(false);
    expect(isNewVersion("100", "300", "200")).toBe(true);
  });
});

describe("decideApply", () => {
  it("applies immediately when the app is in the background", () => {
    expect(decideApply({ hidden: true, unsavedWork: false, postponed: false })).toBe("apply-now");
    expect(decideApply({ hidden: true, unsavedWork: false, postponed: true })).toBe("apply-now");
  });
  it("counts down when visible and nothing is unsaved", () => {
    expect(decideApply({ hidden: false, unsavedWork: false, postponed: false })).toBe("countdown");
  });
  it("never auto-applies over unsaved work", () => {
    expect(decideApply({ hidden: true, unsavedWork: true, postponed: false })).toBe("wait-for-user");
    expect(decideApply({ hidden: false, unsavedWork: true, postponed: false })).toBe("wait-for-user");
  });
  it("respects a user postponement while visible", () => {
    expect(decideApply({ hidden: false, unsavedWork: false, postponed: true })).toBe("wait-for-user");
  });
});
