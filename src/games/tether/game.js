import { drawBackdrop, drawRoundRect, palette } from '../shared/rendering.js';

const PLAYER_RADIUS = 12;
const GRAVITY = 760;
const FORWARD_ACCELERATION = 34;
const MAX_ROPE_LENGTH = 235;
const MAX_SPEED = 720;
const FINISH_X = 684;

export const TETHER_LEVELS = Object.freeze([
  {
    start: { x: 62, y: 270, velocityX: 155, velocityY: -350 },
    anchors: [{ x: 200, y: 105 }, { x: 420, y: 112 }],
    pads: [{ x: 18, y: 318, width: 125 }, { x: 548, y: 318, width: 130 }],
  },
  {
    start: { x: 58, y: 255, velocityX: 165, velocityY: -380 },
    anchors: [{ x: 178, y: 82 }, { x: 350, y: 150 }, { x: 530, y: 78 }],
    pads: [{ x: 18, y: 318, width: 105 }, { x: 292, y: 300, width: 82 }, { x: 580, y: 318, width: 100 }],
  },
  {
    start: { x: 62, y: 272, velocityX: 175, velocityY: -410 },
    anchors: [{ x: 210, y: 165 }, { x: 375, y: 62 }, { x: 545, y: 165 }],
    pads: [{ x: 18, y: 318, width: 110 }, { x: 300, y: 318, width: 75 }, { x: 595, y: 318, width: 82 }],
  },
  {
    start: { x: 54, y: 245, velocityX: 185, velocityY: -390 },
    anchors: [{ x: 160, y: 70 }, { x: 315, y: 178 }, { x: 465, y: 68 }, { x: 585, y: 170 }],
    pads: [{ x: 14, y: 314, width: 95 }, { x: 250, y: 300, width: 70 }, { x: 610, y: 314, width: 65 }],
  },
  {
    start: { x: 58, y: 260, velocityX: 190, velocityY: -430 },
    anchors: [{ x: 185, y: 150 }, { x: 315, y: 55 }, { x: 445, y: 155 }, { x: 565, y: 70 }],
    pads: [{ x: 15, y: 318, width: 105 }, { x: 350, y: 318, width: 62 }, { x: 612, y: 318, width: 64 }],
  },
  {
    start: { x: 56, y: 250, velocityX: 200, velocityY: -430 },
    anchors: [{ x: 155, y: 62 }, { x: 285, y: 175 }, { x: 410, y: 54 }, { x: 525, y: 175 }, { x: 625, y: 72 }],
    pads: [{ x: 14, y: 316, width: 92 }, { x: 220, y: 316, width: 55 }, { x: 450, y: 316, width: 55 }, { x: 630, y: 316, width: 48 }],
  },
  {
    start: { x: 54, y: 262, velocityX: 205, velocityY: -440 },
    anchors: [{ x: 145, y: 145 }, { x: 270, y: 58 }, { x: 390, y: 172 }, { x: 510, y: 72 }, { x: 625, y: 150 }],
    pads: [{ x: 12, y: 318, width: 88 }, { x: 330, y: 310, width: 52 }, { x: 640, y: 318, width: 38 }],
  },
  {
    start: { x: 52, y: 252, velocityX: 210, velocityY: -445 },
    anchors: [{ x: 132, y: 64 }, { x: 252, y: 166 }, { x: 372, y: 62 }, { x: 492, y: 170 }, { x: 612, y: 66 }],
    pads: [{ x: 12, y: 316, width: 84 }, { x: 286, y: 316, width: 48 }, { x: 600, y: 316, width: 70 }],
  },
  {
    start: { x: 50, y: 260, velocityX: 215, velocityY: -450 },
    anchors: [{ x: 138, y: 172 }, { x: 242, y: 56 }, { x: 350, y: 178 }, { x: 458, y: 54 }, { x: 564, y: 176 }, { x: 642, y: 82 }],
    pads: [{ x: 10, y: 318, width: 82 }, { x: 196, y: 304, width: 42 }, { x: 410, y: 304, width: 42 }, { x: 642, y: 318, width: 32 }],
  },
  {
    start: { x: 48, y: 248, velocityX: 220, velocityY: -455 },
    anchors: [{ x: 125, y: 58 }, { x: 225, y: 185 }, { x: 330, y: 50 }, { x: 435, y: 184 }, { x: 540, y: 52 }, { x: 635, y: 170 }],
    pads: [{ x: 10, y: 316, width: 78 }, { x: 274, y: 316, width: 40 }, { x: 492, y: 316, width: 40 }, { x: 650, y: 316, width: 26 }],
  },
  {
    start: { x: 46, y: 258, velocityX: 225, velocityY: -460 },
    anchors: [{ x: 118, y: 165 }, { x: 210, y: 52 }, { x: 305, y: 188 }, { x: 400, y: 48 }, { x: 495, y: 188 }, { x: 590, y: 54 }, { x: 652, y: 156 }],
    pads: [{ x: 8, y: 318, width: 76 }, { x: 164, y: 308, width: 38 }, { x: 352, y: 308, width: 38 }, { x: 540, y: 308, width: 38 }, { x: 652, y: 318, width: 24 }],
  },
  {
    start: { x: 44, y: 250, velocityX: 230, velocityY: -465 },
    anchors: [{ x: 110, y: 54 }, { x: 195, y: 190 }, { x: 282, y: 48 }, { x: 370, y: 192 }, { x: 458, y: 46 }, { x: 546, y: 190 }, { x: 634, y: 52 }],
    pads: [{ x: 8, y: 316, width: 72 }, { x: 238, y: 316, width: 34 }, { x: 414, y: 316, width: 34 }, { x: 650, y: 316, width: 22 }],
  },
]);

