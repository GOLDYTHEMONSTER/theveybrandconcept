import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["modules/**/*.test.ts"],
    // Each test file imports a store module fresh, and those modules seed
    // themselves from Math.random()/randomUUID() at import time -- running
    // suites in parallel worker threads is fine (each gets its own module
    // registry), but a single test file's cases must run in sequence since
    // they share that one seeded store instance.
    fileParallelism: true,
  },
});
