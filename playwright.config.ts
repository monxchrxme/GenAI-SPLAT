import { defineConfig } from '@playwright/test';

const externalURL = process.env.SMOKE_BASE_URL;
const channel = process.env.PLAYWRIGHT_CHANNEL;

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: 'list',
  use: {
    baseURL: externalURL ?? 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', ...(channel ? { channel } : {}) } },
  ],
  ...(externalURL
    ? {}
    : {
        webServer: {
          command: 'npm run preview -- --port 4173 --strictPort',
          url: 'http://127.0.0.1:4173',
          reuseExistingServer: false,
        },
      }),
});
