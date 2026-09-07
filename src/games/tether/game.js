import { drawBackdrop, drawRoundRect, palette } from '../shared/rendering.js';
import { getUnlockedStage, saveUnlockedStage } from '../../core/storage.js';

const PLAYER_RADIUS = 12;
const GRAVITY = 760;
const FORWARD_ACCELERATION = 34;
const MAX_ROPE_LENGTH = 235;
const MAX_SPEED = 720;
const PORTAL_X = 684;
const PORTAL_Y = 184;
const RESPAWN_DELAY = 0.45;

export const TETHER_LEVELS = Object.freeze([
  {
    start: { x: 62, y: 306, velocityX: 0, velocityY: -440 },
    anchors: [{ x: 190, y: 110 }, { x: 420, y: 112 }],
    pads: [{ x: 18, y: 318, width: 125 }, { x: 548, y: 318, width: 130 }],
  },
  {
    start: { x: 58, y: 306, velocityX: 0, velocityY: -440 },
    anchors: [{ x: 178, y: 82 }, { x: 350, y: 150 }, { x: 530, y: 78 }],
    pads: [{ x: 18, y: 318, width: 105 }, { x: 292, y: 300, width: 82 }, { x: 580, y: 318, width: 100 }],
  },
  {
    start: { x: 62, y: 306, velocityX: 0, velocityY: -445 },
    anchors: [{ x: 210, y: 165 }, { x: 375, y: 62 }, { x: 545, y: 165 }],
    pads: [{ x: 18, y: 318, width: 110 }, { x: 300, y: 318, width: 75 }, { x: 595, y: 318, width: 82 }],
  },
  {
    start: { x: 54, y: 302, velocityX: 0, velocityY: -445 },
    anchors: [{ x: 160, y: 70 }, { x: 315, y: 178 }, { x: 465, y: 68 }, { x: 585, y: 170 }],
    pads: [{ x: 14, y: 314, width: 95 }, { x: 250, y: 300, width: 70 }, { x: 610, y: 314, width: 65 }],
    movingAnchors: [{ index: 2, axis: 'y', amplitude: 32, speed: 1.4 }],
  },
  {
    start: { x: 58, y: 306, velocityX: 0, velocityY: -450 },
    anchors: [{ x: 185, y: 150 }, { x: 315, y: 55 }, { x: 445, y: 155 }, { x: 565, y: 70 }],
    pads: [{ x: 15, y: 318, width: 105 }, { x: 350, y: 318, width: 62 }, { x: 612, y: 318, width: 64 }],
    hazards: [{ x: 505, y: 292, radius: 15 }],
  },
  {
    start: { x: 56, y: 304, velocityX: 0, velocityY: -450 },
    anchors: [{ x: 155, y: 62 }, { x: 285, y: 175 }, { x: 410, y: 54 }, { x: 525, y: 175 }, { x: 625, y: 72 }],
    pads: [{ x: 14, y: 316, width: 92 }, { x: 220, y: 316, width: 55, boost: 1.22 }, { x: 450, y: 316, width: 55 }, { x: 630, y: 316, width: 48 }],
  },
  {
    start: { x: 54, y: 306, velocityX: 0, velocityY: -455 },
    anchors: [{ x: 145, y: 145 }, { x: 270, y: 58 }, { x: 390, y: 172 }, { x: 510, y: 72 }, { x: 625, y: 150 }],
    pads: [{ x: 12, y: 318, width: 88 }, { x: 330, y: 310, width: 52 }, { x: 640, y: 318, width: 38 }],
    fragileAnchors: [2],
  },
  {
    start: { x: 52, y: 304, velocityX: 0, velocityY: -455 },
    anchors: [{ x: 132, y: 64 }, { x: 252, y: 166 }, { x: 372, y: 62 }, { x: 492, y: 170 }, { x: 612, y: 66 }],
    pads: [{ x: 12, y: 316, width: 84 }, { x: 286, y: 316, width: 48 }, { x: 600, y: 316, width: 70 }],
    portal: { amplitude: 72, speed: 1.1 },
  },
  {
    start: { x: 50, y: 306, velocityX: 0, velocityY: -460 },
    anchors: [{ x: 138, y: 172 }, { x: 242, y: 56 }, { x: 350, y: 178 }, { x: 458, y: 54 }, { x: 564, y: 176 }, { x: 642, y: 82 }],
    pads: [{ x: 10, y: 318, width: 82 }, { x: 196, y: 304, width: 42 }, { x: 410, y: 304, width: 42 }, { x: 642, y: 318, width: 32 }],
    movingAnchors: [{ index: 3, axis: 'x', amplitude: 28, speed: 1.6 }],
    hazards: [{ x: 300, y: 305, radius: 14 }],
  },
  {
    start: { x: 48, y: 304, velocityX: 0, velocityY: -460 },
    anchors: [{ x: 125, y: 58 }, { x: 225, y: 185 }, { x: 330, y: 50 }, { x: 435, y: 184 }, { x: 540, y: 52 }, { x: 635, y: 170 }],
    pads: [{ x: 10, y: 316, width: 78 }, { x: 274, y: 316, width: 40, boost: 1.28 }, { x: 492, y: 316, width: 40 }, { x: 650, y: 316, width: 26 }],
    fragileAnchors: [3],
  },
  {
    start: { x: 46, y: 306, velocityX: 0, velocityY: -465 },
    anchors: [{ x: 118, y: 165 }, { x: 210, y: 52 }, { x: 305, y: 188 }, { x: 400, y: 48 }, { x: 495, y: 188 }, { x: 590, y: 54 }, { x: 652, y: 156 }],
    pads: [{ x: 8, y: 318, width: 76 }, { x: 164, y: 308, width: 38 }, { x: 352, y: 308, width: 38 }, { x: 540, y: 308, width: 38 }, { x: 652, y: 318, width: 24 }],
    portal: { amplitude: 86, speed: 1.35 },
    hazards: [{ x: 260, y: 302, radius: 13 }, { x: 475, y: 302, radius: 13 }],
  },
  {
    start: { x: 44, y: 304, velocityX: 0, velocityY: -465 },
    anchors: [{ x: 110, y: 54 }, { x: 195, y: 190 }, { x: 282, y: 48 }, { x: 370, y: 192 }, { x: 458, y: 46 }, { x: 546, y: 190 }, { x: 634, y: 52 }],
    pads: [{ x: 8, y: 316, width: 72 }, { x: 238, y: 316, width: 34 }, { x: 414, y: 316, width: 34 }, { x: 650, y: 316, width: 22 }],
    movingAnchors: [{ index: 2, axis: 'y', amplitude: 35, speed: 1.7 }, { index: 5, axis: 'x', amplitude: 24, speed: 1.5 }],
    fragileAnchors: [3, 5],
    hazards: [{ x: 326, y: 300, radius: 14 }, { x: 580, y: 300, radius: 14 }],
    portal: { amplitude: 70, speed: 1.5 },
  },
]);

