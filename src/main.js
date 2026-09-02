import { createCanvasSurface } from './core/canvas.js';
import { createGameLoop } from './core/gameLoop.js';
import { createInputManager } from './core/input.js';
import { createProgressManager, achievementDefinitions } from './core/progress.js';
import { createPwaManager } from './core/pwa.js';
import { createSettingsManager } from './core/settings.js';
import { createSoundManager } from './core/sound.js';
import { createTouchControls } from './core/touchControls.js';
import { getBestScore, hasSeenGuide, saveBestScore, saveGuideSeen } from './core/storage.js';
import { games, gamesById } from './games/index.js';

const GAME_WIDTH = 720;
const GAME_HEIGHT = 360;
const COUNTDOWN_INTERVAL_MS = 650;

function requiredElement(selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`필수 UI 요소를 찾을 수 없습니다: ${selector}`);
  return element;
}

function createGameCard(definition, index) {
  const card = document.createElement('button');
  card.className = 'card';
  card.type = 'button';
  card.dataset.game = definition.id;
  card.setAttribute('aria-pressed', 'false');

  const thumbnail = document.createElement('div');
  thumbnail.className = `thumb ${definition.card.theme}`;
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = definition.card.badge;
  thumbnail.append(badge, document.createTextNode(definition.card.icon));

  const title = document.createElement('h3');
  title.textContent = definition.title;

  const meta = document.createElement('div');
  meta.className = 'meta';
  const summary = document.createElement('span');
  summary.textContent = definition.card.summary;
  const best = document.createElement('span');
  best.className = 'score';
  best.dataset.best = definition.id;
  best.textContent = 'BEST 0000';
  meta.append(summary, best);

  const facts = document.createElement('div');
  facts.className = 'game-facts';
  [`난이도 ${definition.card.difficulty}`, definition.card.estimatedTime, definition.card.controls]
    .forEach((fact) => {
      const item = document.createElement('span');
      item.textContent = fact;
      facts.append(item);
    });

  const shortcut = document.createElement('span');
  shortcut.className = 'shortcut';
  shortcut.textContent = index < 9 ? String(index + 1) : '';

  card.append(thumbnail, title, meta, facts, shortcut);
  return card;
}

function renderGameCards(container) {
  const fragment = document.createDocumentFragment();
  games.forEach((definition, index) => fragment.append(createGameCard(definition, index)));
  container.replaceChildren(fragment);
}

