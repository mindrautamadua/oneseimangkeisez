import { describe, expect, it } from "vitest";
import { sniffImageType } from "@/lib/catalogue/thumbnail";

const bytes = (...xs: Array<number | string>) =>
  new Uint8Array(xs.flatMap((x) => (typeof x === "string" ? [...x].map((c) => c.charCodeAt(0)) : [x])));

describe("sniffImageType", () => {
  it("detects PNG, JPEG and WebP from magic bytes", () => {
    expect(sniffImageType(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(bytes("RIFF", 0, 0, 0, 0, "WEBP"))).toBe("image/webp");
  });

  it("rejects SVG, HTML, GIF and truncated input", () => {
    expect(sniffImageType(bytes('<svg xmlns="http://www.w3.org/2000/svg" onload="x">'))).toBeNull();
    expect(sniffImageType(bytes("<!doctype html>"))).toBeNull();
    expect(sniffImageType(bytes("GIF89a"))).toBeNull();
    expect(sniffImageType(bytes(0x89, "PN"))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});
