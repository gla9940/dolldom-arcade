import { expect, test } from '@playwright/test';

test('설치된 앱 셸은 네트워크가 끊겨도 다시 열린다', async ({ context, page }) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
    await page.reload();
  }
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.waitForFunction(async () => {
    const requests = [];
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      const cachedRequests = await (await caches.open(cacheName)).keys();
      requests.push(...cachedRequests);
    }
    return requests.some(({ url }) => url.endsWith('.js'))
      && requests.some(({ url }) => url.endsWith('.css'));
  });

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/돌돔의 공간/);
    await expect(page.locator('[data-game]')).toHaveCount(4);
    await expect(page.locator('#system-status')).toContainText('OFFLINE');
  } finally {
    await context.setOffline(false);
  }
});
