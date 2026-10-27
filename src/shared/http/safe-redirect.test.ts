import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("acepta rutas internas", () => {
    expect(safeNextPath("/panel/abc?x=1")).toBe("/panel/abc?x=1");
  });

  it("rechaza destinos externos o ambiguos", () => {
    expect(safeNextPath("https://malicioso.test")).toBe("/cuenta");
    expect(safeNextPath("//malicioso.test")).toBe("/cuenta");
    expect(safeNextPath("/\\malicioso.test")).toBe("/cuenta");
    expect(safeNextPath(null)).toBe("/cuenta");
  });
});
