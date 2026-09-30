import { describe, expect, it } from "vitest";
import { formatDuration } from "./formatDuration";

describe("formatDuration", () => {
  it("shows an en dash when there is no duration", () => {
    expect(formatDuration(null)).toBe("–");
  });

  it("shows short durations in milliseconds", () => {
    expect(formatDuration(250)).toBe("250ms");
  });

  it("shows a few seconds with one decimal place", () => {
    expect(formatDuration(1500)).toBe("1.5s");
  });

  it("shows tens of seconds as whole seconds", () => {
    expect(formatDuration(42000)).toBe("42s");
  });

  it("shows minutes and seconds", () => {
    expect(formatDuration(90000)).toBe("1m 30s");
  });

  it("shows exactly one minute with zero seconds", () => {
    expect(formatDuration(60000)).toBe("1m 0s");
  });
});
