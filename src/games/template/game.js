import { drawBackdrop, palette } from '../shared/rendering.js';

// Copy this folder, rename the export, and register it in ../index.js.
export const templateGame = {
  id: 'template',
  name: 'TEMPLATE GAME',
  title: '새 미니게임',
  kicker: 'GAME 00 / NEW',
  copy: '게임의 목표와 핵심 조작을 한 문장으로 설명하세요.',
  hint: 'SPACE / TAP — 액션',
  card: {
    badge: 'NEW · ACTION',
    icon: '◆',
    theme: 'one',
    summary: '게임 카드에 표시할 설명',
    difficulty: '보통',
    estimatedTime: '1~2분',
    controls: 'SPACE / TAP',
  },

  create({ context, width, height, onScore, onEnd, sound }) {
    let elapsedTime = 0;
    let score = 0;

    function init() {
      elapsedTime = 0;
      score = 0;
      onScore(score);
    }

    function update(deltaTime) {
      elapsedTime += deltaTime;
      score = Math.floor(elapsedTime * 10);
      onScore(score);

      // Example: if (gameOver) onEnd('게임 종료 메시지', score);
      void onEnd;
    }

    function render() {
      drawBackdrop(context, width, height);
      context.fillStyle = palette.lime;
      context.fillRect(width / 2 - 18, height / 2 - 18, 36, 36);
    }

    function onAction(action) {
      if (action !== 'action') return;
      sound.play('catch');
    }

    function onPointerDown() {
      onAction('action');
    }

    function destroy() {
      // Clear game-owned timers, resources, and dynamic state here.
    }

    return { init, update, render, onAction, onPointerDown, destroy };
  },
};
