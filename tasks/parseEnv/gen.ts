// Usage: npx tsx tasks/parseEnv/gen.ts
// Writes corpus.json beside this file: the hand-written inputs below, each
// tagged with the spec.md clause or open decision it probes, then 500
// fast-check inputs from a fixed seed.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import fc from "fast-check";

const SEED = 20260930;
const GENERATED = 500;

const handWritten: [category: string, text: string][] = [
  ["lines-split-on-lf", "ALPHA=one\nBETA=two\nGAMMA=three"],
  ["lines-split-on-lf", "SOLO_KEY=lonely\n"],
  ["crlf-line-endings", "WIN_A=first\r\nWIN_B=second\r\n"],
  ["crlf-line-endings", "CR_ONLY=a\rCR_NEXT=b"],
  ["line-trimmed", "   \t PADDED_LINE=value\t  "],
  ["blank-line-skipped", "\n\n  \n\t\nAFTER_BLANKS=yes\n\n"],
  ["blank-line-skipped", "  \t  \n \r\n"],
  ["comment-line-skipped", "#COMMENTED=out\nLIVE_ONE=in"],
  ["comment-line-skipped", "   # indented remark = with equals\nLIVE_TWO=in"],
  ["comment-line-skipped", "#\n##\n#=\nLIVE_THREE=in"],
  ["hash-not-first-char", "HASH#KEY=value"],
  ["hash-not-first-char", "=#not a comment"],
  ["export-prefix-removed", "export SHIPPED=cargo"],
  ["export-prefix-removed", "  export   SPACED_EXPORT =  wide  "],
  ["export-prefix-removed", "export QUOTED_EXPORT='kept inside'"],
  ["export-prefix-removed-once", "export export DOUBLE=twice"],
  ["export-without-space", "export\tTABBED=tab"],
  ["export-without-space", "exportGLUED=glued"],
  ["export-as-key", "export=itself"],
  ["export-as-key", "export =spaced"],
  ["export-uppercase", "EXPORT UPPER=case"],
  ["export-without-assignment", "export NO_EQUALS_HERE"],
  ["no-equals-skipped", "JUST_A_WORD\nREAL_PAIR=ok"],
  ["no-equals-skipped", "a line of prose with no assignment"],
  ["key-before-first-equals", "CONN=postgres://u:p@h/db?ssl=true&mode=x"],
  ["key-before-first-equals", "EQ_RUN===="],
  ["key-before-first-equals", "B64=dGVzdA=="],
  ["key-trimmed", " \t SPACEY_KEY \t =v"],
  ["key-with-inner-space", "TWO WORDS=joined"],
  ["empty-key", "=orphan value"],
  ["empty-key", "  =  "],
  ["value-trimmed", "TRIM_ME=   around   "],
  ["value-inner-space-kept", "SENTENCE=a  b   c"],
  ["empty-value", "EMPTY_ONE="],
  ["empty-value", "EMPTY_TWO=   \t"],
  ["double-quotes-removed", 'DQ="double quoted"'],
  ["single-quotes-removed", "SQ='single quoted'"],
  ["quotes-inner-whitespace-kept", 'PAD_DQ="  inner pad  "'],
  ["quotes-inner-whitespace-kept", "PAD_SQ=  '\tlead tab'  "],
  ["empty-quoted-value", 'NONE_DQ=""'],
  ["empty-quoted-value", "NONE_SQ=''"],
  ["one-quote-pair-only", 'NESTED=""twice""'],
  ["one-quote-pair-only", "MIXED_NEST='\"inner double\"'"],
  ["single-quote-char", 'LONE_DQ="'],
  ["single-quote-char", "LONE_SQ='"],
  ["mismatched-quotes", "MISMATCH=\"open double'"],
  ["mismatched-quotes", 'OPEN_ONLY="unterminated'],
  ["mismatched-quotes", 'CLOSE_ONLY=unopened"'],
  ["quotes-not-at-both-ends", 'MIDDLE=a"b"c'],
  ["quotes-not-at-both-ends", 'TRAILER="quoted" tail'],
  ["no-escape-processing", 'ESCAPES="line\\nbreak\\ttab"'],
  ["no-escape-processing", "BACKSLASH=C:\\dir\\file"],
  ["no-inline-comment-stripping", "INLINE=value # trailing note"],
  ["no-inline-comment-stripping", 'QUOTED_HASH="v" # after quote'],
  ["no-variable-expansion", "REF=${HOME}/bin:$PATH"],
  ["last-occurrence-wins", "DUPE=first\nOTHER=x\nDUPE=second"],
  ["last-occurrence-wins", "DUPE_EMPTY=filled\nDUPE_EMPTY="],
  ["last-occurrence-wins", " SAME_AFTER_TRIM=a\nSAME_AFTER_TRIM =b"],
  ["prototype-key", "__proto__=polluted"],
  ["prototype-key", "constructor=ctor\ntoString=str"],
  ["unicode-whitespace-trimmed", "\u00a0NBSP_KEY\u00a0=\u00a0nbsp\u00a0"],
  ["unicode-whitespace-trimmed", "\ufeffBOM_KEY=bom"],
  ["unicode-content", "GRÜSSE=héllo wörld ✓"],
  ["empty-input", ""],
  ["mixed-file", "# app\nexport APP_NAME=\"svc\"\n\nPORT_NUM=8080 # web\nURL_Q=http://x/?a=b\r\nbad line\nAPP_NAME='final'"],
];

