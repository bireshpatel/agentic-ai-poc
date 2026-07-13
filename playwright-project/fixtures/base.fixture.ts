// fixtures/base.fixture.ts
import { test as base, createBdd } from 'playwright-bdd';
import type { Page } from '@playwright/test';

export class BddWorld {
  constructor(public readonly page: Page) {}
}

export const test = base.extend<{ world: BddWorld }>({
  world: async ({ page }, use) => {
    // Block ad-network requests that interfere with test reliability.
    await page.context().route('**/*', (route) => {
      const u = route.request().url();
      if (
        u.includes('googlesyndication.com') ||
        u.includes('doubleclick.net') ||
        u.includes('googleads.g.doubleclick') ||
        u.includes('pagead2.googlesyndication') ||
        u.includes('adservice.google') ||
        u.includes('fundingchoicesmessages.google.com')
      ) {
        return route.abort();
      }
      return route.continue();
    });
    await use(new BddWorld(page));
  },
});

export const { Given, When, Then } = createBdd(test, { worldFixture: 'world' });
