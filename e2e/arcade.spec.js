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
  await expect(page.locator('[data-game]')).toHaveCount(5);
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
  await page.locator('[data-game="memory"]').click();
  await expect(page.locator('#quick-guide')).toBeVisible();
  await page.getByRole('button', { name: '게임 시작', exact: true }).click();
  await expect(page.locator('#overlay-title')).toHaveText(/^[123]$/);
  await expect(page.locator('#overlay')).toHaveClass(/hidden/, { timeout: 3_000 });
  await expect(page.locator('#game')).toBeFocused();

  await page.getByRole('button', { name: '일시정지' }).click();
  await expect(page.locator('#overlay-title')).toHaveText('잠시 멈춤');
  await page.getByRole('button', { name: '계속하기', exact: true }).click();
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);

  await page.getByRole('button', { name: '다시 시작' }).click();
  await expect(page.locator('#overlay-title')).toHaveText('글리치 메모리');
  await expect(page.locator('#live-score')).toHaveText('SCORE 0000');
});

test('게임 선택, 음량 저장, 집중 모드가 동작한다', async ({ page }) => {
  await page.locator('[data-game="memory"]').click();
  await expect(page.locator('#game-name')).toHaveText('GLITCH MEMORY');
  await expect(page.locator('[data-game="memory"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#game')).toHaveAttribute('aria-label', '글리치 메모리 게임 화면');
  await expect(page.locator('#game')).toHaveAttribute('aria-keyshortcuts', /ArrowLeft/);
  await expect(page.locator('#game-description')).toContainText('4열 3행');

  await page.locator('#volume').fill('35');
  await page.locator('#volume').dispatchEvent('change');
  await expect(page.locator('#volume-value')).toHaveText('35%');
  expect(await page.evaluate(() => localStorage.getItem('dolldom-volume'))).toBe('0.35');

  await page.getByRole('button', { name: '게임 크게 보기' }).click();
  await expect(page.locator('body')).toHaveClass(/game-focus-mode/);
  await expect(page.locator('#arcade')).toHaveAttribute('inert', '');
  await expect(page.locator('.progress-panel')).toHaveAttribute('inert', '');
  await page.locator('#game').press('Escape');
  await expect(page.locator('body')).not.toHaveClass(/game-focus-mode/);
});

test('공통 게임 설정을 저장하고 기본값으로 복원한다', async ({ page }) => {
  await page.getByRole('button', { name: '설정' }).click();
  await expect(page.getByRole('dialog', { name: '게임 설정' })).toBeVisible();

  await page.locator('#setting-high-contrast').check();
  await page.locator('#setting-touch-size').selectOption('large');
  await page.locator('#setting-particles').selectOption('off');
  await page.locator('#setting-dodge-difficulty').selectOption('relaxed');
  await expect(page.locator('body')).toHaveClass(/high-contrast/);
  await expect(page.locator('body')).toHaveClass(/touch-large/);

  const storedSettings = await page.evaluate(() => JSON.parse(localStorage.getItem('dolldom-settings')));
  expect(storedSettings).toMatchObject({
    highContrast: true,
    touchSize: 'large',
    particles: 'off',
    dodgeDifficulty: 'relaxed',
  });

  await page.getByRole('button', { name: '기본값 복원' }).click();
  await expect(page.locator('body')).not.toHaveClass(/high-contrast/);
  await expect(page.locator('body')).not.toHaveClass(/touch-large/);
  await expect(page.locator('#setting-particles')).toHaveValue('full');
  await page.getByRole('button', { name: '완료' }).click();
  await expect(page.getByRole('dialog', { name: '게임 설정' })).not.toBeVisible();
});

test('반복적인 게임 전환 후에도 한 게임만 선택되고 오류가 발생하지 않는다', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const gameId of ['runner', 'memory', 'reaction', 'dodge', 'shooter', 'runner', 'shooter']) {
    await page.locator(`[data-game="${gameId}"]`).click();
  }
  await expect(page.locator('[data-game][aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator('[data-game="shooter"]')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('동작 줄이기 설정에서도 핵심 UI가 즉시 표시된다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  const transitionDuration = await page.locator('.game-overlay').evaluate(
    (element) => getComputedStyle(element).transitionDuration,
  );
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.001);
  await expect(page.getByRole('button', { name: '게임 시작', exact: true })).toBeVisible();
});

