import { drawBackdrop, drawRoundRect, palette } from '../shared/rendering.js';

const GRID_SIZE = 6;
const CELL_SIZE = 50;
const BOARD_X = 30;
const BOARD_Y = 28;
const TARGET_ID = 'target';

export const GRIDLOCK_LEVELS = Object.freeze([
  { par: 5, blocks: [
    ['target', 'h', 0, 2, 2], ['a', 'v', 3, 1, 2],
  ] },
  { par: 8, blocks: [
    ['target', 'h', 0, 2, 2], ['a', 'v', 2, 0, 3], ['b', 'h', 2, 3, 2],
  ] },
  { par: 4, blocks: [
    ['target', 'h', 1, 2, 2], ['a', 'v', 3, 1, 2], ['b', 'h', 2, 3, 2], ['c', 'v', 4, 3, 2],
  ] },
  { par: 9, blocks: [
    ['target', 'h', 0, 2, 2], ['a', 'v', 2, 0, 3], ['b', 'h', 1, 3, 2], ['c', 'h', 2, 5, 3],
  ] },
  { par: 6, blocks: [
    ['target', 'h', 0, 2, 2], ['a', 'v', 2, 1, 2], ['b', 'v', 4, 2, 3], ['c', 'h', 4, 0, 2],
  ] },
  { par: 19, blocks: [
    ['target', 'h', 0, 2, 2], ['a', 'v', 2, 0, 3], ['b', 'h', 1, 3, 3], ['c', 'v', 5, 3, 3],
  ] },
  { par: 4, blocks: [
    ['target', 'h', 1, 2, 2], ['a', 'v', 3, 1, 2], ['b', 'h', 2, 3, 2], ['c', 'v', 5, 3, 3], ['d', 'v', 0, 3, 2],
  ] },
  { par: 9, blocks: [
    ['target', 'h', 0, 2, 2], ['a', 'v', 2, 0, 3], ['b', 'h', 1, 3, 2], ['c', 'v', 3, 3, 3], ['d', 'v', 0, 3, 2],
  ] },
]);

const BLOCK_COLORS = ['#69dce7', '#cc55ff', '#ff4fb8', '#6e8cff', '#ffad4f', '#43d7a0'];

function createBlocks(level) {
  return level.blocks.map(([id, axis, column, row, length], index) => ({
    id,
    axis,
    column,
    row,
    length,
    color: id === TARGET_ID ? palette.lime : BLOCK_COLORS[index % BLOCK_COLORS.length],
  }));
}

function getOccupiedCells(block, column = block.column, row = block.row) {
  return Array.from({ length: block.length }, (_value, offset) => ({
    column: column + (block.axis === 'h' ? offset : 0),
    row: row + (block.axis === 'v' ? offset : 0),
  }));
}

function canMove(blocks, blockIndex, direction) {
  const block = blocks[blockIndex];
  if (!block) return false;
  const horizontal = direction === 'left' || direction === 'right';
  if ((block.axis === 'h') !== horizontal) return false;
  const column = block.column + (direction === 'left' ? -1 : direction === 'right' ? 1 : 0);
  const row = block.row + (direction === 'up' ? -1 : direction === 'down' ? 1 : 0);
  const nextCells = getOccupiedCells(block, column, row);
  if (nextCells.some((cell) => (
    cell.column < 0 || cell.column >= GRID_SIZE || cell.row < 0 || cell.row >= GRID_SIZE
  ))) return false;

  const occupied = new Set();
  blocks.forEach((candidate, index) => {
    if (index === blockIndex) return;
    getOccupiedCells(candidate).forEach((cell) => occupied.add(`${cell.column},${cell.row}`));
  });
  return nextCells.every((cell) => !occupied.has(`${cell.column},${cell.row}`));
}

function moveBlock(blocks, blockIndex, direction) {
  if (!canMove(blocks, blockIndex, direction)) return false;
  const block = blocks[blockIndex];
  if (direction === 'left') block.column -= 1;
  else if (direction === 'right') block.column += 1;
  else if (direction === 'up') block.row -= 1;
  else block.row += 1;
  return true;
}

export function getMinimumMoves(level) {
  const initial = createBlocks(level);
  const positions = initial.map((block) => block.axis === 'h' ? block.column : block.row);
  const serialize = (values) => values.join(',');
  const visited = new Set([serialize(positions)]);
  const queue = [{ positions, moves: 0 }];

  while (queue.length) {
    const current = queue.shift();
    const blocks = createBlocks(level);
    blocks.forEach((block, index) => {
      if (block.axis === 'h') block.column = current.positions[index];
      else block.row = current.positions[index];
    });
    if (blocks[0].column + blocks[0].length === GRID_SIZE) return current.moves;

    blocks.forEach((block, blockIndex) => {
      const directions = block.axis === 'h' ? ['left', 'right'] : ['up', 'down'];
      directions.forEach((direction) => {
        const nextBlocks = blocks.map((candidate) => ({ ...candidate }));
        if (!moveBlock(nextBlocks, blockIndex, direction)) return;
        const nextPositions = nextBlocks.map((candidate) => (
          candidate.axis === 'h' ? candidate.column : candidate.row
        ));
        const key = serialize(nextPositions);
        if (visited.has(key)) return;
        visited.add(key);
        queue.push({ positions: nextPositions, moves: current.moves + 1 });
      });
    });
  }
  return null;
}

