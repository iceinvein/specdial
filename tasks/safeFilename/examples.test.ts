import { describe, expect, it } from "vitest";
import { safeFilename } from "./safeFilename";

describe("safeFilename", () => {
  it("joins a plain name and extension with a dot", () => {
    expect(safeFilename("report", "pdf")).toBe("report.pdf");
  });

  it("turns spaces into dashes and keeps letter case", () => {
    expect(safeFilename("John Smith", "pdf")).toBe("John-Smith.pdf");
  });

  it("trims surrounding whitespace and collapses inner runs", () => {
    expect(safeFilename("  Annual   Plan  ", "txt")).toBe("Annual-Plan.txt");
  });

  it("drops characters that are not allowed in paths", () => {
    expect(safeFilename("Q3: draft/final?", "doc")).toBe("Q3-draftfinal.doc");
  });

  it("accepts an extension that already has its dot", () => {
    expect(safeFilename("notes", ".md")).toBe("notes.md");
  });

  it("falls back to resume when nothing usable is left", () => {
    expect(safeFilename("   ", "pdf")).toBe("resume.pdf");
  });
});
