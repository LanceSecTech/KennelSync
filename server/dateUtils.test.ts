import { describe, expect, it } from "vitest";
import { toDateStr, todayStr } from "./dateUtils";

describe("toDateStr", () => {
  it("returns YYYY-MM-DD from a Date object", () => {
    const d = new Date("2026-04-05T00:00:00.000Z");
    expect(toDateStr(d)).toBe("2026-04-05");
  });

  it("returns YYYY-MM-DD from a Date object at midnight UTC", () => {
    const d = new Date(Date.UTC(2026, 3, 5)); // April 5, 2026 UTC
    expect(toDateStr(d)).toBe("2026-04-05");
  });

  it("returns YYYY-MM-DD from a date string without time", () => {
    expect(toDateStr("2026-04-05")).toBe("2026-04-05");
  });

  it("returns YYYY-MM-DD from an ISO datetime string", () => {
    expect(toDateStr("2026-04-05T14:30:00.000Z")).toBe("2026-04-05");
  });

  it("returns empty string for null", () => {
    expect(toDateStr(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(toDateStr(undefined)).toBe("");
  });

  it("handles single-digit months and days with padding", () => {
    const d = new Date(Date.UTC(2026, 0, 3)); // Jan 3, 2026
    expect(toDateStr(d)).toBe("2026-01-03");
  });

  it("does not shift date due to timezone when given a UTC midnight Date", () => {
    // This is the key test: new Date("2026-04-05") creates UTC midnight,
    // which in CDT (UTC-5) would be April 4 at 7pm.
    // toDateStr should still return "2026-04-05" because it uses UTC methods.
    const d = new Date("2026-04-05");
    expect(toDateStr(d)).toBe("2026-04-05");
  });
});

describe("todayStr", () => {
  it("returns a string in YYYY-MM-DD format", () => {
    const result = todayStr();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches the local date", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(todayStr()).toBe(expected);
  });
});
