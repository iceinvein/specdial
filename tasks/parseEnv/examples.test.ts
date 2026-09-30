import { describe, expect, test } from "vitest";
import { parseEnv } from "./parseEnv";

describe("parseEnv", () => {
  test("parses a single key and value", () => {
    expect(parseEnv("NODE_ENV=production")).toEqual({ NODE_ENV: "production" });
  });

  test("parses one entry per line", () => {
    expect(parseEnv("API_URL=https://example.test\nRETRIES=3\nDEBUG=false")).toEqual({
      API_URL: "https://example.test",
      RETRIES: "3",
      DEBUG: "false",
    });
  });

  test("skips blank lines and comments", () => {
    expect(parseEnv("# database settings\n\nDB_NAME=app\n\n# end")).toEqual({ DB_NAME: "app" });
  });

  test("trims whitespace around keys and values", () => {
    expect(parseEnv("  LOG_LEVEL =  info  ")).toEqual({ LOG_LEVEL: "info" });
  });

  test("removes surrounding double quotes from a value", () => {
    expect(parseEnv('GREETING="hello world"')).toEqual({ GREETING: "hello world" });
  });

  test("returns an empty object for empty input", () => {
    expect(parseEnv("")).toEqual({});
  });
});
