import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 8_000
  },
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: "node e2e/mock-api.mjs",
      port: 3201,
      reuseExistingServer: false,
      timeout: 30_000
    },
    {
      command:
        "pnpm --filter @soroslo/dashboard dev --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        SOROSLO_API_URL: "http://127.0.0.1:3201"
      }
    }
  ]
});