export const gridlockGame = {
  id: 'gridlock',
  name: 'NEON GRIDLOCK',
  title: '네온 블록 탈출',
  kicker: 'GAME 03 / SLIDE PUZZLE',
  copy: '블록을 밀어 라임색 데이터 코어가 오른쪽 출구에 도달하도록 길을 만드세요.',
  hint: 'DRAG — 블록 이동 · ARROWS — 선택 블록 이동 · SPACE — 블록 전환',
  accessibility: '6열 6행 보드에서 가로 블록은 좌우로, 세로 블록은 위아래로만 움직입니다. 라임색 데이터 코어를 오른쪽 출구까지 이동하면 스테이지를 완료합니다. 블록을 직접 드래그하거나 스페이스로 블록을 선택하고 방향키로 움직일 수 있습니다.',
  ariaKeyShortcuts: 'ArrowLeft ArrowRight ArrowUp ArrowDown Space Enter Escape',
  touchControls: ['left', 'up', 'down', 'right', 'action'],
  card: {
    badge: 'NEW · SLIDE PUZZLE',
    icon: '▰',
    theme: 'three',
    summary: '블록을 밀어 코어를 탈출시키세요',
    difficulty: '점진적',
    estimatedTime: '2~5분',
    controls: 'DRAG / ARROWS',
  },

  create({ context, width, height, onScore, onEnd, sound }) {
    let state;

    function loadLevel(levelIndex) {
      state.levelIndex = levelIndex;
      state.blocks = createBlocks(GRIDLOCK_LEVELS[levelIndex]);
      state.selectedIndex = 0;
      state.moves = 0;
      state.drag = null;
      state.clearDelay = 0;
      onScore(state.score);
    }

    function init() {
      state = { score: 0, finished: false };
      loadLevel(0);
    }

    function completeLevel() {
      if (state.clearDelay > 0 || state.finished) return;
      const level = GRIDLOCK_LEVELS[state.levelIndex];
      const efficiencyBonus = Math.max(0, level.par - state.moves) * 50;
      state.score += 500 + efficiencyBonus;
      state.clearDelay = 0.65;
      sound.play('success');
      onScore(state.score);
    }

    function checkGoal() {
      const target = state.blocks.find(({ id }) => id === TARGET_ID);
      if (target.column + target.length === GRID_SIZE) completeLevel();
    }

    function update(deltaTime) {
      if (state.finished || state.clearDelay <= 0) return;
      state.clearDelay -= deltaTime;
      if (state.clearDelay > 0) return;
      if (state.levelIndex === GRIDLOCK_LEVELS.length - 1) {
        state.finished = true;
        onEnd('모든 코어 탈출 완료!', state.score);
      } else {
        loadLevel(state.levelIndex + 1);
      }
    }

    function makeMove(direction) {
      if (state.finished || state.clearDelay > 0) return;
      if (!moveBlock(state.blocks, state.selectedIndex, direction)) {
        sound.play('wrong');
        return;
      }
      state.moves += 1;
      sound.play('select');
      checkGoal();
    }

    function onAction(action) {
      if (action === 'action') {
        state.selectedIndex = (state.selectedIndex + 1) % state.blocks.length;
        sound.play('select');
        return;
      }
      makeMove(action);
    }

    function findBlockAt(x, y) {
      const column = Math.floor((x - BOARD_X) / CELL_SIZE);
      const row = Math.floor((y - BOARD_Y) / CELL_SIZE);
      return state.blocks.findIndex((block) => getOccupiedCells(block)
        .some((cell) => cell.column === column && cell.row === row));
    }

    function onPointerDown(x, y, pointer = {}) {
      if (state.finished || state.clearDelay > 0) return;
      const blockIndex = findBlockAt(x, y);
      if (blockIndex < 0) return;
      state.selectedIndex = blockIndex;
      const block = state.blocks[blockIndex];
      state.drag = {
        pointerId: pointer.pointerId,
        startX: x,
        startY: y,
        startPosition: block.axis === 'h' ? block.column : block.row,
      };
      sound.play('select');
    }

    function onPointerMove(x, y, pointer = {}) {
      if (!state.drag || state.drag.pointerId !== pointer.pointerId) return;
      const block = state.blocks[state.selectedIndex];
      const distance = block.axis === 'h' ? x - state.drag.startX : y - state.drag.startY;
      const desiredPosition = state.drag.startPosition + Math.round(distance / CELL_SIZE);
      const currentPosition = block.axis === 'h' ? block.column : block.row;
      const direction = block.axis === 'h'
        ? desiredPosition < currentPosition ? 'left' : 'right'
        : desiredPosition < currentPosition ? 'up' : 'down';
      let position = currentPosition;
      while (position !== desiredPosition && moveBlock(state.blocks, state.selectedIndex, direction)) {
        position += desiredPosition < position ? -1 : 1;
      }
    }

    function onPointerUp(_x, _y, pointer = {}) {
      if (!state.drag || state.drag.pointerId !== pointer.pointerId) return;
      const block = state.blocks[state.selectedIndex];
      const currentPosition = block.axis === 'h' ? block.column : block.row;
      const movedCells = Math.abs(currentPosition - state.drag.startPosition);
      state.drag = null;
      if (!movedCells) return;
      state.moves += movedCells;
      sound.play('flip');
      checkGoal();
    }

    function renderBoard() {
      context.fillStyle = '#07141ccc';
      context.fillRect(BOARD_X - 8, BOARD_Y - 8, GRID_SIZE * CELL_SIZE + 16, GRID_SIZE * CELL_SIZE + 16);
      for (let row = 0; row < GRID_SIZE; row += 1) {
        for (let column = 0; column < GRID_SIZE; column += 1) {
          context.strokeStyle = '#1b3c4d';
          context.lineWidth = 1;
          context.strokeRect(
            BOARD_X + column * CELL_SIZE + 2,
            BOARD_Y + row * CELL_SIZE + 2,
            CELL_SIZE - 4,
            CELL_SIZE - 4,
          );
        }
      }

      const exitY = BOARD_Y + 2 * CELL_SIZE;
      context.fillStyle = '#b9ff3826';
      context.fillRect(BOARD_X + GRID_SIZE * CELL_SIZE, exitY + 5, 26, CELL_SIZE - 10);
      context.fillStyle = palette.lime;
      context.font = '700 24px monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('›', BOARD_X + GRID_SIZE * CELL_SIZE + 13, exitY + CELL_SIZE / 2);

      state.blocks.forEach((block, index) => {
        const x = BOARD_X + block.column * CELL_SIZE + 4;
        const y = BOARD_Y + block.row * CELL_SIZE + 4;
        const blockWidth = (block.axis === 'h' ? block.length : 1) * CELL_SIZE - 8;
        const blockHeight = (block.axis === 'v' ? block.length : 1) * CELL_SIZE - 8;
        const selected = index === state.selectedIndex;
        drawRoundRect(context, x, y, blockWidth, blockHeight, 9, `${block.color}30`, block.color);
        if (selected) {
          context.strokeStyle = palette.text;
          context.lineWidth = 2;
          context.strokeRect(x - 3, y - 3, blockWidth + 6, blockHeight + 6);
        }
        context.fillStyle = block.color;
        context.shadowColor = block.color;
        context.shadowBlur = block.id === TARGET_ID ? 14 : 7;
        context.font = '700 16px monospace';
        context.fillText(block.axis === 'h' ? '↔' : '↕', x + blockWidth / 2, y + blockHeight / 2);
        context.shadowBlur = 0;
      });
    }

    function renderPanel() {
      const level = GRIDLOCK_LEVELS[state.levelIndex];
      const panelX = 390;
      context.textAlign = 'left';
      context.textBaseline = 'alphabetic';
      context.fillStyle = '#69dce7';
      context.font = '800 11px monospace';
      context.fillText('GRIDLOCK CONTROL', panelX, 48);
      context.fillStyle = palette.muted;
      context.font = '700 11px monospace';
      context.fillText('STAGE', panelX, 88);
      context.fillStyle = palette.lime;
      context.font = '800 28px monospace';
      context.fillText(`${state.levelIndex + 1} / ${GRIDLOCK_LEVELS.length}`, panelX, 116);
      context.fillStyle = palette.muted;
      context.font = '700 11px monospace';
      context.fillText('MOVES', panelX, 158);
      context.fillStyle = palette.text;
      context.font = '800 24px monospace';
      context.fillText(`${state.moves}`, panelX, 185);
      context.fillStyle = palette.muted;
      context.font = '700 11px monospace';
      context.fillText(`PAR ${level.par}`, panelX + 82, 185);
      context.fillStyle = palette.lime;
      context.font = '700 12px monospace';
      context.fillText('▰ CORE → EXIT', panelX, 236);
      context.fillStyle = palette.muted;
      context.font = '700 10px monospace';
      context.fillText('DRAG BLOCKS', panelX, 270);
      context.fillText('SPACE: NEXT BLOCK', panelX, 290);
      if (state.clearDelay > 0) {
        context.fillStyle = palette.lime;
        context.font = '800 17px monospace';
        context.fillText('STAGE CLEAR!', panelX, 326);
      }
    }

    function render() {
      drawBackdrop(context, width, height);
      renderBoard();
      renderPanel();
    }

    return {
      init,
      update,
      render,
      onAction,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      destroy() {
        state.finished = true;
        state.drag = null;
        state.blocks.length = 0;
      },
    };
  },
};
