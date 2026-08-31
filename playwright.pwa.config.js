import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4174/dolldom-arcade/';

export default defineConfig({
  testDir: './e2e-pwa',
  workers: 1,
  reporter: 'line',
  use: {
    baseURL,
    channel: 'chrome',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4174',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
