import { createCanvasSurface } from './core/canvas.js';
import { createGameLoop } from './core/gameLoop.js';
import { createInputManager } from './core/input.js';
import { createSoundManager } from './core/sound.js';
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
  const gameCards = [...document.querySelectorAll('[data-game]')];
  const focusBackgroundElements = [
    document.querySelector('.topbar'),
    document.querySelector('.hero-copy'),
    document.querySelector('#arcade'),
    document.querySelector('.tips'),
    document.querySelector('.footer'),
  ].filter(Boolean);
  const abortController = new AbortController();
  const { signal } = abortController;

  const surface = createCanvasSurface(canvas, {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  });
  const input = createInputManager();
  const sound = createSoundManager();
  const removeInputListeners = [];

  let activeDefinition = games[0];
  let activeGame = null;
  let status = 'ready';
  let score = 0;
  let displayedScore = null;
  let playNowTimer = 0;
  let countdownTimer = 0;
  let resizeFrameId = 0;
  let focusMode = false;
  let guideSeen = hasSeenGuide();

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
    countdown = false,
  }) {
    overlayKicker.textContent = kicker;
    overlayTitle.textContent = title;
    overlayTitle.classList.toggle('countdown-number', countdown);
    overlayCopy.textContent = copy;
    resultStats.hidden = !showResults;
    quickGuide.hidden = !showGuide;
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
    });
    updatePauseButton();
  }

  function endGame(message, finalScore = score) {
    if (status === 'gameover') return;

    setScore(finalScore);
    status = 'gameover';
    clearCountdown();
    loop.stop();
    input.setGameplayActive(false);
    const bestScore = saveBestScore(activeDefinition.id, score);
    refreshBestScores();
    showOverlay({
      kicker: 'GAME OVER / RECORD SAVED',
      title: message,
      copy: '이번 점수를 저장했어요. 한 번 더 도전해볼까요?',
      action: '다시 플레이',
      showResults: true,
      bestScore,
    });
    sound.play(message.includes('복구') ? 'success' : 'gameOver');
    announce(`게임 종료, 점수 ${Math.floor(score)}`);
  }

  function createActiveGame() {
    activeGame?.destroy?.();
    activeGame = activeDefinition.create({
      context: surface.context,
      width: surface.width,
      height: surface.height,
      input,
      sound,
      onScore: setScore,
      onEnd: endGame,
    });
  }

  function resetActiveGame() {
    clearCountdown();
    loop.stop();
    input.setGameplayActive(false);
    setScore(0);
    activeGame.init();
    activeGame.render();
  }

  function beginPlaying() {
    status = 'playing';
    overlay.classList.add('hidden');
    updatePauseButton();
    input.setGameplayActive(true);
    sound.play('start');
    loop.start();
    canvas.focus({ preventScroll: true });
    announce(`${activeDefinition.title} 시작`);
  }

  function runCountdown(value = 3) {
    status = 'countdown';
    input.setGameplayActive(true);
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
      else beginPlaying();
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
      showReady();
      announce('게임 시작 취소');
      return;
    }

    if (status === 'playing') {
      status = 'paused';
      loop.stop();
      input.setGameplayActive(false);
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
    activeDefinition = nextDefinition;
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
    showReady();

    if (scroll) consoleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (scroll) sound.play('select');
    announce(`${activeDefinition.title} 선택`);
  }

  function handlePointerDown(event) {
    if (event.isPrimary === false) return;
    event.preventDefault();
    if (status === 'ready' || status === 'gameover') {
      startGame();
      return;
    }
    if (status !== 'playing') return;

    const point = surface.toCanvasPoint(event);
    activeGame.onPointerDown?.(point.x, point.y);
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
  selectGame(games[0].id, { scroll: false });

  return {
    destroy() {
      window.clearTimeout(playNowTimer);
      clearCountdown();
      window.cancelAnimationFrame(resizeFrameId);
      setFocusMode(false, { restoreFocus: false });
      loop.stop();
      activeGame?.destroy?.();
      removeInputListeners.forEach((removeListener) => removeListener());
      input.destroy();
      sound.destroy();
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
