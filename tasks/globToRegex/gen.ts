// Usage: npx tsx tasks/globToRegex/gen.ts
// Writes corpus.json beside this file: the hand-written patterns below, then
// 500 fast-check patterns. Every input carries a probe list of paths, built
// from the spec's own reading of the pattern (paths it must match and near
// misses it must not), plus a fixed pool of root, nested, dotted and
// metacharacter paths.
import { writeFileSync } from "node:fs";
import fc from "fast-check";

type HandWritten = { category: string; pattern: string; paths: string[] };

const HAND_WRITTEN: HandWritten[] = [
  // Anchored at both ends.
  { category: "anchored-whole-path", pattern: "*.log", paths: ["app.log.1", "old/app.log", "x.log"] },
  { category: "anchored-literal", pattern: "build", paths: ["build/out", "prebuild", "rebuilds"] },
  { category: "anchored-prefix-suffix", pattern: "cfg/*.ini", paths: ["etc/cfg/a.ini", "cfg/a.ini.orig"] },

  // A single star: any run without a slash, including an empty run.
  { category: "star-no-slash", pattern: "docs/*.md", paths: ["docs/a/b.md", "docs/.md", "docs/guide.md"] },
  { category: "star-alone", pattern: "*", paths: ["", "a/b", "file", "/"] },
  { category: "star-trailing", pattern: "lib/*", paths: ["lib/", "lib/x/y", "lib"] },
  { category: "star-each-segment", pattern: "*/*.json", paths: ["a/b.json", "b.json", "a/b/c.json"] },
  { category: "star-multiple-in-segment", pattern: "a*b*c", paths: ["abc", "a1b2c", "a/b/c", "ab/c"] },
  { category: "star-empty-run", pattern: "pre*", paths: ["pre", "prefix", "pre/fix"] },
  { category: "star-leading", pattern: "*_spec.rb", paths: ["_spec.rb", "user_spec.rb", "models/user_spec.rb"] },

  // A question mark: exactly one character that is not a slash.
  { category: "question-one-char", pattern: "v?.?", paths: ["v1.2", "v10.2", "v/.2", "v1."] },
  { category: "question-exact-count", pattern: "??", paths: ["ab", "a", "abc", "a/", ".."] },
  { category: "question-not-slash", pattern: "x?y", paths: ["x/y", "xzy", "x.y"] },
  { category: "question-alone", pattern: "?", paths: ["", "a", "/", "ab"] },
  { category: "question-then-star", pattern: "?*", paths: ["", "a", "ab", "a/b"] },
  { category: "star-then-question", pattern: "*?", paths: ["", "z", "zz", "/z"] },

  // A double star: any run at all, slashes included, possibly empty.
  { category: "globstar-alone", pattern: "**", paths: ["", "a/b/c", ".hidden/x", "/", "a\nb"] },
  { category: "globstar-no-slash-after", pattern: "src**", paths: ["src", "srcfoo/bar", "src/a/b"] },
  { category: "globstar-inside-segment", pattern: "**.min.js", paths: ["a/b.min.js", ".min.js", "a.min.jsx"] },
  { category: "globstar-before-extension", pattern: "tmp/**.bak", paths: ["tmp/x.bak", "tmp/a/b/x.bak", "tmp.bak"] },

  // A double star followed by a slash consumes that slash.
  { category: "globstar-slash-root-level", pattern: "**/*.cfg", paths: ["main.cfg", "a/b/main.cfg", "/main.cfg"] },
  { category: "globstar-slash-root-literal", pattern: "**/Dockerfile", paths: ["Dockerfile", "svc/api/Dockerfile", "xDockerfile"] },
  { category: "globstar-slash-middle", pattern: "out/**/*.map", paths: ["out/x.map", "out/a/b/x.map", "outx.map"] },
  { category: "globstar-slash-middle-empty", pattern: "p/**/q", paths: ["p/q", "p/x/y/q", "pq", "p//q"] },
  { category: "globstar-slash-multiple", pattern: "a/**/m/**/z.go", paths: ["a/m/z.go", "a/1/m/2/3/z.go", "a/z.go"] },

  // Every other character is literal, regex metacharacters included.
  { category: "literal-dot", pattern: "file.name", paths: ["filexname", "file.name"] },
  { category: "literal-plus", pattern: "c++/*.h", paths: ["cc/a.h", "c/a.h", "c++/a.h", "ccc/a.h"] },
  { category: "literal-parens", pattern: "(group)/*", paths: ["group/a", "(group)/a"] },
  { category: "literal-brackets", pattern: "[id].tsx", paths: ["i.tsx", "d.tsx", "[id].tsx"] },
  { category: "literal-pipe", pattern: "a|b", paths: ["a", "b", "a|b"] },
  { category: "literal-caret", pattern: "^start", paths: ["start", "^start"] },
  { category: "literal-dollar", pattern: "end$", paths: ["end", "end$"] },
  { category: "literal-dollar-leading", pattern: "$HOME/*", paths: ["HOME/x", "$HOME/.rc"] },
  { category: "literal-backslash", pattern: "\\d+", paths: ["5", "\\d+", "\\dd", "d+"] },
  { category: "literal-braces-quantifier", pattern: "x{1,3}", paths: ["x", "xxx", "x{1,3}"] },
  { category: "literal-dot-star-lookalike", pattern: "a.*b", paths: ["a.xyzb", "axyzb", "a.b", "a./b"] },
  { category: "literal-space", pattern: "my docs/*", paths: ["my docs/a", "mydocs/a"] },
  { category: "literal-unicode", pattern: "café/*", paths: ["café/menu", "cafe/menu"] },

  // No brace alternation, character classes or negation.
  { category: "brace-no-alternation", pattern: "{src,lib}/*.ts", paths: ["src/a.ts", "lib/a.ts", "{src,lib}/a.ts"] },
  { category: "brace-no-alternation-ext", pattern: "*.{png,gif}", paths: ["a.png", "a.gif", "a.{png,gif}"] },
  { category: "no-character-class", pattern: "[a-z]", paths: ["b", "[a-z]", "-"] },
  { category: "no-character-class-negated", pattern: "[!a]*", paths: ["b", "bx", "[!a]x", "[!a]"] },
  { category: "no-negation", pattern: "!*.tmp", paths: ["x.tmp", "!x.tmp"] },

  // Case-sensitive.
  { category: "case-sensitive-extension", pattern: "*.JPG", paths: ["a.jpg", "a.JPG", "a.Jpg"] },
  { category: "case-sensitive-literal", pattern: "Makefile", paths: ["makefile", "MAKEFILE"] },

  // Open decisions: the spec does not say, the reference picks one reading.
  { category: "open-empty-pattern", pattern: "", paths: ["", "a", "/"] },
  { category: "open-triple-star", pattern: "***", paths: ["", "a/b", "abc", "a\n/b"] },
  { category: "open-triple-star-slash", pattern: "a/***/b", paths: ["a/b", "a//b", "a/x/b", "a/x/y/b"] },
  { category: "open-repeated-globstar-slash", pattern: "**/**", paths: ["", "a", "a/b", "/", "a/\nb"] },
  { category: "open-globstar-trailing-slash", pattern: "**/", paths: ["", "a/", "a", "a/b/", "a\n/"] },
  { category: "open-globstar-leading-slash", pattern: "/**", paths: ["", "/", "a", "/a/b"] },
  { category: "open-globstar-mid-segment-slash", pattern: "a**/b", paths: ["ab", "a/b", "ax/b", "axb", "ax/y/b"] },
  { category: "open-trailing-globstar", pattern: "logs/**", paths: ["logs", "logs/", "logs/a/b"] },
  { category: "open-double-slash-after-globstar", pattern: "**//x", paths: ["x", "/x", "a//x", "a/x"] },
  { category: "open-double-slash-literal", pattern: "a//b", paths: ["a/b", "a//b"] },
  { category: "open-leading-slash", pattern: "/etc/*", paths: ["etc/hosts", "/etc/hosts"] },
  { category: "open-trailing-slash", pattern: "build/", paths: ["build", "build/", "build/x"] },
  { category: "open-dot-slash-prefix", pattern: "./src/*", paths: ["src/a", "./src/a"] },
  { category: "open-parent-dir", pattern: "../*", paths: ["../a", "a", "x/a"] },
  { category: "open-star-matches-dotfile", pattern: "*rc", paths: [".bashrc", "rc", ".config/rc"] },
  { category: "open-globstar-matches-dot-dir", pattern: "**/*", paths: [".git/config", "a", "", "x\n/y"] },
  { category: "open-backslash-before-star", pattern: "dir\\*", paths: ["dir*", "dir\\x", "dir\\*", "dirx"] },
  { category: "open-backslash-before-question", pattern: "a\\?", paths: ["a?", "a\\b", "ab"] },
  { category: "open-question-astral-char", pattern: "?.txt", paths: ["😀.txt", "é.txt", "a.txt"] },
  { category: "open-star-newline", pattern: "*.txt", paths: ["a\nb.txt", "a.txt"] },
  { category: "open-globstar-newline", pattern: "a/**", paths: ["a/x\ny", "a/x/y"] },
  { category: "open-question-newline", pattern: "x?", paths: ["x\n", "x\r", "xy"] },
];

