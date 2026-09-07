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
  await expect(page.locator('[data-game]')).toHaveCount(4);
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
  await page.locator('#game').press('Escape');
  await expect(page.locator('body')).not.toHaveClass(/game-focus-mode/);
});

test('공통 게임 설정을 저장하고 기본값으로 복원한다', async ({ page }) => {
  await page.getByRole('button', { name: '설정' }).click();
  await expect(page.getByRole('dialog', { name: '게임 설정' })).toBeVisible();

  await page.locator('#setting-high-contrast').check();
  await page.locator('#setting-touch-size').selectOption('large');
  await page.locator('#setting-particles').selectOption('off');
  await expect(page.locator('body')).toHaveClass(/high-contrast/);
  await expect(page.locator('body')).toHaveClass(/touch-large/);

  const storedSettings = await page.evaluate(() => JSON.parse(localStorage.getItem('dolldom-settings')));
  expect(storedSettings).toMatchObject({
    highContrast: true,
    touchSize: 'large',
    particles: 'off',
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
  for (const gameId of ['memory', 'sweeper', 'memory', 'sweeper']) {
    await page.locator(`[data-game="${gameId}"]`).click();
  }
  await expect(page.locator('[data-game][aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator('[data-game="sweeper"]')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('네온 블록 탈출은 마우스 드래그로 첫 스테이지를 해결한다', async ({ page }) => {
  await page.locator('[data-game="gridlock"]').click();
  await expect(page.locator('#game-name')).toHaveText('NEON GRIDLOCK');
  await page.getByRole('button', { name: '게임 시작', exact: true }).click();
  await expect(page.locator('#overlay')).toHaveClass(/hidden/, { timeout: 3_000 });

  const canvas = page.locator('#game');
  const box = await canvas.boundingBox();
  const point = (x, y) => ({
    x: box.x + (x / 720) * box.width,
    y: box.y + (y / 360) * box.height,
  });

  await page.mouse.move(...Object.values(point(205, 103)));
  await page.mouse.down();
  await page.mouse.move(...Object.values(point(205, 53)), { steps: 4 });
  await page.mouse.up();
  await page.mouse.move(...Object.values(point(80, 153)));
  await page.mouse.down();
  await page.mouse.move(...Object.values(point(280, 153)), { steps: 8 });
  await page.mouse.up();

  await expect(page.locator('#live-score')).toHaveText('SCORE 0500');
});

test('네온 테더는 Space 누르기와 놓기 입력으로 실행된다', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.locator('[data-game="tether"]').click();
  await expect(page.locator('#game-name')).toHaveText('NEON TETHER');
  await expect(page.locator('[data-difficulty="stage-1"]')).toBeEnabled();
  await expect(page.locator('[data-difficulty="stage-2"]')).toBeDisabled();
  await page.getByRole('button', { name: '게임 시작', exact: true }).click();
  await expect(page.locator('#overlay')).toHaveClass(/hidden/, { timeout: 3_000 });
  await page.keyboard.down('Space');
  await page.waitForTimeout(180);
  await page.keyboard.up('Space');
  await page.waitForTimeout(180);
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

test('심해 로그 연습 모드는 시간 무제한이며 진행 데이터를 만들지 않는다', async ({ page }) => {
  await page.locator('[data-game="sweeper"]').click();
  const practiceMode = page.getByRole('button', { name: /연습 모드/ });
  const normalMode = page.getByRole('button', { name: /일반 모드/ });
  await expect(normalMode).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '이지', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '미디움', exact: true }).click();
  await expect(page.getByRole('button', { name: '미디움', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await practiceMode.click();
  await expect(practiceMode).toHaveAttribute('aria-pressed', 'true');
  await expect(normalMode).toHaveAttribute('aria-pressed', 'false');

  await page.getByRole('button', { name: '게임 시작', exact: true }).click();
  await expect(page.locator('#overlay')).toHaveClass(/hidden/, { timeout: 3_000 });
  expect(await page.evaluate(() => localStorage.getItem('dolldom-progress'))).toBeNull();
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
    await page.locator('[data-game="sweeper"]').click();
    await page.getByRole('button', { name: '게임 시작', exact: true }).click();
    await expect(page.locator('#overlay')).toHaveClass(/hidden/, { timeout: 3_000 });
    await expect(page.locator('#touch-controls')).toHaveAttribute('data-layout', 'dpad-guides');
    await expect(page.getByRole('button', { name: '액션' })).toBeVisible();
    await expect(page.getByRole('button', { name: '깃발 표시' })).toBeVisible();
    await expect(page.getByRole('button', { name: '주변 범위 표시 켜기 또는 끄기' })).toBeVisible();
    const actionButton = page.getByRole('button', { name: '액션' });
    await expect(actionButton).toHaveCSS('height', '74px');
    expect(await actionButton.evaluate((button) => getComputedStyle(button, '::after').content)).toBe('"조사"');

    await page.locator('[data-game="tether"]').click();
    await expect(page.locator('[data-difficulty^="stage-"]')).toHaveCount(12);
    const stagePickerFits = await page.evaluate(() => {
      const screen = document.querySelector('#screen').getBoundingClientRect();
      const card = document.querySelector('.overlay-card').getBoundingClientRect();
      return card.top >= screen.top && card.bottom <= screen.bottom;
    });
    expect(stagePickerFits).toBe(true);
    await page.getByRole('button', { name: '게임 시작', exact: true }).click();
    await expect(page.locator('#overlay')).toHaveClass(/hidden/, { timeout: 3_000 });
    await expect(page.locator('#touch-controls')).toHaveAttribute('data-layout', 'action');
    await expect(page.getByRole('button', { name: '액션' })).toBeVisible();
  });
});

test('PWA 매니페스트와 아이콘이 준비된다', async ({ page, request }) => {
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
});
