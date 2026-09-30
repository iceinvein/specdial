import { expect, test } from "vitest"
import { shout } from "./shout"

test("upper-cases and appends a question mark", () => {
  expect(shout("hi")).toBe("HI?")
})