function createArcadeApp() {
  const gameList = requiredElement('#game-list');
  renderGameCards(gameList);
  const canvas = requiredElement('#game');
  const consoleElement = requiredElement('#console');
  const overlay = requiredElement('#overlay');
  const overlayKicker = requiredElement('#overlay-kicker');
  const overlayTitle = requiredElement('#overlay-title');
  const overlayCopy = requiredElement('#overlay-copy');
  const overlayScore = requiredElement('#overlay-score');
  const overlayBest = requiredElement('#overlay-best');
  const resultStats = requiredElement('#result-stats');
  const gameModes = requiredElement('#game-modes');
  const quickGuide = requiredElement('#quick-guide');
  const overlayAction = requiredElement('#overlay-action');
  const scoreElement = requiredElement('#live-score');
  const gameNameElement = requiredElement('#game-name');
  const hintElement = requiredElement('#hint');
  const pauseButton = requiredElement('#pause');
  const restartButton = requiredElement('#restart');
  const muteButton = requiredElement('#mute');
  const volumeInput = requiredElement('#volume');
  const volumeValue = requiredElement('#volume-value');
  const focusModeButton = requiredElement('#focus-mode');
  const playNowButton = requiredElement('#play-now');
  const announcer = requiredElement('#announcer');
  const touchControlsElement = requiredElement('#touch-controls');
  const totalPlaysElement = requiredElement('#total-plays');
  const totalScoreElement = requiredElement('#total-score');
  const achievementCountElement = requiredElement('#achievement-count');
  const achievementTotalElement = requiredElement('#achievement-total');
  const achievementsElement = requiredElement('#achievements');
  const gameStatList = requiredElement('#game-stat-list');
  const recentRunsElement = requiredElement('#recent-runs');
  const achievementToast = requiredElement('#achievement-toast');
  const achievementToastTitle = requiredElement('#achievement-toast-title');
  const resetRecordsButton = requiredElement('#reset-records');
  const gameDescription = requiredElement('#game-description');
  const settingsButton = requiredElement('#open-settings');
  const settingsDialog = requiredElement('#settings-dialog');
  const settingsForm = settingsDialog.querySelector('form');
  const resetSettingsButton = requiredElement('#reset-settings');
  const screenShakeInput = requiredElement('#setting-screen-shake');
  const particlesInput = requiredElement('#setting-particles');
  const highContrastInput = requiredElement('#setting-high-contrast');
  const touchSizeInput = requiredElement('#setting-touch-size');
  const dodgeDifficultyInput = requiredElement('#setting-dodge-difficulty');
  const gameCards = [...document.querySelectorAll('[data-game]')];
  const focusBackgroundElements = [
    document.querySelector('.topbar'),
    document.querySelector('.hero-copy'),
    document.querySelector('#arcade'),
    document.querySelector('.tips'),
    document.querySelector('.updates'),
    document.querySelector('.progress-panel'),
    document.querySelector('.footer'),
  ].filter(Boolean);
  const abortController = new AbortController();
  const { signal } = abortController;

  const surface = createCanvasSurface(canvas, {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  });
  const input = createInputManager();
  const touchControls = createTouchControls(touchControlsElement, input);
  const sound = createSoundManager();
  const progress = createProgressManager(games.map((game) => game.id));
  const settings = createSettingsManager();
  const pwa = createPwaManager({
    installButton: requiredElement('#install-app'),
    iosInstallDialog: requiredElement('#ios-install-dialog'),
    statusElement: requiredElement('#system-status'),
    notice: requiredElement('#app-notice'),
    noticeCopy: requiredElement('#app-notice-copy'),
    noticeAction: requiredElement('#app-notice-action'),
  });
  const removeInputListeners = [];

  let activeDefinition = games[0];
  let activeGame = null;
  let activeMode = null;
  let status = 'ready';
  let score = 0;
  let displayedScore = null;
  let playNowTimer = 0;
  let countdownTimer = 0;
  let resizeFrameId = 0;
  let achievementToastTimer = 0;
  let focusMode = false;
  let guideSeen = hasSeenGuide();

  function applySettings(snapshot) {
    document.body.classList.toggle('high-contrast', snapshot.highContrast);
    document.body.classList.toggle('touch-large', snapshot.touchSize === 'large');
  }

  function syncSettingsForm(snapshot = settings.getSnapshot()) {
    screenShakeInput.checked = snapshot.screenShake;
    particlesInput.value = snapshot.particles;
    highContrastInput.checked = snapshot.highContrast;
    touchSizeInput.value = snapshot.touchSize;
    dodgeDifficultyInput.value = snapshot.dodgeDifficulty;
  }

  const removeSettingsListener = settings.subscribe((snapshot) => {
    applySettings(snapshot);
    syncSettingsForm(snapshot);
  });
  applySettings(settings.getSnapshot());
  syncSettingsForm();

  const loop = createGameLoop({
    update(deltaTime) {
      activeGame?.update(deltaTime);
    },
    render() {
      activeGame?.render();
    },
  });

  function announce(message) {
    announcer.textContent = message;
  }

  function setScore(nextScore) {
    score = Number.isFinite(nextScore) ? Math.max(0, nextScore) : 0;
    const roundedScore = Math.floor(score);
    if (displayedScore === roundedScore) return;

    displayedScore = roundedScore;
    scoreElement.textContent = `SCORE ${String(roundedScore).padStart(4, '0')}`;
  }

  function refreshBestScores() {
    document.querySelectorAll('[data-best]').forEach((element) => {
      const bestScore = getBestScore(element.dataset.best);
      element.textContent = `BEST ${String(bestScore).padStart(4, '0')}`;
    });
  }

  function renderProgress() {
    const snapshot = progress.getSnapshot();
    totalPlaysElement.textContent = snapshot.totalPlays.toLocaleString('ko-KR');
    totalScoreElement.textContent = snapshot.totalScore.toLocaleString('ko-KR');
    achievementCountElement.textContent = String(snapshot.achievements.length);
    achievementTotalElement.textContent = String(achievementDefinitions.length);

    const statCards = games.map((definition) => {
      const stats = snapshot.games[definition.id];
      const card = document.createElement('article');
      card.className = 'game-stat';
      card.dataset.gameStat = definition.id;
      const title = document.createElement('strong');
      title.textContent = definition.title;
      const details = document.createElement('dl');
      const average = stats.completed ? Math.floor(stats.totalScore / stats.completed) : 0;
      const specialty = definition.id === 'memory'
        ? ['복구', stats.clears.toLocaleString('ko-KR')]
        : definition.id === 'dodge'
          ? ['최장', `${Math.floor(stats.bestRun / 20)}초`]
          : ['최고', stats.bestRun.toLocaleString('ko-KR')];
      [
        ['도전', stats.plays.toLocaleString('ko-KR')],
        ['평균', average.toLocaleString('ko-KR')],
        specialty,
      ].forEach(([label, value]) => {
        const group = document.createElement('div');
        const term = document.createElement('dt');
        const description = document.createElement('dd');
        term.textContent = label;
        description.textContent = value;
        group.append(term, description);
        details.append(group);
      });
      card.append(title, details);
      return card;
    });
    gameStatList.replaceChildren(...statCards);

    const recentRuns = snapshot.recentRuns.map((run) => {
      const definition = gamesById.get(run.gameId);
      const item = document.createElement('li');
      const title = document.createElement('strong');
      const score = document.createElement('span');
      const playedAt = document.createElement('time');
      title.textContent = definition?.title ?? run.gameId;
      score.textContent = `${run.score.toLocaleString('ko-KR')}점`;
      if (run.playedAt) {
        playedAt.dateTime = run.playedAt;
        playedAt.textContent = new Intl.DateTimeFormat('ko-KR', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(run.playedAt));
      } else {
        playedAt.textContent = '이전 기록';
      }
      item.append(title, score, playedAt);
      return item;
    });
    if (!recentRuns.length) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = '아직 완료한 게임이 없습니다.';
      recentRuns.push(empty);
    }
    recentRunsElement.replaceChildren(...recentRuns);

    const unlocked = new Set(snapshot.achievements);
    const items = achievementDefinitions.map((achievement) => {
      const item = document.createElement('li');
      const isUnlocked = unlocked.has(achievement.id);
      const achievementProgress = progress.getAchievementProgress(achievement);
      item.dataset.achievement = achievement.id;
      item.classList.toggle('locked', !isUnlocked);

      const heading = document.createElement('div');
      heading.className = 'achievement-name';
      const title = document.createElement('span');
      const value = document.createElement('span');
      title.textContent = `${isUnlocked ? '◆' : '◇'} ${achievement.title}`;
      if (achievement.id === 'dodge-1200') {
        value.textContent = `${Math.floor(achievementProgress.current / 20)} / 60초`;
      } else {
        value.textContent = `${achievementProgress.current.toLocaleString('ko-KR')} / ${achievementProgress.target.toLocaleString('ko-KR')}`;
      }
      heading.append(title, value);

      const description = document.createElement('p');
      description.className = 'achievement-description';
      description.textContent = isUnlocked ? '달성 완료!' : achievement.description;
      const meter = document.createElement('progress');
      meter.max = achievementProgress.target;
      meter.value = achievementProgress.current;
      meter.setAttribute('aria-label', `${achievement.title} 진행률 ${achievementProgress.percentage}%`);
      item.append(heading, description, meter);
      return item;
    });
    achievementsElement.replaceChildren(...items);
  }

  function announceAchievements(achievements) {
    if (!achievements.length) return false;
    const titles = achievements.map(({ title }) => title).join(', ');
    window.clearTimeout(achievementToastTimer);
    achievementToast.hidden = true;
    achievementToastTitle.textContent = titles;
    void achievementToast.offsetWidth;
    achievementToast.hidden = false;
    achievementToastTimer = window.setTimeout(() => {
      achievementToast.hidden = true;
    }, 3600);
    announce(`새 업적: ${titles}`);
    return true;
  }

  function updatePauseButton(paused = false) {
    pauseButton.textContent = paused ? '▶' : 'Ⅱ';
    pauseButton.setAttribute('aria-label', paused ? '게임 계속하기' : '일시정지');
    pauseButton.title = paused ? '게임 계속하기' : '일시정지';
  }

  function updateMuteButton() {
    muteButton.textContent = sound.muted ? '×' : '♪';
    muteButton.setAttribute('aria-label', sound.muted ? '소리 켜기' : '음소거');
    muteButton.title = sound.muted ? '소리 켜기' : '음소거';
  }

  function updateVolumeControl() {
    const percentage = Math.round(sound.volume * 100);
    volumeInput.value = String(percentage);
    volumeValue.textContent = `${percentage}%`;
    volumeInput.setAttribute('aria-valuetext', `${percentage}퍼센트`);
  }

  function clearCountdown() {
    window.clearTimeout(countdownTimer);
    countdownTimer = 0;
    overlayTitle.classList.remove('countdown-number');
  }

  function requestSurfaceResize() {
    window.cancelAnimationFrame(resizeFrameId);
    resizeFrameId = window.requestAnimationFrame(() => {
      resizeFrameId = 0;
      if (surface.resize()) activeGame?.render();
    });
  }

  function setFocusMode(enabled, { restoreFocus = true } = {}) {
    if (focusMode === enabled) return;

    focusMode = enabled;
    document.body.classList.toggle('game-focus-mode', enabled);
    consoleElement.classList.toggle('focus-mode', enabled);
    focusModeButton.textContent = enabled ? '×' : '⛶';
    focusModeButton.setAttribute('aria-pressed', String(enabled));
    focusModeButton.setAttribute('aria-label', enabled ? '크게 보기 닫기' : '게임 크게 보기');
    focusModeButton.title = enabled ? '크게 보기 닫기' : '게임 크게 보기';

    focusBackgroundElements.forEach((element) => {
      element.toggleAttribute('inert', enabled);
      if (enabled) element.setAttribute('aria-hidden', 'true');
      else element.removeAttribute('aria-hidden');
    });

    if (enabled) {
      canvas.focus({ preventScroll: true });
      announce('게임 크게 보기 켜짐. ESC 키로 닫을 수 있습니다.');
    } else {
      if (restoreFocus) focusModeButton.focus({ preventScroll: true });
      announce('게임 크게 보기 꺼짐');
    }

    requestSurfaceResize();
  }

  function showOverlay({
    kicker,
    title,
    copy,
    action = null,
    showResults = false,
    bestScore = 0,
    showGuide = false,
    showModes = false,
    countdown = false,
  }) {
    overlayKicker.textContent = kicker;
    overlayTitle.textContent = title;
    overlayTitle.classList.toggle('countdown-number', countdown);
    overlayCopy.textContent = copy;
    resultStats.hidden = !showResults;
    quickGuide.hidden = !showGuide;
    gameModes.hidden = !showModes || !activeDefinition.modes?.length;
    if (showResults) {
      overlayScore.textContent = String(Math.floor(score)).padStart(4, '0');
      overlayBest.textContent = String(bestScore).padStart(4, '0');
    }
    overlayAction.hidden = !action;
    if (action) overlayAction.textContent = action;
    overlay.classList.remove('hidden');
  }

  function showReady() {
    showOverlay({
      kicker: activeDefinition.kicker,
      title: activeDefinition.title,
      copy: activeDefinition.copy,
      action: '게임 시작',
      showGuide: !guideSeen,
      showModes: true,
    });
    updatePauseButton();
  }

  function getActiveMode() {
    return activeDefinition.modes?.find((mode) => mode.id === activeMode) ?? null;
  }

  function syncModeButtons() {
    gameModes.querySelectorAll('[data-mode]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.mode === activeMode));
    });
  }

  function selectMode(modeId) {
    if (!activeDefinition.modes?.some((mode) => mode.id === modeId)) return;
    activeMode = modeId;
    syncModeButtons();
    resetActiveGame();
    showReady();
    sound.play('select');
    announce(`${getActiveMode()?.label ?? modeId} 선택`);
  }

  function renderModeButtons() {
    const buttons = (activeDefinition.modes ?? []).map((mode) => {
      const button = document.createElement('button');
      button.className = 'game-mode';
      button.type = 'button';
      button.dataset.mode = mode.id;
      button.setAttribute('aria-pressed', String(mode.id === activeMode));
      const label = document.createElement('strong');
      const description = document.createElement('span');
      label.textContent = mode.label;
      description.textContent = mode.description;
      button.append(label, description);
      button.addEventListener('click', () => selectMode(mode.id), { signal });
      return button;
    });
    gameModes.replaceChildren(...buttons);
  }

  function endGame(message, finalScore = score) {
    if (status === 'gameover') return;

    setScore(finalScore);
    status = 'gameover';
    clearCountdown();
    loop.stop();
    input.setGameplayActive(false);
    touchControls.setEnabled(false);
    const shouldRecord = getActiveMode()?.record !== false;
    const bestScore = shouldRecord
      ? saveBestScore(activeDefinition.id, score)
      : getBestScore(activeDefinition.id);
    const newAchievements = shouldRecord
      ? progress.recordEnd(activeDefinition.id, score, message)
      : [];
    if (shouldRecord) {
      refreshBestScores();
      renderProgress();
    }
    showOverlay({
      kicker: shouldRecord ? 'GAME OVER / RECORD SAVED' : 'PRACTICE COMPLETE / NOT RECORDED',
      title: message,
      copy: shouldRecord
        ? '이번 점수를 저장했어요. 한 번 더 도전해볼까요?'
        : '연습 기록은 저장되지 않아요. 준비되면 일반 모드에 도전하세요.',
      action: '다시 플레이',
      showResults: true,
      bestScore,
    });
    sound.play(message.includes('복구') ? 'success' : 'gameOver');
    announceAchievements(newAchievements);
    if (!newAchievements.length) {
      announce(`${shouldRecord ? '게임' : '연습'} 종료, 점수 ${Math.floor(score)}`);
    }
  }

  function createActiveGame() {
    activeGame?.destroy?.();
    activeGame = activeDefinition.create({
      context: surface.context,
      width: surface.width,
      height: surface.height,
      input,
      sound,
      settings,
      getMode: () => activeMode,
      onScore: setScore,
      onEnd: endGame,
    });
  }

  function resetActiveGame() {
    clearCountdown();
    loop.stop();
    input.setGameplayActive(false);
    touchControls.setEnabled(false);
    setScore(0);
    activeGame.init();
    activeGame.render();
  }

  function beginPlaying({ recordStart = false } = {}) {
    status = 'playing';
    overlay.classList.add('hidden');
    updatePauseButton();
    input.setGameplayActive(true);
    touchControls.setEnabled(true);
    let achievementUnlocked = false;
    if (recordStart && getActiveMode()?.record !== false) {
      const newAchievements = progress.recordStart(activeDefinition.id);
      renderProgress();
      achievementUnlocked = announceAchievements(newAchievements);
      if (achievementUnlocked) {
        sound.play('success');
      }
    }
    sound.play('start');
    loop.start();
    canvas.focus({ preventScroll: true });
    if (!achievementUnlocked) announce(`${activeDefinition.title} 시작`);
  }

  function runCountdown(value = 3) {
    status = 'countdown';
    input.setGameplayActive(true);
    touchControls.setEnabled(false);
    showOverlay({
      kicker: 'GET READY',
      title: String(value),
      copy: `${activeDefinition.title} 신호에 맞춰 시작하세요.`,
      countdown: true,
    });
    sound.tone(340 + value * 70, 0.05, 'square');
    announce(`${value}`);

    countdownTimer = window.setTimeout(() => {
      if (status !== 'countdown') return;
      if (value > 1) runCountdown(value - 1);
      else beginPlaying({ recordStart: true });
    }, COUNTDOWN_INTERVAL_MS);
  }

  function startGame() {
    if (status === 'playing' || status === 'countdown') return;

    if (status === 'paused') {
      beginPlaying();
      return;
    }

    resetActiveGame();
    if (!guideSeen) {
      guideSeen = true;
      saveGuideSeen();
    }
    runCountdown();
  }

  function pauseGame() {
    if (status === 'countdown') {
      clearCountdown();
      status = 'ready';
      input.setGameplayActive(false);
      touchControls.setEnabled(false);
      showReady();
      announce('게임 시작 취소');
      return;
    }

    if (status === 'playing') {
      status = 'paused';
      loop.stop();
      input.setGameplayActive(false);
      touchControls.setEnabled(false);
      showOverlay({
        kicker: 'PAUSED',
        title: '잠시 멈춤',
        copy: '준비되면 계속하세요.',
        action: '계속하기',
      });
      updatePauseButton(true);
      announce('게임 일시정지');
      return;
    }

    if (status === 'paused') startGame();
  }

  function restartGame() {
    clearCountdown();
    status = 'ready';
    resetActiveGame();
    showReady();
    sound.play('restart');
    announce(`${activeDefinition.title} 다시 준비`);
  }

  function selectGame(gameId, { scroll = true } = {}) {
    const nextDefinition = gamesById.get(gameId);
    if (!nextDefinition) return;

    clearCountdown();
    loop.stop();
    input.setGameplayActive(false);
    touchControls.setEnabled(false);
    activeDefinition = nextDefinition;
    activeMode = activeDefinition.defaultMode
      ?? activeDefinition.modes?.[0]?.id
      ?? null;
    renderModeButtons();
    touchControls.setActions(activeDefinition.touchControls ?? []);
    status = 'ready';
    createActiveGame();
    resetActiveGame();

    gameCards.forEach((card) => {
      const selected = card.dataset.game === gameId;
      card.classList.toggle('active', selected);
      card.setAttribute('aria-pressed', String(selected));
    });
    gameNameElement.textContent = activeDefinition.name;
    hintElement.textContent = activeDefinition.hint;
    gameDescription.textContent = activeDefinition.accessibility;
    canvas.setAttribute('aria-label', `${activeDefinition.title} 게임 화면`);
    canvas.setAttribute('aria-keyshortcuts', activeDefinition.ariaKeyShortcuts);
    showReady();

    if (scroll) consoleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (scroll) sound.play('select');
    announce(`${activeDefinition.title} 선택`);
  }

  function handlePointerDown(event) {
    if (event.isPrimary === false) return;
    event.preventDefault();
    const secondaryAction = event.button === 2;
    if (status === 'ready' || status === 'gameover') {
      if (!secondaryAction) startGame();
      return;
    }
    if (status !== 'playing') return;

    const point = surface.toCanvasPoint(event);
    activeGame.onPointerDown?.(point.x, point.y, {
      button: event.button,
      pointerType: event.pointerType,
    });
  }

  function bindInput() {
    ['left', 'right', 'up', 'down'].forEach((action) => {
      removeInputListeners.push(
        input.onPress(action, () => {
          if (status === 'playing') activeGame.onAction?.(action);
        }),
      );
    });

    removeInputListeners.push(
      input.onPress('action', () => {
        if (status === 'ready' || status === 'gameover') {
          startGame();
        } else if (status === 'playing') {
          activeGame.onAction?.('action');
        }
      }),
      input.onPress('mark', () => {
        if (status === 'playing') activeGame.onAction?.('mark');
      }),
      input.onPress('guide', () => {
        if (status === 'playing') activeGame.onAction?.('guide');
      }),
      input.onPress('pause', (event) => {
        if (event.code === 'Escape' && focusMode) setFocusMode(false);
        pauseGame();
      }),
      input.onPress('restart', restartGame),
    );

    games.slice(0, 9).forEach((game, index) => {
      removeInputListeners.push(input.onPress(`game${index + 1}`, () => selectGame(game.id)));
    });
  }

  canvas.addEventListener('pointerdown', handlePointerDown, { signal });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });
  overlayAction.addEventListener('click', startGame, { signal });
  pauseButton.addEventListener('click', pauseGame, { signal });
  restartButton.addEventListener('click', restartGame, { signal });
  focusModeButton.addEventListener('click', () => setFocusMode(!focusMode), { signal });
  volumeInput.addEventListener(
    'input',
    () => {
      sound.setVolume(Number(volumeInput.value) / 100);
      updateVolumeControl();
    },
    { signal },
  );
  volumeInput.addEventListener(
    'change',
    () => {
      sound.play('select');
      announce(`효과음 음량 ${volumeValue.textContent}`);
    },
    { signal },
  );
  muteButton.addEventListener(
    'click',
    () => {
      const muted = sound.toggleMuted();
      updateMuteButton();
      announce(muted ? '소리 꺼짐' : '소리 켜짐');
    },
    { signal },
  );
  resetRecordsButton.addEventListener(
    'click',
    () => {
      if (!window.confirm('모든 게임의 최고 기록, 통계, 업적을 초기화할까요?')) return;
      progress.reset();
      refreshBestScores();
      renderProgress();
      announce('모든 로컬 게임 기록을 초기화했습니다.');
    },
    { signal },
  );
  settingsButton.addEventListener(
    'click',
    () => {
      if (status === 'playing' || status === 'countdown') pauseGame();
      syncSettingsForm();
      settingsDialog.showModal();
    },
    { signal },
  );
  settingsForm.addEventListener(
    'change',
    (event) => {
      const control = event.target;
      if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) return;
      const value = control.type === 'checkbox' ? control.checked : control.value;
      settings.update({ [control.name]: value });
      announce('게임 설정을 저장했습니다.');
    },
    { signal },
  );
  resetSettingsButton.addEventListener(
    'click',
    () => {
      settings.reset();
      announce('게임 설정을 기본값으로 복원했습니다.');
    },
    { signal },
  );
  playNowButton.addEventListener(
    'click',
    () => {
      window.clearTimeout(playNowTimer);
      playNowTimer = window.setTimeout(() => {
        if (status === 'ready') startGame();
      }, 450);
    },
    { signal },
  );
  gameCards.forEach((card) => {
    card.addEventListener('click', () => selectGame(card.dataset.game), { signal });
  });
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden && (status === 'playing' || status === 'countdown')) pauseGame();
    },
    { signal },
  );
  window.addEventListener(
    'resize',
    () => {
      requestSurfaceResize();
    },
    { signal },
  );

  bindInput();
  updateMuteButton();
  updateVolumeControl();
  refreshBestScores();
  renderProgress();
  selectGame(games[0].id, { scroll: false });

  return {
    destroy() {
      window.clearTimeout(playNowTimer);
      window.clearTimeout(achievementToastTimer);
      clearCountdown();
      window.cancelAnimationFrame(resizeFrameId);
      setFocusMode(false, { restoreFocus: false });
      loop.stop();
      activeGame?.destroy?.();
      touchControls.destroy();
      removeInputListeners.forEach((removeListener) => removeListener());
      input.destroy();
      sound.destroy();
      removeSettingsListener();
      settings.destroy();
      pwa.destroy();
      abortController.abort();
    },
  };
}

const arcadeApp = createArcadeApp();
window.addEventListener(
  'pagehide',
  (event) => {
    if (!event.persisted) arcadeApp.destroy();
  },
  { once: true },
);
