import { drawBackdrop, palette } from '../shared/rendering.js';

const PLAYER_RADIUS = 15;
const PLAYER_SPEED = 260;
const BULLET_SPEED = 520;
const FIRE_INTERVAL = 0.18;
const STARTING_SHIELDS = 3;

export const shooterGame = {
  id: 'shooter',
  name: 'NEON SHOOTER',
  title: '네온 슈터',
  kicker: 'GAME 05 / NORMAL',
  copy: '이동하며 네온 드론을 조준하고 발사해 방어선을 지키세요.',
  hint: 'ARROWS / WASD — 이동 · SPACE — 발사',
  accessibility: '화면 아래의 삼각형 전투기를 방향키 또는 WASD로 이동합니다. 스페이스나 Enter로 위쪽을 향해 발사하고, 내려오는 드론이 방어선을 넘지 못하게 막습니다.',
  ariaKeyShortcuts: 'ArrowLeft ArrowRight ArrowUp ArrowDown Space Enter Escape',
  touchControls: ['left', 'up', 'down', 'right', 'action'],
  card: {
    badge: 'NORMAL · SHOOT',
    icon: '▲',
    theme: 'five',
    summary: '네온 드론을 격추하세요',
    difficulty: '보통',
    estimatedTime: '1~3분',
    controls: 'ARROWS / FIRE',
  },

  create({ context, width, height, input, onScore, onEnd, sound, settings }) {
    let state;
    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const getSetting = (key, fallback) => settings?.get?.(key) ?? fallback;

    function init() {
      state = {
        player: { x: width / 2, y: height - 42 },
        bullets: [],
        enemies: [],
        particles: [],
        elapsedTime: 0,
        spawnDelay: 0.65,
        fireDelay: 0,
        shields: STARTING_SHIELDS,
        invulnerableTime: 0,
        shakeTime: 0,
        hits: 0,
      };
      onScore(0);
    }

    function getScore() {
      return state.hits * 100 + state.elapsedTime * 12;
    }

    function shoot() {
      if (state.fireDelay > 0) return;
      state.bullets.push({ x: state.player.x, y: state.player.y - PLAYER_RADIUS - 5 });
      state.fireDelay = FIRE_INTERVAL;
      sound.play('shoot');
    }

    function spawnEnemy() {
      const radius = 13 + Math.random() * 8;
      state.enemies.push({
        x: radius + Math.random() * (width - radius * 2),
        y: -radius,
        radius,
        velocityX: (Math.random() - 0.5) * 46,
        velocityY: Math.min(190, 72 + state.elapsedTime * 1.8 + Math.random() * 36),
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 2.8,
        type: Math.random() > 0.72 ? 'orb' : 'drone',
      });
    }

    function createHitParticles(x, y) {
      const particleSetting = getSetting('particles', 'full');
      const particleCount = reducedMotion || particleSetting === 'off'
        ? 0
        : particleSetting === 'reduced' ? 5 : 10;
      for (let index = 0; index < particleCount; index += 1) {
        const angle = (Math.PI * 2 * index) / particleCount + Math.random() * 0.25;
        const speed = 45 + Math.random() * 80;
        state.particles.push({
          x,
          y,
          velocityX: Math.cos(angle) * speed,
          velocityY: Math.sin(angle) * speed,
          life: 0.3 + Math.random() * 0.2,
        });
      }
    }

    function damagePlayer() {
      if (state.invulnerableTime > 0) return false;
      state.shields -= 1;
      state.invulnerableTime = 0.9;
      state.shakeTime = reducedMotion || !getSetting('screenShake', true) ? 0 : 0.2;
      sound.play('miss');
      if (state.shields > 0) return false;
      onEnd('방어선 붕괴!', Math.floor(getScore()));
      return true;
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
        height - PLAYER_RADIUS - 12,
        Math.max(height * 0.46, state.player.y + directionY * PLAYER_SPEED * deltaTime),
      );
      if (input.isPressed('action')) shoot();
    }

    function updateBullets(deltaTime) {
      for (let index = state.bullets.length - 1; index >= 0; index -= 1) {
        const bullet = state.bullets[index];
        bullet.y -= BULLET_SPEED * deltaTime;
        if (bullet.y < -12) state.bullets.splice(index, 1);
      }
    }

    function resolveBulletHits() {
      for (let bulletIndex = state.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
        const bullet = state.bullets[bulletIndex];
        for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
          const enemy = state.enemies[enemyIndex];
          if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) > enemy.radius + 5) continue;
          state.bullets.splice(bulletIndex, 1);
          state.enemies.splice(enemyIndex, 1);
          state.hits += 1;
          createHitParticles(enemy.x, enemy.y);
          sound.play('hit');
          break;
        }
      }
    }

    function updateEnemies(deltaTime) {
      for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
        const enemy = state.enemies[index];
        enemy.x += enemy.velocityX * deltaTime;
        enemy.y += enemy.velocityY * deltaTime;
        enemy.rotation += enemy.rotationSpeed * deltaTime;
        if (enemy.x < enemy.radius || enemy.x > width - enemy.radius) {
          enemy.x = Math.min(width - enemy.radius, Math.max(enemy.radius, enemy.x));
          enemy.velocityX *= -1;
        }

        const crossedDefenseLine = enemy.y - enemy.radius > height;
        const collidedWithPlayer = Math.hypot(
          enemy.x - state.player.x,
          enemy.y - state.player.y,
        ) < enemy.radius + PLAYER_RADIUS - 2;
        if (!crossedDefenseLine && !collidedWithPlayer) continue;

        state.enemies.splice(index, 1);
        if (damagePlayer()) return true;
      }
      return false;
    }

    function updateParticles(deltaTime) {
      for (let index = state.particles.length - 1; index >= 0; index -= 1) {
        const particle = state.particles[index];
        particle.x += particle.velocityX * deltaTime;
        particle.y += particle.velocityY * deltaTime;
        particle.life -= deltaTime;
        if (particle.life <= 0) state.particles.splice(index, 1);
      }
    }

    function update(deltaTime) {
      state.elapsedTime += deltaTime;
      state.spawnDelay -= deltaTime;
      state.fireDelay = Math.max(0, state.fireDelay - deltaTime);
      state.invulnerableTime = Math.max(0, state.invulnerableTime - deltaTime);
      state.shakeTime = Math.max(0, state.shakeTime - deltaTime);
      updatePlayer(deltaTime);

      if (state.spawnDelay <= 0) {
        spawnEnemy();
        state.spawnDelay = Math.max(0.32, 0.86 - state.elapsedTime * 0.012);
      }

      updateBullets(deltaTime);
      resolveBulletHits();
      if (updateEnemies(deltaTime)) return;
      updateParticles(deltaTime);
      onScore(getScore());
    }

    function renderEnemy(enemy) {
      context.save();
      context.translate(enemy.x, enemy.y);
      context.rotate(enemy.rotation);
      context.fillStyle = enemy.type === 'orb' ? palette.purple : palette.pink;
      context.shadowColor = context.fillStyle;
      context.shadowBlur = 16;
      if (enemy.type === 'orb') {
        context.beginPath();
        context.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        context.fill();
      } else {
        context.beginPath();
        context.moveTo(0, -enemy.radius);
        context.lineTo(enemy.radius, 0);
        context.lineTo(0, enemy.radius);
        context.lineTo(-enemy.radius, 0);
        context.closePath();
        context.fill();
      }
      context.fillStyle = palette.background;
      context.fillRect(-3, -3, 6, 6);
      context.restore();
    }

    function render() {
      context.save();
      if (state.shakeTime > 0) {
        const strength = state.shakeTime * 16;
        context.translate((Math.random() - 0.5) * strength, (Math.random() - 0.5) * strength);
      }
      drawBackdrop(context, width, height);
      context.strokeStyle = '#b9ff3844';
      context.setLineDash([8, 10]);
      context.beginPath();
      context.moveTo(0, height - 12);
      context.lineTo(width, height - 12);
      context.stroke();
      context.setLineDash([]);

      context.fillStyle = palette.muted;
      context.font = '700 13px monospace';
      context.fillText(`SHIELDS ${'◆'.repeat(Math.max(0, state.shields))}`, 28, 30);
      context.textAlign = 'right';
      context.fillText(`HITS ${state.hits}`, width - 28, 30);
      context.textAlign = 'left';

      state.bullets.forEach((bullet) => {
        context.fillStyle = palette.lime;
        context.shadowColor = palette.lime;
        context.shadowBlur = 12;
        context.fillRect(bullet.x - 2, bullet.y - 10, 4, 16);
      });
      context.shadowBlur = 0;
      state.enemies.forEach(renderEnemy);
      state.particles.forEach((particle) => {
        context.globalAlpha = Math.min(1, particle.life * 4);
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
        context.moveTo(0, -PLAYER_RADIUS - 7);
        context.lineTo(PLAYER_RADIUS, PLAYER_RADIUS);
        context.lineTo(0, PLAYER_RADIUS - 5);
        context.lineTo(-PLAYER_RADIUS, PLAYER_RADIUS);
        context.closePath();
        context.fill();
        context.fillStyle = palette.background;
        context.fillRect(-3, 2, 6, 10);
        context.restore();
      }
      context.restore();
    }

    return {
      init,
      update,
      render,
      onAction(action) {
        if (action === 'action') shoot();
      },
      onPointerDown() {
        shoot();
      },
      destroy() {
        state.bullets.length = 0;
        state.enemies.length = 0;
        state.particles.length = 0;
      },
    };
  },
};