// Root-level, nested, dotted and metacharacter paths, appended to every probe.
const POOL = [
  "README",
  "index.ts",
  ".env",
  "src/app.ts",
  "src/lib/util.test.ts",
  "a/b/c/d.txt",
  ".config/settings.json",
  "docs/(draft)/v1.0.md",
  "lib/[id]/page.tsx",
  "x+y/a|b.js",
  "$HOME/^cfg",
  "back\\slash/f.txt",
  "{a,b}/c",
  "dir/",
];
const MIN_PROBE = 10;
const MAX_PROBE = 30;

type Token = { kind: "literal"; ch: string } | { kind: "star" | "question" | "globstar" | "globstar-slash" };

// Splits a pattern the way spec.md reads it: `**/` is one token, `**` another.
function tokenize(pattern: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < pattern.length) {
    if (pattern.startsWith("**/", i)) {
      tokens.push({ kind: "globstar-slash" });
      i += 3;
    } else if (pattern.startsWith("**", i)) {
      tokens.push({ kind: "globstar" });
      i += 2;
    } else if (pattern[i] === "*") {
      tokens.push({ kind: "star" });
      i += 1;
    } else if (pattern[i] === "?") {
      tokens.push({ kind: "question" });
      i += 1;
    } else {
      tokens.push({ kind: "literal", ch: pattern[i] as string });
      i += 1;
    }
  }
  return tokens;
}