function distanceBetween(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function findReachableAnchor(player, anchors, maxLength = MAX_ROPE_LENGTH) {
  return anchors
    .map((anchor, index) => ({ anchor, index, distance: distanceBetween(player, anchor) }))
    .filter(({ anchor, distance }) => anchor.y < player.y + 45 && distance <= maxLength)
    .sort((first, second) => first.distance - second.distance)[0] ?? null;
}

export const tetherGame = {
  id: 'tether',
  name: 'NEON TETHER',
  title: '네온 테더',
  kicker: 'GAME 04 / SWING',
  copy: '훅을 붙잡고 속도를 만든 뒤 정확한 순간에 놓아 에너지 포털에 도달하세요.',
  hint: 'HOLD SPACE / PRESS & HOLD — 연결 · RELEASE — 비행',
  accessibility: 'Space 또는 Enter를 누르고 있거나 화면을 길게 누르면 범위 안의 가장 가까운 앵커에 연결됩니다. 버튼이나 손가락을 놓으면 현재 운동량을 유지한 채 비행합니다. 바운스 패드를 이용해 추락을 피하고 오른쪽 에너지 포털에 도달하세요.',
  ariaKeyShortcuts: 'Space Enter Escape',
  touchControls: ['action'],
  card: {
    badge: 'NEW · PHYSICS SKILL',
    icon: '◌',
    theme: 'four',
    summary: '훅과 운동량으로 포털에 도달하세요',
    difficulty: '점진적',
    estimatedTime: '2~4분',
    controls: 'HOLD / RELEASE',
  },

  create({ context, width, height, input, onScore, onEnd, sound }) {
    let state;

    function resetPlayer({ countFall = false } = {}) {
      const start = TETHER_LEVELS[state.levelIndex].start;
      state.player = { x: start.x, y: start.y, velocityX: start.velocityX, velocityY: start.velocityY };
      state.anchorIndex = null;
      state.ropeLength = 0;
      state.pointerHeld = false;
      state.trail.length = 0;
      if (countFall) {
        state.falls += 1;
        state.totalFalls += 1;
        sound.play('hit');
      }
    }

    function loadLevel(levelIndex) {
      state.levelIndex = levelIndex;
      state.levelTime = 0;
      state.falls = 0;
      state.clearDelay = 0;
      resetPlayer();
      onScore(state.score);
    }

    function init() {
      state = {
        levelIndex: 0,
        player: null,
        anchorIndex: null,
        ropeLength: 0,
        pointerHeld: false,
        wasActionPressed: false,
        score: 0,
        falls: 0,
        totalFalls: 0,
        levelTime: 0,
        clearDelay: 0,
        finished: false,
        trail: [],
      };
      loadLevel(0);
    }

    function attach() {
      if (state.finished || state.clearDelay > 0 || state.anchorIndex !== null) return false;
      const level = TETHER_LEVELS[state.levelIndex];
      const reachable = findReachableAnchor(state.player, level.anchors);
      if (!reachable) {
        sound.play('wrong');
        return false;
      }
      state.anchorIndex = reachable.index;
      state.ropeLength = Math.max(62, reachable.distance);
      sound.play('flip');
      return true;
    }

    function detach() {
      if (state.anchorIndex === null) return;
      state.anchorIndex = null;
      state.player.velocityX += 28;
      sound.play('select');
    }

    function completeLevel() {
      if (state.clearDelay > 0 || state.finished) return;
      const timeBonus = Math.max(0, 700 - Math.floor(state.levelTime * 35));
      const fallPenalty = state.falls * 60;
      state.score += Math.max(300, 700 + timeBonus - fallPenalty);
      state.clearDelay = 0.75;
      state.anchorIndex = null;
      sound.play('success');
      onScore(state.score);
    }

    function applyRopeConstraint() {
      if (state.anchorIndex === null) return;
      const anchor = TETHER_LEVELS[state.levelIndex].anchors[state.anchorIndex];
      const deltaX = state.player.x - anchor.x;
      const deltaY = state.player.y - anchor.y;
      const distance = Math.max(1, Math.hypot(deltaX, deltaY));
      if (distance <= state.ropeLength) return;
      const normalX = deltaX / distance;
      const normalY = deltaY / distance;
      state.player.x = anchor.x + normalX * state.ropeLength;
      state.player.y = anchor.y + normalY * state.ropeLength;
      const radialVelocity = state.player.velocityX * normalX + state.player.velocityY * normalY;
      if (radialVelocity > 0) {
        state.player.velocityX -= radialVelocity * normalX;
        state.player.velocityY -= radialVelocity * normalY;
      }
    }

    function applyPadCollision(previousY) {
      if (state.player.velocityY <= 0) return;
      const previousBottom = previousY + PLAYER_RADIUS;
      const currentBottom = state.player.y + PLAYER_RADIUS;
      const pad = TETHER_LEVELS[state.levelIndex].pads.find((candidate) => (
        state.player.x >= candidate.x - PLAYER_RADIUS
        && state.player.x <= candidate.x + candidate.width + PLAYER_RADIUS
        && previousBottom <= candidate.y
        && currentBottom >= candidate.y
      ));
      if (!pad) return;
      state.player.y = pad.y - PLAYER_RADIUS;
      state.player.velocityY = -440;
      state.player.velocityX = Math.max(145, state.player.velocityX + 35);
      sound.play('match');
    }

    function simulateStep(deltaTime) {
      const previousY = state.player.y;
      state.player.velocityY += GRAVITY * deltaTime;
      state.player.velocityX += FORWARD_ACCELERATION * deltaTime;
      const speed = Math.hypot(state.player.velocityX, state.player.velocityY);
      if (speed > MAX_SPEED) {
        state.player.velocityX = state.player.velocityX / speed * MAX_SPEED;
        state.player.velocityY = state.player.velocityY / speed * MAX_SPEED;
      }
      state.player.x += state.player.velocityX * deltaTime;
      state.player.y += state.player.velocityY * deltaTime;
      applyRopeConstraint();
      applyPadCollision(previousY);
    }

    function update(deltaTime) {
      if (state.finished) return;
      if (state.clearDelay > 0) {
        state.clearDelay -= deltaTime;
        if (state.clearDelay > 0) return;
        if (state.levelIndex === TETHER_LEVELS.length - 1) {
          state.finished = true;
          onEnd('모든 포털 통과!', state.score);
        } else {
          loadLevel(state.levelIndex + 1);
        }
        return;
      }

      const actionPressed = input?.isPressed('action') ?? false;
      if (actionPressed && !state.wasActionPressed) attach();
      if (!actionPressed && state.wasActionPressed && !state.pointerHeld) detach();
      state.wasActionPressed = actionPressed;
      state.levelTime += deltaTime;

      const substepCount = Math.max(1, Math.ceil(deltaTime / (1 / 120)));
      const substep = deltaTime / substepCount;
      for (let index = 0; index < substepCount; index += 1) simulateStep(substep);

      state.trail.push({ x: state.player.x, y: state.player.y });
      if (state.trail.length > 14) state.trail.shift();
      if (state.player.x >= FINISH_X) completeLevel();
      else if (state.player.y > height + 48 || state.player.x < -48) resetPlayer({ countFall: true });
    }

    function onAction(action) {
      if (action === 'action') attach();
    }

    function onPointerDown() {
      state.pointerHeld = true;
      attach();
    }

    function onPointerUp() {
      state.pointerHeld = false;
      detach();
    }

    function drawPad(pad) {
      drawRoundRect(context, pad.x, pad.y, pad.width, 12, 6, '#162128', '#69dce7');
      context.strokeStyle = palette.lime;
      context.lineWidth = 2;
      for (let x = pad.x + 12; x < pad.x + pad.width - 5; x += 20) {
        context.beginPath();
        context.moveTo(x, pad.y + 9);
        context.lineTo(x + 6, pad.y + 3);
        context.lineTo(x + 12, pad.y + 9);
        context.stroke();
      }
    }

    function drawAnchor(anchor, index) {
      const active = index === state.anchorIndex;
      context.beginPath();
      context.arc(anchor.x, anchor.y, active ? 13 : 9, 0, Math.PI * 2);
      context.fillStyle = active ? palette.lime : '#171022';
      context.fill();
      context.strokeStyle = active ? palette.lime : '#69dce7';
      context.lineWidth = 3;
      context.stroke();
      context.beginPath();
      context.arc(anchor.x, anchor.y, 19, 0, Math.PI * 2);
      context.strokeStyle = active ? '#b9ff3877' : '#69dce733';
      context.lineWidth = 1;
      context.stroke();
    }

    function drawPortal() {
      context.save();
      context.translate(FINISH_X, 184);
      context.strokeStyle = palette.lime;
      context.shadowColor = palette.lime;
      context.shadowBlur = 18;
      [18, 27, 36].forEach((radius, index) => {
        context.beginPath();
        context.ellipse(0, 0, radius * 0.42, radius, 0, 0, Math.PI * 2);
        context.globalAlpha = 1 - index * 0.25;
        context.stroke();
      });
      context.restore();
      context.globalAlpha = 1;
    }

    function drawPlayer() {
      state.trail.forEach((point, index) => {
        context.beginPath();
        context.arc(point.x, point.y, 3 + index * 0.22, 0, Math.PI * 2);
        context.fillStyle = `rgba(185, 255, 56, ${index / 45})`;
        context.fill();
      });

      context.beginPath();
      context.arc(state.player.x, state.player.y, PLAYER_RADIUS, 0, Math.PI * 2);
      context.fillStyle = '#151d20';
      context.fill();
      context.strokeStyle = palette.lime;
      context.lineWidth = 3;
      context.shadowColor = palette.lime;
      context.shadowBlur = 14;
      context.stroke();
      context.shadowBlur = 0;
      context.fillStyle = '#69dce7';
      context.fillRect(state.player.x + 2, state.player.y - 3, 5, 5);
    }

    function render() {
      drawBackdrop(context, width, height);
      const level = TETHER_LEVELS[state.levelIndex];

      context.fillStyle = '#07141c88';
      context.fillRect(0, 0, width, height);
      level.pads.forEach(drawPad);
      drawPortal();
      level.anchors.forEach(drawAnchor);

      if (state.anchorIndex !== null) {
        const anchor = level.anchors[state.anchorIndex];
        context.beginPath();
        context.moveTo(state.player.x, state.player.y);
        context.lineTo(anchor.x, anchor.y);
        context.strokeStyle = palette.lime;
        context.lineWidth = 2;
        context.shadowColor = palette.lime;
        context.shadowBlur = 8;
        context.stroke();
        context.shadowBlur = 0;
      }
      drawPlayer();

      context.textAlign = 'left';
      context.textBaseline = 'alphabetic';
      context.fillStyle = palette.lime;
      context.font = '800 13px monospace';
      context.fillText(`STAGE ${state.levelIndex + 1}/${TETHER_LEVELS.length}`, 18, 24);
      context.fillStyle = palette.muted;
      context.font = '700 11px monospace';
      context.fillText(`TIME ${state.levelTime.toFixed(1)}  FALLS ${state.falls}`, 18, 43);
      context.textAlign = 'right';
      context.fillStyle = state.anchorIndex === null ? '#69dce7' : palette.lime;
      context.fillText(state.anchorIndex === null ? 'HOLD TO TETHER' : 'RELEASE TO FLY', width - 20, 26);

      if (state.clearDelay > 0) {
        context.textAlign = 'center';
        context.fillStyle = palette.lime;
        context.font = '800 26px monospace';
        context.fillText('PORTAL SYNC!', width / 2, 190);
      }
    }

    return {
      init,
      update,
      render,
      onAction,
      onPointerDown,
      onPointerUp,
      destroy() {
        state.finished = true;
        state.anchorIndex = null;
        state.trail.length = 0;
      },
    };
  },
};
