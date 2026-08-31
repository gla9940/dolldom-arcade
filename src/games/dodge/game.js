import { drawBackdrop, palette } from '../shared/rendering.js';

const PLAYER_RADIUS = 16;
const PLAYER_SPEED = 250;
const STARTING_SHIELDS = 3;
const INVULNERABLE_SECONDS = 1.2;
const SAFE_START_SECONDS = 0.9;

export function getDodgeDifficulty(elapsedTime) {
  if (elapsedTime < 12) {
    return { wave: 1, spawnInterval: Math.max(0.62, 0.96 - elapsedTime * 0.025) };
  }
  if (elapsedTime < 28) {
    return { wave: 2, spawnInterval: Math.max(0.48, 0.66 - (elapsedTime - 12) * 0.01) };
  }
  return { wave: 3, spawnInterval: Math.max(0.36, 0.53 - (elapsedTime - 28) * 0.004) };
}

export const dodgeGame = {
  id: 'dodge',
  name: 'VOID DRIFTER',
  title: '보이드 드리프터',
  kicker: 'GAME 04 / HARD',
  copy: '방향키나 모바일 버튼으로 이동하며 네온 파편을 피하세요.',
  hint: 'ARROWS / WASD — 이동',
  accessibility: '화면 중앙의 원형 플레이어를 방향키 또는 WASD로 이동해 사방에서 다가오는 네온 파편을 피합니다. 보호막이 모두 사라지면 종료됩니다.',
  ariaKeyShortcuts: 'ArrowLeft ArrowRight ArrowUp ArrowDown Escape',
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

  create({ context, width, height, input, onScore, onEnd, sound, settings }) {
    let state;
    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const getSetting = (key, fallback) => settings?.get?.(key) ?? fallback;
    const isRelaxed = () => getSetting('dodgeDifficulty', 'normal') === 'relaxed';

    function init() {
      state = {
        player: { x: width / 2, y: height / 2 },
        hazards: [],
        particles: [],
        spawnDelay: SAFE_START_SECONDS,
        elapsedTime: 0,
        shields: STARTING_SHIELDS + Number(isRelaxed()),
        invulnerableTime: 0,
        hitFlashTime: 0,
        shakeTime: 0,
        spawnedHazards: 0,
      };
      onScore(0);
    }

    function spawnHazard(type = 'shard', angleOffset = 0) {
      const radius = type === 'orb' ? 12 + Math.random() * 6 : 9 + Math.random() * 10;
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

      const targetX = state.player.x + Math.cos(angleOffset) * 70;
      const targetY = state.player.y + Math.sin(angleOffset) * 70;
      const directionX = targetX - x;
      const directionY = targetY - y;
      const distance = Math.hypot(directionX, directionY) || 1;
      const speedBoost = type === 'spike' ? 34 : 0;
      const speedScale = isRelaxed() ? 0.88 : 1;
      const speed = Math.min(250, 105 + state.elapsedTime * 2.5 + speedBoost) * speedScale;
      state.hazards.push({
        type,
        x,
        y,
        radius,
        velocityX: (directionX / distance) * speed,
        velocityY: (directionY / distance) * speed,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 3,
        curve: type === 'orb' ? (Math.random() < 0.5 ? -0.42 : 0.42) : 0,
      });
      state.spawnedHazards += 1;
    }

    function spawnWave() {
      if (state.elapsedTime < 12) {
        spawnHazard('shard');
        return;
      }

      if (state.elapsedTime < 28) {
        spawnHazard(state.spawnedHazards % 3 === 2 ? 'orb' : 'shard');
        return;
      }

      const type = state.spawnedHazards % 4 === 3 ? 'spike' : 'shard';
      spawnHazard(type, -0.42);
      spawnHazard(type, 0.42);
    }

    function createHitParticles() {
      const particleSetting = getSetting('particles', 'full');
      const particleCount = reducedMotion || particleSetting === 'off'
        ? 0
        : particleSetting === 'reduced' ? 7 : 14;
      for (let index = 0; index < particleCount; index += 1) {
        const angle = (Math.PI * 2 * index) / particleCount + Math.random() * 0.3;
        const speed = 65 + Math.random() * 95;
        state.particles.push({
          x: state.player.x,
          y: state.player.y,
          velocityX: Math.cos(angle) * speed,
          velocityY: Math.sin(angle) * speed,
          life: 0.42 + Math.random() * 0.18,
        });
      }
    }

    function getSpawnInterval() {
      const interval = getDodgeDifficulty(state.elapsedTime).spawnInterval;
      return isRelaxed() ? interval * 1.18 : interval;
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
      state.hitFlashTime = Math.max(0, state.hitFlashTime - deltaTime);
      state.shakeTime = Math.max(0, state.shakeTime - deltaTime);
      updatePlayer(deltaTime);

      if (state.spawnDelay <= 0) {
        spawnWave();
        state.spawnDelay = getSpawnInterval();
      }

      for (let index = state.particles.length - 1; index >= 0; index -= 1) {
        const particle = state.particles[index];
        particle.x += particle.velocityX * deltaTime;
        particle.y += particle.velocityY * deltaTime;
        particle.life -= deltaTime;
        if (particle.life <= 0) state.particles.splice(index, 1);
      }

      for (let index = state.hazards.length - 1; index >= 0; index -= 1) {
        const hazard = state.hazards[index];
        if (hazard.curve) {
          const angle = hazard.curve * deltaTime;
          const cosine = Math.cos(angle);
          const sine = Math.sin(angle);
          const velocityX = hazard.velocityX * cosine - hazard.velocityY * sine;
          hazard.velocityY = hazard.velocityX * sine + hazard.velocityY * cosine;
          hazard.velocityX = velocityX;
        }
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
        state.invulnerableTime = INVULNERABLE_SECONDS;
        state.hitFlashTime = 0.28;
        state.shakeTime = reducedMotion || !getSetting('screenShake', true) ? 0 : 0.24;
        createHitParticles();
        sound.play('miss');
        if (state.shields <= 0) {
          onEnd('보이드 신호 소실!', Math.floor(state.elapsedTime * 20));
          return;
        }
      }

      onScore(state.elapsedTime * 20);
    }

    function render() {
      context.save();
      if (state.shakeTime > 0) {
        const strength = state.shakeTime * 18;
        context.translate((Math.random() - 0.5) * strength, (Math.random() - 0.5) * strength);
      }
      drawBackdrop(context, width, height);
      context.fillStyle = palette.muted;
      context.font = '700 13px monospace';
      context.fillText(`SHIELDS ${'◆'.repeat(Math.max(0, state.shields))}`, 28, 30);
      context.textAlign = 'right';
      context.fillText(`WAVE ${getDodgeDifficulty(state.elapsedTime).wave}`, width - 28, 30);
      context.textAlign = 'left';

      state.hazards.forEach((hazard) => {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.rotate(hazard.rotation);
        context.fillStyle = hazard.type === 'orb' ? palette.purple : palette.pink;
        context.shadowColor = hazard.type === 'orb' ? palette.purple : palette.pink;
        context.shadowBlur = 14;
        if (hazard.type === 'orb') {
          context.beginPath();
          context.arc(0, 0, hazard.radius, 0, Math.PI * 2);
          context.fill();
        } else if (hazard.type === 'spike') {
          context.beginPath();
          context.moveTo(hazard.radius * 1.35, 0);
          context.lineTo(-hazard.radius, hazard.radius * 0.9);
          context.lineTo(-hazard.radius, -hazard.radius * 0.9);
          context.closePath();
          context.fill();
        } else {
          context.fillRect(-hazard.radius, -hazard.radius, hazard.radius * 2, hazard.radius * 2);
        }
        context.restore();
      });

      state.particles.forEach((particle) => {
        context.globalAlpha = Math.min(1, particle.life * 3);
        context.fillStyle = palette.lime;
        context.fillRect(particle.x - 2, particle.y - 2, 4, 4);
      });
      context.globalAlpha = 1;

      const playerVisible = state.invulnerableTime <= 0
        || Math.floor(state.invulnerableTime * 12) % 2 !== 0;
      if (playerVisible) {
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
        if (state.invulnerableTime > 0) {
          context.strokeStyle = palette.lime;
          context.lineWidth = 2;
          context.beginPath();
          context.arc(0, 0, PLAYER_RADIUS + 7, 0, Math.PI * 2);
          context.stroke();
        }
        context.restore();
      }
      context.restore();

      if (state.hitFlashTime > 0) {
        context.globalAlpha = state.hitFlashTime * 0.65;
        context.fillStyle = palette.pink;
        context.fillRect(0, 0, width, height);
        context.globalAlpha = 1;
      }
    }

    return {
      init,
      update,
      render,
      destroy() {
        state.hazards.length = 0;
        state.particles.length = 0;
      },
    };
  },
};
