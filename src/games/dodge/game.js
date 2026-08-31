import { drawBackdrop, palette } from '../shared/rendering.js';

const PLAYER_RADIUS = 16;
const PLAYER_SPEED = 250;

export const dodgeGame = {
  id: 'dodge',
  name: 'VOID DRIFTER',
  title: '보이드 드리프터',
  kicker: 'GAME 04 / HARD',
  copy: '방향키나 모바일 버튼으로 이동하며 네온 파편을 피하세요.',
  hint: 'ARROWS / WASD — 이동',
  touchControls: ['left', 'up', 'down', 'right'],
  card: {
    badge: 'HARD · DODGE',
    icon: '✦',
    theme: 'four',
    summary: '네온 파편 사이를 버티세요',
    difficulty: '어려움',
    estimatedTime: '1~3분',
    controls: 'ARROWS / TOUCH',
  },

  create({ context, width, height, input, onScore, onEnd, sound }) {
    let state;

    function init() {
      state = {
        player: { x: width / 2, y: height / 2 },
        hazards: [],
        spawnDelay: 0,
        elapsedTime: 0,
        shields: 3,
        invulnerableTime: 0,
      };
      onScore(0);
    }

    function spawnHazard() {
      const radius = 10 + Math.random() * 11;
      const side = Math.floor(Math.random() * 4);
      let x;
      let y;

      if (side === 0) {
        x = -radius;
        y = Math.random() * height;
      } else if (side === 1) {
        x = width + radius;
        y = Math.random() * height;
      } else if (side === 2) {
        x = Math.random() * width;
        y = -radius;
      } else {
        x = Math.random() * width;
        y = height + radius;
      }

      const directionX = state.player.x - x;
      const directionY = state.player.y - y;
      const distance = Math.hypot(directionX, directionY) || 1;
      const speed = Math.min(245, 118 + state.elapsedTime * 3.2);
      state.hazards.push({
        x,
        y,
        radius,
        velocityX: (directionX / distance) * speed,
        velocityY: (directionY / distance) * speed,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 3,
      });
    }

    function updatePlayer(deltaTime) {
      let directionX = Number(input.isPressed('right')) - Number(input.isPressed('left'));
      let directionY = Number(input.isPressed('down')) - Number(input.isPressed('up'));
      const magnitude = Math.hypot(directionX, directionY);
      if (magnitude > 0) {
        directionX /= magnitude;
        directionY /= magnitude;
      }

      state.player.x = Math.min(
        width - PLAYER_RADIUS,
        Math.max(PLAYER_RADIUS, state.player.x + directionX * PLAYER_SPEED * deltaTime),
      );
      state.player.y = Math.min(
        height - PLAYER_RADIUS,
        Math.max(PLAYER_RADIUS, state.player.y + directionY * PLAYER_SPEED * deltaTime),
      );
    }

    function update(deltaTime) {
      state.elapsedTime += deltaTime;
      state.spawnDelay -= deltaTime;
      state.invulnerableTime = Math.max(0, state.invulnerableTime - deltaTime);
      updatePlayer(deltaTime);

      if (state.spawnDelay <= 0) {
        spawnHazard();
        state.spawnDelay = Math.max(0.28, 0.78 - state.elapsedTime * 0.009);
      }

      for (let index = state.hazards.length - 1; index >= 0; index -= 1) {
        const hazard = state.hazards[index];
        hazard.x += hazard.velocityX * deltaTime;
        hazard.y += hazard.velocityY * deltaTime;
        hazard.rotation += hazard.rotationSpeed * deltaTime;

        const outside =
          hazard.x < -80 || hazard.x > width + 80 || hazard.y < -80 || hazard.y > height + 80;
        if (outside) {
          state.hazards.splice(index, 1);
          continue;
        }

        if (state.invulnerableTime > 0) continue;
        const collided =
          Math.hypot(hazard.x - state.player.x, hazard.y - state.player.y) <
          hazard.radius + PLAYER_RADIUS - 3;
        if (!collided) continue;

        state.hazards.splice(index, 1);
        state.shields -= 1;
        state.invulnerableTime = 1.1;
        sound.play('miss');
        if (state.shields <= 0) {
          onEnd('보이드 신호 소실!', Math.floor(state.elapsedTime * 20));
          return;
        }
      }

      onScore(state.elapsedTime * 20);
    }

    function render() {
      drawBackdrop(context, width, height);
      context.fillStyle = palette.muted;
      context.font = '700 13px monospace';
      context.fillText(`SHIELDS ${'◆'.repeat(Math.max(0, state.shields))}`, 28, 30);

      state.hazards.forEach((hazard) => {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.rotate(hazard.rotation);
        context.fillStyle = palette.pink;
        context.shadowColor = palette.pink;
        context.shadowBlur = 14;
        context.fillRect(-hazard.radius, -hazard.radius, hazard.radius * 2, hazard.radius * 2);
        context.restore();
      });

      if (state.invulnerableTime > 0 && Math.floor(state.invulnerableTime * 10) % 2 === 0) return;

      context.save();
      context.translate(state.player.x, state.player.y);
      context.fillStyle = palette.lime;
      context.shadowColor = palette.lime;
      context.shadowBlur = 18;
      context.beginPath();
      context.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = palette.background;
      context.beginPath();
      context.arc(0, 0, 6, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    return {
      init,
      update,
      render,
      destroy() {
        state.hazards.length = 0;
      },
    };
  },
};
