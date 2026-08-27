import { drawBackdrop, palette } from '../shared/rendering.js';

export const reactionGame = {
  id: 'reaction',
  name: 'BLOCK CATCHER',
  title: '블록 캐처',
  kicker: 'GAME 03 / HARD',
  copy: '블록이 바닥에 닿기 전에 클릭하세요. 다섯 개를 놓치면 종료됩니다.',
  hint: 'CLICK / TAP — 블록 잡기',

  create({ context, width, height, onScore, onEnd, sound }) {
    let state;

    function init() {
      state = {
        blocks: [],
        spawnDelay: 0,
        lives: 5,
        speed: 115,
        elapsedTime: 0,
        hits: 0,
      };
      onScore(0);
    }

    function update(deltaTime) {
      state.spawnDelay -= deltaTime;
      state.elapsedTime += deltaTime;
      state.speed = Math.min(260, 115 + state.elapsedTime * 5);

      if (state.spawnDelay <= 0) {
        const size = 34 + Math.random() * 24;
        state.blocks.push({
          x: 30 + Math.random() * (width - 60 - size),
          y: -size,
          size,
          color: Math.random() > 0.5 ? palette.pink : palette.purple,
          phase: Math.random() * 6,
        });
        state.spawnDelay = Math.max(0.25, 0.7 - state.elapsedTime * 0.012);
      }

      state.blocks.forEach((block) => {
        block.y += state.speed * deltaTime;
      });

      const missedBlocks = state.blocks.filter((block) => block.y > height + 10).length;
      if (missedBlocks) {
        state.lives -= missedBlocks;
        sound.tone(130, 0.12, 'sawtooth');
        state.blocks = state.blocks.filter((block) => block.y <= height + 10);
        if (state.lives <= 0) {
          onEnd('신호를 놓쳤어요!');
          return;
        }
      }

      onScore(state.elapsedTime * 8 + state.hits * 100);
    }

    function catchBlock(x, y) {
      for (let index = state.blocks.length - 1; index >= 0; index -= 1) {
        const block = state.blocks[index];
        const hit =
          x >= block.x - 8 &&
          x <= block.x + block.size + 8 &&
          y >= block.y - 8 &&
          y <= block.y + block.size + 8;

        if (hit) {
          state.blocks.splice(index, 1);
          state.hits += 1;
          onScore(state.elapsedTime * 8 + state.hits * 100);
          sound.tone(640 + state.hits * 12, 0.05);
          return;
        }
      }

      sound.tone(180, 0.03);
    }

    function render() {
      drawBackdrop(context, width, height);
      context.fillStyle = palette.muted;
      context.font = '700 13px monospace';
      context.fillText(`SHIELDS ${'◆'.repeat(Math.max(0, state.lives))}`, 28, 30);

      state.blocks.forEach((block) => {
        context.save();
        context.translate(block.x + block.size / 2, block.y + block.size / 2);
        context.rotate(state.elapsedTime * 0.7 + block.phase);
        context.fillStyle = block.color;
        context.shadowColor = block.color;
        context.shadowBlur = 18;
        context.fillRect(-block.size / 2, -block.size / 2, block.size, block.size);
        context.fillStyle = '#ffffff66';
        context.fillRect(-block.size / 2 + 6, -block.size / 2 + 6, 5, block.size - 12);
        context.restore();
      });

      context.strokeStyle = palette.danger;
      context.setLineDash([8, 8]);
      context.beginPath();
      context.moveTo(0, height - 18);
      context.lineTo(width, height - 18);
      context.stroke();
      context.setLineDash([]);
    }

    return {
      init,
      update,
      render,
      onPointerDown: catchBlock,
      destroy() {
        state.blocks.length = 0;
      },
    };
  },
};
