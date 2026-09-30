// Writes corpus.json: hand-written inputs, each tagged with the spec.md clause
// or open decision it probes, followed by fast-check generated inputs.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fc from "fast-check";

type Input = { id: string; category: string; args: [string, string] };

const handWritten: Array<[category: string, raw: string, extension: string]> = [
  ["common-case", "invoice", "pdf"],
  ["common-case", "Mary Jones", "docx"],
  ["trim-surrounding-whitespace", "   ledger   ", "csv"],
  ["trim-surrounding-whitespace", "\t\nmemo\r\n", "txt"],
  ["forbidden-backslash", "a\\b\\c", "txt"],
  ["forbidden-slash", "2026/09/30", "log"],
  ["forbidden-colon", "C:budget", "xls"],
  ["forbidden-asterisk", "star*gazer", "png"],
  ["forbidden-question", "why?not", "md"],
  ["forbidden-double-quote", "\"quoted\"", "txt"],
  ["forbidden-angle-brackets", "<tag>", "html"],
  ["forbidden-pipe", "left|right", "csv"],
  ["forbidden-all-together", "x\\/:*?\"<>|y", "bin"],
  ["forbidden-then-whitespace", "alpha / beta", "txt"],
  ["forbidden-single-quote-kept", "it's mine", "txt"],
  ["whitespace-run-to-dash", "one  two   three", "txt"],
  ["whitespace-tab-newline", "col\tA\nrow", "tsv"],
  ["whitespace-unicode-nbsp", "café menu", "pdf"],
  ["whitespace-unicode-ideographic", "日本　語", "txt"],
  ["dash-run-collapse", "a---b", "txt"],
  ["dash-run-collapse", "x - - y", "txt"],
  ["dash-and-space-mix", "left - right", "pdf"],
  ["leading-dash-dot-run", "-.-hidden", "txt"],
  ["leading-dot", ".bashrc", "bak"],
  ["trailing-dash-dot-run", "draft.-.", "txt"],
  ["trailing-dots", "ending...", "txt"],
  ["both-ends-dash-dot", "..--core--..", "txt"],
  ["interior-dots-kept", "v1.2.3", "zip"],
  ["interior-dot-dash-kept", "a.-.b", "txt"],
  ["interior-dot-run-kept", "a...b", "txt"],
  ["case-preserved", "MiXeD CaSe", "PDF"],
  ["case-preserved", "ALLCAPS", "txt"],
  ["unicode-letters-kept", "résumé français", "pdf"],
  ["unicode-emoji-kept", "party 🎉 time", "png"],
  ["unicode-combining-mark", "éclair", "txt"],
  ["fallback-empty", "", "pdf"],
  ["fallback-whitespace-only", "\t \n", "pdf"],
  ["fallback-forbidden-only", "***???", "txt"],
  ["fallback-dash-dot-only", "-.-.-", "doc"],
  ["fallback-mix-removable", " / . - : ", "pdf"],
  ["extension-without-dot", "chart", "svg"],
  ["extension-with-dot", "chart", ".svg"],
  ["extension-with-dot", "Mary Jones", ".docx"],
  ["extension-with-dot-fallback", "", ".pdf"],
  ["extension-double-dot", "archive", "..gz"],
  ["extension-multi-part", "backup", "tar.gz"],
  ["extension-multi-part-dotted", "backup", ".tar.gz"],
  ["extension-empty", "plain", ""],
  ["extension-only-dot", "plain", "."],
  ["extension-not-sanitised", "img", "p/n g"],
  ["extension-leading-space", "img", " .jpg"],
  ["extension-uppercase-dotted", "photo", ".JPEG"],
  ["extension-unicode", "doc", "ü"],
  ["digits-only", "20260930", "csv"],
  ["long-input", "word ".repeat(60), "txt"],
  ["trim-before-dash-strip", " - padded - ", "txt"],
  ["forbidden-inside-whitespace-run", "a  |  b", "txt"],
  ["dot-dash-at-ends-after-removal", "?.name.?", "txt"],
];

const FORBIDDEN = ["\\", "/", ":", "*", "?", '"', "<", ">", "|"];
const SPECIAL = [...FORBIDDEN, " ", "  ", "\t", "\n", " ", "　", "-", "--", ".", ".."];
const ORDINARY = ["a", "Z", "k", "7", "_", "é", "ß", "日", "😀", "é"];

const rawArb = fc.oneof(
  { weight: 4, arbitrary: fc.string({ unit: fc.constantFrom(...SPECIAL, ...ORDINARY), maxLength: 14 }) },
  { weight: 2, arbitrary: fc.string({ unit: "grapheme", maxLength: 12 }) },
  { weight: 2, arbitrary: fc.string({ maxLength: 16 }) },
  { weight: 1, arbitrary: fc.constant("") },
);
const bareExtArb = fc.oneof(
  fc.constantFrom("pdf", "txt", "md", "json", "tar.gz", ""),
  fc.string({ unit: fc.constantFrom("a", "q", "X", "4", ".", "-", "ñ"), maxLength: 5 }),
);
const extArb = fc.tuple(fc.boolean(), bareExtArb).map(([dotted, ext]) => (dotted ? `.${ext}` : ext));

const samples = fc.sample(fc.tuple(rawArb, extArb), { seed: 20260930, numRuns: 500 });

const inputs: Input[] = [
  ...handWritten.map(([category, raw, extension], i): Input => ({
    id: `h${String(i + 1).padStart(3, "0")}`,
    category,
    args: [raw, extension],
  })),
  ...samples.map(([raw, extension], i): Input => ({
    id: `g${String(i + 1).padStart(4, "0")}`,
    category: "generated",
    args: [raw, extension],
  })),
];

const lines = inputs.map((input) => `  ${JSON.stringify(input)}`);
const text = `{"function": "safeFilename",\n "inputs": [\n${lines.join(",\n")}\n]}\n`;
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), "corpus.json"), text);
