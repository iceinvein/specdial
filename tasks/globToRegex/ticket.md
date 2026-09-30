Add `globToRegex(pattern: string): RegExp` that converts a path glob into a RegExp we can use to match file paths, so the include/exclude settings can take globs.

Example: `globToRegex("src/**/*.ts").test("src/lib/util.ts")` should be `true`.
