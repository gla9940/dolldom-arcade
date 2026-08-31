import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('메인 화면과 정적 리소스가 정상적으로 표시된다', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await expect(page).toHaveTitle(/돌돔의 공간/);
  await expect(page.locator('[data-game]')).toHaveCount(3);
  await expect(page.getByRole('button', { name: '게임 크게 보기' })).toBeVisible();

  const assetState = await page.evaluate(() => ({
    background: getComputedStyle(document.body).backgroundColor,
    styleSheets: document.styleSheets.length,
    canvasSize: [document.querySelector('#game').width, document.querySelector('#game').height],
  }));

  expect(assetState.background).toBe('rgb(7, 5, 12)');
  expect(assetState.styleSheets).toBeGreaterThan(0);
  expect(assetState.canvasSize).toEqual([720, 360]);
  expect(pageErrors).toEqual([]);
});

test('카운트다운, 일시정지, 재시작 흐름이 동작한다', async ({ page }) => {
  await expect(page.locator('#quick-guide')).toBeVisible();
  await page.getByRole('button', { name: '게임 시작', exact: true }).click();
  await expect(page.locator('#overlay-title')).toHaveText('3');
  await expect(page.locator('#overlay')).toHaveClass(/hidden/, { timeout: 3_000 });
  await expect(page.locator('#game')).toBeFocused();

  await page.getByRole('button', { name: '일시정지' }).click();
  await expect(page.locator('#overlay-title')).toHaveText('잠시 멈춤');
  await page.getByRole('button', { name: '계속하기', exact: true }).click();
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);

  await page.getByRole('button', { name: '다시 시작' }).click();
  await expect(page.locator('#overlay-title')).toHaveText('네온 러너');
  await expect(page.locator('#live-score')).toHaveText('SCORE 0000');
});

test('게임 선택, 음량 저장, 집중 모드가 동작한다', async ({ page }) => {
  await page.locator('[data-game="memory"]').click();
  await expect(page.locator('#game-name')).toHaveText('GLITCH MEMORY');
  await expect(page.locator('[data-game="memory"]')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#volume').fill('35');
  await page.locator('#volume').dispatchEvent('change');
  await expect(page.locator('#volume-value')).toHaveText('35%');
  expect(await page.evaluate(() => localStorage.getItem('dolldom-volume'))).toBe('0.35');

  await page.getByRole('button', { name: '게임 크게 보기' }).click();
  await expect(page.locator('body')).toHaveClass(/game-focus-mode/);
  await expect(page.locator('#arcade')).toHaveAttribute('inert', '');
  await page.locator('#game').press('Escape');
  await expect(page.locator('body')).not.toHaveClass(/game-focus-mode/);
});

test('게임 종료 후 현재 점수와 최고 기록을 표시한다', async ({ page }) => {
  await page.locator('[data-game="reaction"]').click();
  await page.getByRole('button', { name: '게임 시작', exact: true }).click();

  await expect(page.locator('#overlay-title')).toHaveText('신호를 놓쳤어요!', { timeout: 18_000 });
  await expect(page.locator('#result-stats')).toBeVisible();
  await expect(page.locator('#overlay-score')).toHaveText(/\d{4,}/);
  await expect(page.locator('#overlay-best')).toHaveText(/\d{4,}/);
  await expect(page.getByRole('button', { name: '다시 플레이' })).toBeVisible();
});

test.describe('모바일 화면', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('가로 넘침 없이 집중 모드를 표시한다', async ({ page }) => {
    expect(await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: '게임 크게 보기' }).click();

    const focusLayout = await page.evaluate(() => {
      const consoleRect = document.querySelector('#console').getBoundingClientRect();
      const screenRect = document.querySelector('#screen').getBoundingClientRect();
      return {
        consoleWidth: Math.round(consoleRect.width),
        screenRatio: screenRect.width / screenRect.height,
        tipVisible: getComputedStyle(document.querySelector('.focus-tip')).display !== 'none',
        overflow: document.body.scrollWidth > window.innerWidth,
      };
    });

    expect(focusLayout.consoleWidth).toBe(390);
    expect(focusLayout.screenRatio).toBeCloseTo(2, 1);
    expect(focusLayout.tipVisible).toBe(true);
    expect(focusLayout.overflow).toBe(false);
  });
});