test('게임 종료 후 현재 점수와 최고 기록을 표시한다', async ({ page }) => {
  await page.locator('[data-game="reaction"]').click();
  await page.getByRole('button', { name: '게임 시작', exact: true }).click();

  await expect(page.locator('#overlay-title')).toHaveText('신호를 놓쳤어요!', { timeout: 18_000 });
  await expect(page.locator('#result-stats')).toBeVisible();
  await expect(page.locator('#overlay-score')).toHaveText(/\d{4,}/);
  await expect(page.locator('#overlay-best')).toHaveText(/\d{4,}/);
  await expect(page.getByRole('button', { name: '다시 플레이' })).toBeVisible();
  await expect(page.locator('#achievement-toast')).toBeVisible();
  await expect(page.locator('[data-game-stat="reaction"]')).toContainText('도전');
  await expect(page.locator('#recent-runs')).toContainText('블록 캐처');
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

  test('공통 터치 조작은 게임별로 필요한 버튼만 표시한다', async ({ page }) => {
    await page.locator('[data-game="dodge"]').click();
    await page.getByRole('button', { name: '게임 시작', exact: true }).click();
    await expect(page.locator('#overlay')).toHaveClass(/hidden/, { timeout: 3_000 });
    await expect(page.locator('#touch-controls')).toBeVisible();
    await expect(page.locator('#touch-controls')).toHaveAttribute('data-layout', 'dpad');
    await expect(page.getByRole('button', { name: '왼쪽 이동' })).toBeVisible();
    const targetSize = await page.getByRole('button', { name: '왼쪽 이동' }).evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return [rect.width, rect.height];
    });
    expect(targetSize[0]).toBeGreaterThanOrEqual(44);
    expect(targetSize[1]).toBeGreaterThanOrEqual(44);

    await page.locator('[data-game="shooter"]').click();
    await page.getByRole('button', { name: '게임 시작', exact: true }).click();
    await expect(page.locator('#overlay')).toHaveClass(/hidden/, { timeout: 3_000 });
    await expect(page.locator('#touch-controls')).toHaveAttribute('data-layout', 'dpad-action');
    await expect(page.getByRole('button', { name: '액션' })).toBeVisible();
  });
});

test('PWA 매니페스트와 로컬 진행 기록 UI가 준비된다', async ({ page, request }) => {
  const manifest = await request.get('./manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  const manifestData = await manifest.json();
  expect(manifestData.start_url).toBe('./');
  expect(manifestData.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: '192x192', purpose: 'any' }),
    expect.objectContaining({ sizes: '512x512', purpose: 'any' }),
    expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
  ]));
  for (const icon of manifestData.icons) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.ok()).toBe(true);
    expect(iconResponse.headers()['content-type']).toContain('image/png');
  }
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest/);
  await expect(page.locator('#total-plays')).toHaveText('0');
  await expect(page.locator('#achievements [data-achievement]')).toHaveCount(6);
  await expect(page.locator('[data-achievement="runner-1000"]')).toHaveClass(/locked/);
  await expect(page.locator('[data-achievement="runner-1000"]')).toContainText('1,000점을 달성');
  await expect(page.locator('#game-stat-list [data-game-stat]')).toHaveCount(5);
  await expect(page.locator('#recent-runs')).toContainText('아직 완료한 게임이 없습니다');
});

test('이전 버전의 로컬 기록을 유지하며 상세 통계로 전환한다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('dolldom-progress', JSON.stringify({
      version: 1,
      totalPlays: 3,
      totalCompleted: 2,
      totalScore: 1500,
      achievements: ['first-play'],
      games: {
        runner: { plays: 3, completed: 2, totalScore: 1500, bestRun: 1100, clears: 0 },
      },
    }));
  });
  await page.reload();

  await expect(page.locator('[data-game-stat="runner"]')).toContainText('750');
  await expect(page.locator('[data-achievement="first-play"]')).not.toHaveClass(/locked/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('dolldom-progress')).version)).toBe(2);
});
