import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  fullyParallel: false,
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npx expo start --web --port 8081',
    cwd: '.',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
