The reports page needs an "Export CSV" button. Add `toCsv(rows: Record<string, string | number>[]): string` that turns an array of row objects into CSV text we can hand to the browser as a download.

Example: `toCsv([{ name: "Ada", age: 36 }])` gives a header line `name,age` followed by `Ada,36`.
