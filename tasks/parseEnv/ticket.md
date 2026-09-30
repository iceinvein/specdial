Add a `parseEnv(text: string): Record<string, string>` helper that parses the contents of a `.env` file into a key/value object, so we can read config files without pulling in dotenv.

Example: `parseEnv("PORT=3000\nHOST=localhost")` returns `{ PORT: "3000", HOST: "localhost" }`.