type Fill = { star: string; question: string; globstar: string; globstarSlash: string };

function instantiate(tokens: Token[], fill: Fill): string {
  return tokens
    .map((t) => {
      switch (t.kind) {
        case "literal":
          return t.ch;
        case "star":
          return fill.star;
        case "question":
          return fill.question;
        case "globstar":
          return fill.globstar;
        case "globstar-slash":
          return fill.globstarSlash;
      }
    })
    .join("");
}

// Fills that spec.md says every wildcard accepts.
const MATCHING_FILLS: Fill[] = [
  { star: "", question: "q", globstar: "", globstarSlash: "" },
  { star: "ab", question: "Z", globstar: "m/n", globstarSlash: "m/n/" },
  { star: "a.b", question: ".", globstar: "d.e", globstarSlash: "d/" },
  { star: "(x)", question: "$", globstar: "p/q.r", globstarSlash: "p/q/r/" },
];
const BASE = MATCHING_FILLS[1] as Fill;

function flipCase(s: string): string {
  return s.replace(/[a-zA-Z]/g, (c) => (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()));
}

// Near misses: a wildcard fed something it should refuse, or the whole path
// nudged at either end.
function nearMisses(tokens: Token[]): string[] {
  const base = instantiate(tokens, BASE);
  return [
    instantiate(tokens, { ...BASE, star: "a/b" }),
    instantiate(tokens, { ...BASE, question: "" }),
    instantiate(tokens, { ...BASE, question: "qq" }),
    instantiate(tokens, { ...BASE, question: "/" }),
    `${base}x`,
    `x${base}`,
    `${base}/`,
    `/${base}`,
    flipCase(base),
    base.slice(0, -1),
    base.replace(/[.+()[\]{}|^$\\]/, "x"),
  ];
}

function probeFor(pattern: string, paths: string[]): string[] {
  const tokens = tokenize(pattern);
  const candidates = [
    ...paths,
    pattern,
    ...MATCHING_FILLS.map((f) => instantiate(tokens, f)),
    ...nearMisses(tokens),
    ...POOL,
  ];
  const probe = [...new Set(candidates)].slice(0, MAX_PROBE);
  if (probe.length < MIN_PROBE) throw new Error(`probe for ${JSON.stringify(pattern)} has ${probe.length} paths`);
  return probe;
}

const GENERATED_COUNT = 500;
const GENERATOR_TOKENS = [
  "*", "**", "?", "/", "/", ".",
  "+", "(", ")", "[", "]", "|", "^", "$", "\\",
  "{", "}", ",",
  "a", "b", "c", "x", "Q",
];
const generatedPattern = fc
  .array(fc.constantFrom(...GENERATOR_TOKENS), { maxLength: 10 })
  .map((parts) => parts.join(""));

function generatedPatterns(): string[] {
  const seen = new Set(HAND_WRITTEN.map((h) => h.pattern));
  const out: string[] = [];
  for (const pattern of fc.sample(generatedPattern, { seed: 20260930, numRuns: 5000 })) {
    if (seen.has(pattern)) continue;
    seen.add(pattern);
    out.push(pattern);
    if (out.length === GENERATED_COUNT) return out;
  }
  throw new Error(`only ${out.length} distinct generated patterns`);
}

type Input = { id: string; category: string; args: [string]; probe: string[] };

const inputs: Input[] = [
  ...HAND_WRITTEN.map((h, i) => ({
    id: `h${String(i + 1).padStart(3, "0")}`,
    category: h.category,
    args: [h.pattern] as [string],
    probe: probeFor(h.pattern, h.paths),
  })),
  ...generatedPatterns().map((pattern, i) => ({
    id: `g${String(i + 1).padStart(4, "0")}`,
    category: "generated",
    args: [pattern] as [string],
    probe: probeFor(pattern, []),
  })),
];

const body = inputs.map((input) => `  ${JSON.stringify(input)}`).join(",\n");
writeFileSync(
  new URL("./corpus.json", import.meta.url),
  `{"function": "globToRegex",\n "inputs": [\n${body}\n]}\n`,
);
