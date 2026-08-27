import './styles/global.css';
import './styles/game.css';

import { createCanvasSurface } from './core/canvas.js';
import { createGameLoop } from './core/gameLoop.js';
import { createInputManager } from './core/input.js';
import { createSoundManager } from './core/sound.js';
import { getBestScore, saveBestScore } from './core/storage.js';
import { games, gamesById } from './games/index.js';

const GAME_WIDTH = 720;
const GAME_HEIGHT = 360;

function requiredElement(selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`필수 UI 요소를 찾을 수 없습니다: ${selector}`);
  return element;
}

function createArcadeApp() {
  const canvas = requiredElement('#game');
  const consoleElement = requiredElement('#console');
  const overlay = requiredElement('#overlay');
  const overlayKicker = requiredElement('#overlay-kicker');
  const overlayTitle = requiredElement('#overlay-title');
  const overlayCopy = requiredElement('#overlay-copy');
  const overlayScore = requiredElement('#overlay-score');
  const overlayAction = requiredElement('#overlay-action');
  const scoreElement = requiredElement('#live-score');
  const gameNameElement = requiredElement('#game-name');
  const hintElement = requiredElement('#hint');
  const pauseButton = requiredElement('#pause');
  const restartButton = requiredElement('#restart');
  const muteButton = requiredElement('#mute');
  const playNowButton = requiredElement('#play-now');
  const announcer = requiredElement('#announcer');
  const gameCards = [...document.querySelectorAll('[data-game]')];
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

  function showOverlay({ kicker, title, copy, action, showScore = false }) {
    overlayKicker.textContent = kicker;
    overlayTitle.textContent = title;
    overlayCopy.textContent = copy;
    overlayScore.hidden = !showScore;
    if (showScore) overlayScore.textContent = Math.floor(score);
    overlayAction.textContent = action;
    overlay.classList.remove('hidden');
  }

  function showReady() {
    showOverlay({
      kicker: activeDefinition.kicker,
      title: activeDefinition.title,
      copy: activeDefinition.copy,
      action: '게임 시작',
    });
    updatePauseButton();
  }

  function endGame(message, finalScore = score) {
    if (status === 'gameover') return;

    setScore(finalScore);
    status = 'gameover';
    loop.stop();
    input.setGameplayActive(false);
    const bestScore = saveBestScore(activeDefinition.id, score);
    refreshBestScores();
    showOverlay({
      kicker: `GAME OVER / BEST ${String(bestScore).padStart(4, '0')}`,
      title: message,
      copy: '이번 점수를 저장했어요. 한 번 더 도전해볼까요?',
      action: '다시 플레이',
      showScore: true,
    });
    sound.tone(110, 0.25, 'sawtooth');
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
    loop.stop();
    input.setGameplayActive(false);
    setScore(0);
    activeGame.init();
    activeGame.render();
  }

  function startGame() {
    if (status === 'playing') return;

    if (status !== 'paused') resetActiveGame();
    status = 'playing';
    overlay.classList.add('hidden');
    updatePauseButton();
    input.setGameplayActive(true);
    sound.tone(420, 0.09);
    loop.start();
    announce(`${activeDefinition.title} 시작`);
  }

  function pauseGame() {
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
    status = 'ready';
    resetActiveGame();
    showReady();
    sound.tone(280, 0.05);
    announce(`${activeDefinition.title} 다시 준비`);
  }

  function selectGame(gameId, { scroll = true } = {}) {
    const nextDefinition = gamesById.get(gameId);
    if (!nextDefinition) return;

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
    announce(`${activeDefinition.title} 선택`);
  }

  function handlePointerDown(event) {
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
      input.onPress('pause', pauseGame),
      input.onPress('restart', restartGame),
      input.onPress('game1', () => selectGame(games[0].id)),
      input.onPress('game2', () => selectGame(games[1].id)),
      input.onPress('game3', () => selectGame(games[2].id)),
    );
  }

  canvas.addEventListener('pointerdown', handlePointerDown, { signal });
  overlayAction.addEventListener('click', startGame, { signal });
  pauseButton.addEventListener('click', pauseGame, { signal });
  restartButton.addEventListener('click', restartGame, { signal });
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
      if (document.hidden && status === 'playing') pauseGame();
    },
    { signal },
  );
  window.addEventListener(
    'resize',
    () => {
      if (surface.resize()) activeGame?.render();
    },
    { signal },
  );

  bindInput();
  updateMuteButton();
  refreshBestScores();
  selectGame(games[0].id, { scroll: false });

  return {
    destroy() {
      window.clearTimeout(playNowTimer);
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
