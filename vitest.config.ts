import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // Pin the business timezone so date tests don't depend on the machine.
    env: { NEXT_PUBLIC_BUSINESS_TZ: "America/Chicago" },
  },
});
