import { expect, test } from "vitest"
import { shout } from "./shout"

test("upper-cases and appends an exclamation mark", () => {
  expect(shout("hi")).toBe("HI!")
})

test("is exported as a function", () => {
  expect(typeof shout).toBe("function")
})
