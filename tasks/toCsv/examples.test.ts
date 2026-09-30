import { describe, expect, it } from "vitest";
import { toCsv } from "./toCsv";

describe("toCsv", () => {
  it("writes a header line from the row keys, then the row values", () => {
    expect(toCsv([{ name: "Ada", age: 36 }])).toBe("name,age\nAda,36\n");
  });

  it("writes one line per row in the order given", () => {
    const rows = [
      { name: "Ada", age: 36 },
      { name: "Alan", age: 41 },
      { name: "Grace", age: 85 },
    ];
    expect(toCsv(rows)).toBe("name,age\nAda,36\nAlan,41\nGrace,85\n");
  });

  it("writes number values as plain digits", () => {
    expect(toCsv([{ item: "tea", price: 2.5, qty: 3 }])).toBe("item,price,qty\ntea,2.5,3\n");
  });

  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("wraps a value containing a comma in double quotes", () => {
    expect(toCsv([{ city: "Paris, France" }])).toBe('city\n"Paris, France"\n');
  });
});
