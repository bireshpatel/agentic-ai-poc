import path from 'path';
import dotenv from 'dotenv';
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const isCI = !!process.env.CI;

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: ['steps/**/*.steps.ts', 'fixtures/**/*.ts'],
  disableWarnings: { importTestFrom: true },
});

export default defineConfig({
  testDir,

  timeout: 60_000,
  expect: {
    timeout: 30_000,
  },
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : 1,

  use: {
    baseURL: process.env.PW_BASE_URL,
    headless: isCI,
    actionTimeout: 30_000,
    navigationTimeout: 30_000,

    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  reporter: [
    ['list'],
    [
      'allure-playwright',
      {
        detail: true,
        outputFolder: 'allure-results',
        suiteTitle: false,
      },
    ],
    [
      'playwright-smart-reporter',
      {
        outputFile: 'smart-reporter-output/smart-report.html',
        historyFile: 'smart-reporter-output/test-history.json',
        maxHistoryRuns: 10,
      },
    ],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
