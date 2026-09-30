import { describe, expect, it } from "vitest";
import { globToRegex } from "./globToRegex";

describe("globToRegex", () => {
  it("matches a file extension in the root directory", () => {
    expect(globToRegex("*.ts").test("index.ts")).toBe(true);
  });

  it("does not let a single star cross into a subdirectory", () => {
    expect(globToRegex("*.ts").test("lib/index.ts")).toBe(false);
  });

  it("matches files at any depth under a double star", () => {
    const re = globToRegex("lib/**/*.js");
    expect(re.test("lib/a/b/c.js")).toBe(true);
    expect(re.test("test/a/c.js")).toBe(false);
  });

  it("matches exactly one character with a question mark", () => {
    const re = globToRegex("file?.txt");
    expect(re.test("file1.txt")).toBe(true);
    expect(re.test("file10.txt")).toBe(false);
  });

  it("requires the whole path to match", () => {
    expect(globToRegex("*.md").test("notes.md.bak")).toBe(false);
  });

  it("matches a root-level file with a leading double star", () => {
    expect(globToRegex("**/package.json").test("package.json")).toBe(true);
  });
});