const keyArb = fc.oneof(
  fc.constantFrom("A", "B", "KEY", "db_url", "Path", "x.y", "_", "K1"),
  fc.string({ unit: fc.constantFrom("A", "b", "_", "1", " ", "#", "=", '"'), maxLength: 5 }),
);

const valueArb = fc.string({
  unit: fc.constantFrom("v", "Z", "0", "=", "=", '"', '"', "'", "'", "#", " ", " ", "\t", "\r", "\\", "é"),
  maxLength: 10,
});

const wsArb = fc.string({ unit: fc.constantFrom(" ", " ", "\t", "\r"), maxLength: 3 });

const assignmentArb = fc
  .record({
    lead: wsArb,
    exportPrefix: fc.constantFrom("", "", "export ", "export  ", "export\t", "export"),
    key: keyArb,
    beforeEq: wsArb,
    afterEq: wsArb,
    quote: fc.constantFrom("", "", '"', "'", "mismatch"),
    value: valueArb,
    trail: wsArb,
  })
  .map((l) => {
    const quoted =
      l.quote === "mismatch" ? `"${l.value}'` : `${l.quote}${l.value}${l.quote}`;
    return `${l.lead}${l.exportPrefix}${l.key}${l.beforeEq}=${l.afterEq}${quoted}${l.trail}`;
  });

const lineArb = fc.oneof(
  { weight: 6, arbitrary: assignmentArb },
  { weight: 1, arbitrary: fc.tuple(wsArb, valueArb).map(([ws, text]) => `${ws}#${text}`) },
  { weight: 1, arbitrary: wsArb },
  { weight: 1, arbitrary: fc.tuple(fc.constantFrom("", "export "), keyArb).map(([p, k]) => `${p}${k}`) },
);

const textArb = fc
  .tuple(fc.array(lineArb, { minLength: 1, maxLength: 6 }), fc.constantFrom("\n", "\n", "\r\n"))
  .map(([lines, eol]) => lines.join(eol));

const generated = fc.sample(textArb, { seed: SEED, numRuns: GENERATED });

const inputs = [
  ...handWritten.map(([category, text], i) => ({
    id: `h${String(i + 1).padStart(3, "0")}`,
    category,
    args: [text],
  })),
  ...generated.map((text, i) => ({
    id: `g${String(i + 1).padStart(4, "0")}`,
    category: "generated",
    args: [text],
  })),
];

const corpus = { function: "parseEnv", inputs };
writeFileSync(join(import.meta.dirname, "corpus.json"), `${JSON.stringify(corpus, null, 2)}\n`);
