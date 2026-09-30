import { defineConfig } from "vitest/config";

// tasks/*/*.test.ts import "./<fn>", which only exists in an agent's work dir.
export default defineConfig({ test: { include: ["*.test.ts"] } });