function distanceBetween(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function findReachableAnchor(player, anchors, maxLength = MAX_ROPE_LENGTH) {
  const reachable = anchors
    .map((anchor, index) => ({ anchor, index, distance: distanceBetween(player, anchor) }))
    .filter(({ anchor, distance }) => anchor.y < player.y + 45 && distance <= maxLength)
    .sort((first, second) => first.distance - second.distance);
  return reachable.find(({ anchor }) => anchor.x >= player.x - PLAYER_RADIUS) ?? reachable[0] ?? null;
}

export function isInsidePortal(player, portal) {
  const horizontalRadius = 27;
  const verticalRadius = 48;
  const normalizedX = (player.x - portal.x) / horizontalRadius;
  const normalizedY = (player.y - portal.y) / verticalRadius;
  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}

export function getBounceVelocityX(currentVelocityX, hasTethered) {
  if (!hasTethered) return 0;
  return Math.max(145, currentVelocityX + 35);
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
  showDifficultiesOnResults: true,
  defaultDifficulty: 'stage-1',
  difficulties: TETHER_LEVELS.map((_level, index) => ({
    id: `stage-${index + 1}`,
    label: `${index + 1}`,
    description: `${index + 1} 스테이지부터 시작`,
    isAvailable: () => getUnlockedStage('tether', TETHER_LEVELS.length) >= index + 1,
  })),
  card: {
    badge: 'NEW · PHYSICS SKILL',
    icon: '◌',
    theme: 'four',
    summary: '훅과 운동량으로 포털에 도달하세요',
    difficulty: '점진적',
    estimatedTime: '2~4분',
    controls: 'HOLD / RELEASE',
  },

  create({ context, width, height, input, onScore, onEnd, sound, getDifficulty }) {
    let state;

    function getSelectedLevelIndex() {
      const selected = Number.parseInt(String(getDifficulty?.() ?? 'stage-1').replace('stage-', ''), 10);
      const unlocked = getUnlockedStage('tether', TETHER_LEVELS.length);
      return Math.min(unlocked, Math.max(1, Number.isFinite(selected) ? selected : 1)) - 1;
    }

    function getLevelAnchors() {
      const level = TETHER_LEVELS[state.levelIndex];
      return level.anchors.map((anchor, index) => {
        const motion = level.movingAnchors?.find((candidate) => candidate.index === index);
        if (!motion) return anchor;
        const offset = Math.sin(state.levelTime * motion.speed + index) * motion.amplitude;
        return {
          x: anchor.x + (motion.axis === 'x' ? offset : 0),
          y: anchor.y + (motion.axis === 'y' ? offset : 0),
        };
      });
    }

    function getPortal() {
      const motion = TETHER_LEVELS[state.levelIndex].portal;
      return {
        x: PORTAL_X,
        y: PORTAL_Y + (motion ? Math.sin(state.levelTime * motion.speed) * motion.amplitude : 0),
      };
    }

    function resetPlayer() {
      const start = TETHER_LEVELS[state.levelIndex].start;
      state.player = { x: start.x, y: start.y, velocityX: start.velocityX, velocityY: start.velocityY };
      state.anchorIndex = null;
      state.ropeLength = 0;
      state.anchorHoldTime = 0;
      state.tetherLockout = 0;
      state.pointerHeld = false;
      state.hasTethered = false;
      state.trail.length = 0;
      state.respawnDelay = 0;
      state.failurePoint = null;
    }

    function failPlayer() {
      if (state.respawnDelay > 0) return;
      state.falls += 1;
      state.totalFalls += 1;
      state.anchorIndex = null;
      state.pointerHeld = false;
      state.failurePoint = { x: state.player.x, y: Math.min(height - 22, state.player.y) };
      state.respawnDelay = RESPAWN_DELAY;
      sound.play('hit');
    }

    function loadLevel(levelIndex) {
      state.levelIndex = levelIndex;
      state.levelTime = 0;
      state.falls = 0;
      state.clearDelay = 0;
      state.lastBreakdown = null;
      resetPlayer();
      onScore(state.score);
    }

    function init() {
      state = {
        levelIndex: getSelectedLevelIndex(),
        player: null,
        anchorIndex: null,
        ropeLength: 0,
        anchorHoldTime: 0,
        tetherLockout: 0,
        pointerHeld: false,
        hasTethered: false,
        score: 0,
        falls: 0,
        totalFalls: 0,
        levelTime: 0,
        clearDelay: 0,
        respawnDelay: 0,
        failurePoint: null,
        lastBreakdown: null,
        tutorialStep: 0,
        tutorialTimer: 0,
        finished: false,
        trail: [],
      };
      loadLevel(state.levelIndex);
    }

    function attach() {
      if (state.finished || state.clearDelay > 0 || state.respawnDelay > 0 || state.tetherLockout > 0 || state.anchorIndex !== null) return false;
      const reachable = findReachableAnchor(state.player, getLevelAnchors());
      if (!reachable) {
        return false;
      }
      state.anchorIndex = reachable.index;
      state.ropeLength = Math.max(62, reachable.distance);
      state.anchorHoldTime = 0;
      state.hasTethered = true;
      state.tutorialStep = Math.max(state.tutorialStep, 1);
      sound.play('flip');
      return true;
    }

    function detach() {
      if (state.anchorIndex === null) return;
      state.anchorIndex = null;
      state.anchorHoldTime = 0;
      state.player.velocityX += 28;
      if (state.tutorialStep === 1) {
        state.tutorialStep = 2;
        state.tutorialTimer = 2.8;
      }
      sound.play('select');
    }

    function breakFragileAnchor() {
      state.anchorIndex = null;
      state.anchorHoldTime = 0;
      state.tetherLockout = 0.35;
      state.player.velocityX += 36;
      sound.play('hit');
    }

    function completeLevel() {
      if (state.clearDelay > 0 || state.finished) return;
      const timeBonus = Math.max(0, 700 - Math.floor(state.levelTime * 35));
      const fallPenalty = state.falls * 60;
      const earned = Math.max(300, 700 + timeBonus - fallPenalty);
      state.score += earned;
      state.lastBreakdown = { base: 700, timeBonus, fallPenalty, earned };
      state.clearDelay = 1.45;
      state.anchorIndex = null;
      saveUnlockedStage('tether', state.levelIndex + 2, TETHER_LEVELS.length);
      sound.play('success');
      onScore(state.score);
    }

    function applyRopeConstraint() {
      if (state.anchorIndex === null) return;
      const anchor = getLevelAnchors()[state.anchorIndex];
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
      state.player.velocityY = -440 * (pad.boost ?? 1);
      state.player.velocityX = getBounceVelocityX(
        state.player.velocityX,
        state.hasTethered,
      );
      sound.play('match');
    }

    function hitsHazard() {
      return (TETHER_LEVELS[state.levelIndex].hazards ?? []).some((hazard) => (
        distanceBetween(state.player, hazard) <= PLAYER_RADIUS + hazard.radius
      ));
    }

    function simulateStep(deltaTime) {
      const previousY = state.player.y;
      state.player.velocityY += GRAVITY * deltaTime;
      if (state.hasTethered) state.player.velocityX += FORWARD_ACCELERATION * deltaTime;
      const speed = Math.hypot(state.player.velocityX, state.player.velocityY);
      if (speed > MAX_SPEED) {
        state.player.velocityX = state.player.velocityX / speed * MAX_SPEED;
        state.player.velocityY = state.player.velocityY / speed * MAX_SPEED;
      }
      state.player.x += state.player.velocityX * deltaTime;
      state.player.y += state.player.velocityY * deltaTime;
      applyRopeConstraint();
      applyPadCollision(previousY);
      if (hitsHazard()) failPlayer();
    }

    function update(deltaTime) {
      if (state.finished) return;
      if (state.respawnDelay > 0) {
        state.respawnDelay -= deltaTime;
        if (state.respawnDelay <= 0) resetPlayer();
        return;
      }
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
      const wantsTether = actionPressed || state.pointerHeld;
      if (wantsTether && state.anchorIndex === null) attach();
      else if (!wantsTether) detach();
      state.levelTime += deltaTime;
      if (state.tetherLockout > 0) state.tetherLockout -= deltaTime;
      if (state.tutorialTimer > 0) state.tutorialTimer -= deltaTime;
      if (state.anchorIndex !== null) {
        state.anchorHoldTime += deltaTime;
        const fragile = TETHER_LEVELS[state.levelIndex].fragileAnchors?.includes(state.anchorIndex);
        if (fragile && state.anchorHoldTime >= 1.15) breakFragileAnchor();
      }

      const substepCount = Math.max(1, Math.ceil(deltaTime / (1 / 120)));
      const substep = deltaTime / substepCount;
      for (let index = 0; index < substepCount; index += 1) {
        simulateStep(substep);
        if (state.respawnDelay > 0) break;
      }

      state.trail.push({ x: state.player.x, y: state.player.y });
      if (state.trail.length > 14) state.trail.shift();
      if (isInsidePortal(state.player, getPortal())) completeLevel();
      else if (state.player.y > height + 48 || state.player.x < -48 || state.player.x > width + 52) failPlayer();
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
      const boosted = (pad.boost ?? 1) > 1;
      drawRoundRect(context, pad.x, pad.y, pad.width, 12, 6, '#162128', boosted ? palette.pink : '#69dce7');
      context.strokeStyle = boosted ? palette.pink : palette.lime;
      context.lineWidth = 2;
      for (let x = pad.x + 12; x < pad.x + pad.width - 5; x += 20) {
        context.beginPath();
        context.moveTo(x, pad.y + 9);
        context.lineTo(x + 6, pad.y + 3);
        context.lineTo(x + 12, pad.y + 9);
        context.stroke();
      }
    }

    function drawAnchor(anchor, index, previewIndex) {
      const active = index === state.anchorIndex;
      const previewed = index === previewIndex && !active;
      const fragile = TETHER_LEVELS[state.levelIndex].fragileAnchors?.includes(index);
      const reachable = distanceBetween(state.player, anchor) <= MAX_ROPE_LENGTH
        && anchor.y < state.player.y + 45;
      context.save();
      context.globalAlpha = active || reachable ? 1 : 0.35;
      context.beginPath();
      context.arc(anchor.x, anchor.y, active ? 13 : previewed ? 11 : 9, 0, Math.PI * 2);
      context.fillStyle = active ? palette.lime : '#171022';
      context.fill();
      context.strokeStyle = fragile ? palette.pink : active || previewed ? palette.lime : '#69dce7';
      context.lineWidth = 3;
      context.stroke();
      context.beginPath();
      context.arc(anchor.x, anchor.y, previewed ? 24 : 19, 0, Math.PI * 2);
      context.strokeStyle = active || previewed ? '#b9ff38aa' : '#69dce733';
      context.lineWidth = previewed ? 2 : 1;
      context.stroke();
      context.restore();
    }

    function drawPortal(portal) {
      context.save();
      context.translate(portal.x, portal.y);
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

    function drawHazard(hazard) {
      context.save();
      context.translate(hazard.x, hazard.y);
      context.rotate(state.levelTime * 1.8);
      context.beginPath();
      for (let index = 0; index < 12; index += 1) {
        const angle = index * Math.PI / 6;
        const radius = index % 2 === 0 ? hazard.radius + 7 : hazard.radius;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
      context.fillStyle = '#2a0c27';
      context.fill();
      context.strokeStyle = palette.pink;
      context.lineWidth = 2;
      context.stroke();
      context.restore();
    }

    function drawCenteredNotice(title, copy, color = palette.lime) {
      context.textAlign = 'center';
      context.fillStyle = '#07050cdd';
      context.fillRect(width / 2 - 150, 137, 300, 78);
      context.fillStyle = color;
      context.font = '800 18px monospace';
      context.fillText(title, width / 2, 166);
      context.fillStyle = palette.muted;
      context.font = '700 11px monospace';
      context.fillText(copy, width / 2, 190);
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
      const anchors = getLevelAnchors();
      const portal = getPortal();
      const preview = state.anchorIndex === null
        ? findReachableAnchor(state.player, anchors)?.index ?? null
        : null;

      context.fillStyle = '#07141c88';
      context.fillRect(0, 0, width, height);
      level.pads.forEach(drawPad);
      (level.hazards ?? []).forEach(drawHazard);
      drawPortal(portal);
      anchors.forEach((anchor, index) => drawAnchor(anchor, index, preview));

      if (state.anchorIndex !== null) {
        const anchor = anchors[state.anchorIndex];
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

      if (state.failurePoint) {
        context.beginPath();
        context.arc(state.failurePoint.x, state.failurePoint.y, 22, 0, Math.PI * 2);
        context.strokeStyle = palette.pink;
        context.lineWidth = 3;
        context.stroke();
      }

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
        const breakdown = state.lastBreakdown;
        drawCenteredNotice(
          'PORTAL SYNC!',
          `BASE ${breakdown.base} + TIME ${breakdown.timeBonus} - FALL ${breakdown.fallPenalty} = ${breakdown.earned}`,
        );
      } else if (state.respawnDelay > 0) {
        drawCenteredNotice('SIGNAL LOST', '바운스 지점으로 복귀합니다', palette.pink);
      } else if (state.tutorialStep === 0) {
        drawCenteredNotice('HOLD', 'SPACE 또는 화면을 누르면 연결');
      } else if (state.tutorialStep === 1) {
        drawCenteredNotice('RELEASE', '놓으면 현재 속도로 비행');
      } else if (state.tutorialTimer > 0) {
        drawCenteredNotice('ENTER THE PORTAL', '빛나는 원 안으로 정확히 진입');
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
