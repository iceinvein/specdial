import fc from "fast-check"
import { expect, test } from "vitest"
import { shout } from "./shout"

test("ends with exactly the upper-cased input and one exclamation mark", () => {
  fc.assert(
    fc.property(fc.string(), (text) => {
      expect(shout(text)).toBe(`${text.toUpperCase()}!`)
    }),
    { seed: 1, numRuns: 200 },
  )
})

test("fixed case", () => {
  expect(shout("hand 030 text")).toBe("HAND 030 TEXT!")
})
