import { drawBackdrop, palette } from '../shared/rendering.js';

const DIFFICULTY = {
  initialSpeed: 285,
  maximumSpeed: 470,
  speedGainPerSecond: 3,
  minimumSpawnDelay: 0.72,
};

export const runnerGame = {
  id: 'runner',
  name: 'NEON RUNNER',
  title: '네온 러너',
  kicker: 'GAME 01 / EASY',
  copy: '스페이스바 또는 화면을 눌러 장애물을 뛰어넘으세요.',
  hint: 'SPACE / TAP — 점프',
  card: {
    badge: 'EASY · RUN',
    icon: '🐟',
    theme: 'one',
    summary: '장애물을 뛰어넘으세요',
    difficulty: '쉬움',
    estimatedTime: '1~3분',
    controls: 'SPACE / TAP',
  },

  create({ context, width, height, onScore, onEnd, sound }) {
    let state;

    function init() {
      state = {
        player: { x: 94, y: 270, velocityY: 0, width: 42, height: 42 },
        obstacles: [],
        spawnDelay: 0,
        speed: DIFFICULTY.initialSpeed,
        elapsedTime: 0,
        distance: 0,
      };
      onScore(0);
    }

    function jump() {
      const player = state.player;
      if (player.y < 269) return;

      player.velocityY = -620;
      sound.play('jump');
    }

    function update(deltaTime) {
      const player = state.player;
      player.velocityY += 1500 * deltaTime;
      player.y = Math.min(270, player.y + player.velocityY * deltaTime);
      state.elapsedTime += deltaTime;
      state.speed = Math.min(
        DIFFICULTY.maximumSpeed,
        DIFFICULTY.initialSpeed + state.elapsedTime * DIFFICULTY.speedGainPerSecond,
      );
      state.spawnDelay -= deltaTime;
      state.distance += state.speed * deltaTime;

      if (state.spawnDelay <= 0) {
        const obstacleHeight = 34 + Math.random() * 40;
        state.obstacles.push({
          x: width + 20,
          y: 312 - obstacleHeight,
          width: 20 + Math.random() * 18,
          height: obstacleHeight,
        });
        state.spawnDelay = Math.max(
          DIFFICULTY.minimumSpawnDelay,
          0.9 + Math.random() * 0.7 - state.elapsedTime * 0.004,
        );
      }

      for (let index = state.obstacles.length - 1; index >= 0; index -= 1) {
        const obstacle = state.obstacles[index];
        obstacle.x -= state.speed * deltaTime;
        if (obstacle.x <= -60) state.obstacles.splice(index, 1);
      }
      onScore(state.distance / 18);

      for (const obstacle of state.obstacles) {
        const collided =
          player.x + 7 < obstacle.x + obstacle.width &&
          player.x + player.width - 7 > obstacle.x &&
          player.y + 6 < obstacle.y + obstacle.height &&
          player.y + player.height > obstacle.y;

        if (collided) {
          onEnd('신호 충돌!');
          return;
        }
      }
    }

    function render() {
      drawBackdrop(context, width, height);
      context.fillStyle = '#492766';
      context.beginPath();
      context.arc(width * 0.8, 95, 62, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = palette.pink;
      context.globalAlpha = 0.5;
      context.beginPath();
      context.arc(width * 0.8, 95, 54, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
      context.strokeStyle = palette.lime;
      context.lineWidth = 3;
      context.shadowColor = palette.lime;
      context.shadowBlur = 14;
      context.beginPath();
      context.moveTo(0, 312);
      context.lineTo(width, 312);
      context.stroke();
      context.shadowBlur = 0;

      for (let index = 0; index < 15; index += 1) {
        const x = (index * 72 - state.distance * 0.35) % width;
        context.strokeStyle = '#18362b';
        context.beginPath();
        context.moveTo(x, 312);
        context.lineTo(x - 70, height);
        context.stroke();
      }

      const player = state.player;
      context.save();
      context.translate(player.x + player.width / 2, player.y + player.height / 2);
      context.fillStyle = palette.lime;
      context.shadowColor = palette.lime;
      context.shadowBlur = 15;
      context.beginPath();
      context.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(-18, 0);
      context.lineTo(-37, -18);
      context.lineTo(-34, 17);
      context.closePath();
      context.fill();
      context.fillStyle = palette.background;
      context.beginPath();
      context.arc(10, -3, 3, 0, Math.PI * 2);
      context.fill();
      context.restore();

      state.obstacles.forEach((obstacle) => {
        context.fillStyle = palette.pink;
        context.shadowColor = palette.pink;
        context.shadowBlur = 12;
        context.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        context.shadowBlur = 0;
        context.fillStyle = '#ffffff77';
        context.fillRect(obstacle.x + 4, obstacle.y + 5, 3, obstacle.height - 10);
      });
    }

    return {
      init,
      update,
      render,
      onAction(action) {
        if (action === 'action' || action === 'up') jump();
      },
      onPointerDown() {
        jump();
      },
      destroy() {
        state.obstacles.length = 0;
      },
    };
  },
};
