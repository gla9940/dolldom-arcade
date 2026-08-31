import { drawBackdrop, palette } from '../shared/rendering.js';

const DIFFICULTY = {
  initialSpeed: 115,
  maximumSpeed: 250,
  speedGainPerSecond: 4.5,
  initialSpawnDelay: 0.72,
  minimumSpawnDelay: 0.3,
};

export const reactionGame = {
  id: 'reaction',
  name: 'BLOCK CATCHER',
  title: '블록 캐처',
  kicker: 'GAME 03 / HARD',
  copy: '블록이 바닥에 닿기 전에 클릭하세요. 다섯 개를 놓치면 종료됩니다.',
  hint: 'SPACE / CLICK / TAP — 블록 잡기',
  accessibility: '네온 블록이 화면 위에서 아래로 떨어집니다. 블록을 클릭하거나 스페이스 또는 Enter 키로 가장 낮은 블록을 잡습니다. 다섯 개를 놓치면 종료됩니다.',
  ariaKeyShortcuts: 'Space Enter Escape',
  touchControls: [],
  card: {
    badge: 'HARD · REACTION',
    icon: '▣',
    theme: 'three',
    summary: '떨어지기 전에 터치하세요',
    difficulty: '어려움',
    estimatedTime: '1~2분',
    controls: 'SPACE / TAP',
  },

  create({ context, width, height, onScore, onEnd, sound }) {
    let state;

    function init() {
      state = {
        blocks: [],
        spawnDelay: 0,
        lives: 5,
        speed: DIFFICULTY.initialSpeed,
        elapsedTime: 0,
        hits: 0,
      };
      onScore(0);
    }

    function update(deltaTime) {
      state.spawnDelay -= deltaTime;
      state.elapsedTime += deltaTime;
      state.speed = Math.min(
        DIFFICULTY.maximumSpeed,
        DIFFICULTY.initialSpeed + state.elapsedTime * DIFFICULTY.speedGainPerSecond,
      );

      if (state.spawnDelay <= 0) {
        const size = 34 + Math.random() * 24;
        state.blocks.push({
          x: 30 + Math.random() * (width - 60 - size),
          y: -size,
          size,
          color: Math.random() > 0.5 ? palette.pink : palette.purple,
          phase: Math.random() * 6,
        });
        state.spawnDelay = Math.max(
          DIFFICULTY.minimumSpawnDelay,
          DIFFICULTY.initialSpawnDelay - state.elapsedTime * 0.01,
        );
      }

      state.blocks.forEach((block) => {
        block.y += state.speed * deltaTime;
      });

      let missedBlocks = 0;
      for (let index = state.blocks.length - 1; index >= 0; index -= 1) {
        if (state.blocks[index].y <= height + 10) continue;
        state.blocks.splice(index, 1);
        missedBlocks += 1;
      }
      if (missedBlocks) {
        state.lives -= missedBlocks;
        sound.play('miss');
        if (state.lives <= 0) {
          onEnd('신호를 놓쳤어요!');
          return;
        }
      }

      onScore(state.elapsedTime * 8 + state.hits * 100);
    }

    function catchBlockAtIndex(index) {
      state.blocks.splice(index, 1);
      state.hits += 1;
      onScore(state.elapsedTime * 8 + state.hits * 100);
      sound.play('catch');
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
          catchBlockAtIndex(index);
          return;
        }
      }

      sound.play('wrong');
    }

    function handleAction(action) {
      if (action !== 'action') return;
      let lowestBlockIndex = -1;
      for (let index = 0; index < state.blocks.length; index += 1) {
        const block = state.blocks[index];
        if (block.y + block.size < 0) continue;
        if (lowestBlockIndex === -1 || block.y > state.blocks[lowestBlockIndex].y) {
          lowestBlockIndex = index;
        }
      }
      if (lowestBlockIndex === -1) {
        sound.play('wrong');
        return;
      }
      catchBlockAtIndex(lowestBlockIndex);
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
      onAction: handleAction,
      onPointerDown: catchBlock,
      destroy() {
        state.blocks.length = 0;
      },
    };
  },
};
