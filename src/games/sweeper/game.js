import { drawBackdrop, drawRoundRect, palette } from '../shared/rendering.js';

const COLUMNS = 10;
const ROWS = 6;
const CELL_STEP = 48;
const CELL_SIZE = 42;
const BOARD_X = 18;
const BOARD_Y = 36;
const HAZARD_COUNT = 9;
const LOG_COUNT = 3;
const STARTING_HULL = 3;
const STARTING_OXYGEN = 75;
const EXIT_INDEX = COLUMNS * ROWS - 1;

function getNeighbors(index) {
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  const neighbors = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const nextColumn = column + columnOffset;
      const nextRow = row + rowOffset;
      if (nextColumn < 0 || nextColumn >= COLUMNS || nextRow < 0 || nextRow >= ROWS) continue;
      neighbors.push(nextRow * COLUMNS + nextColumn);
    }
  }

  return neighbors;
}

function shuffle(values, random) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [values[index], values[randomIndex]] = [values[randomIndex], values[index]];
  }
  return values;
}

export function createDiveBoard(random = Math.random) {
  const cells = Array.from({ length: COLUMNS * ROWS }, () => ({
    kind: 'safe',
    revealed: false,
    flagged: false,
    collected: false,
    adjacentHazards: 0,
  }));
  const protectedIndexes = new Set([0, 1, COLUMNS, COLUMNS + 1, EXIT_INDEX]);
  const candidates = shuffle(
    cells.map((_cell, index) => index).filter((index) => !protectedIndexes.has(index)),
    random,
  );

  candidates.slice(0, HAZARD_COUNT).forEach((index) => {
    cells[index].kind = 'hazard';
  });
  candidates.slice(HAZARD_COUNT, HAZARD_COUNT + LOG_COUNT).forEach((index) => {
    cells[index].kind = 'log';
  });
  cells[EXIT_INDEX].kind = 'exit';

  cells.forEach((cell, index) => {
    cell.adjacentHazards = getNeighbors(index)
      .filter((neighborIndex) => cells[neighborIndex].kind === 'hazard').length;
  });
  cells[0].revealed = true;
  return cells;
}

export function toggleCellFlag(cell, flagCount, maxFlags = HAZARD_COUNT) {
  if (!cell || cell.revealed || cell.kind === 'exit') return flagCount;
  if (cell.flagged) {
    cell.flagged = false;
    return Math.max(0, flagCount - 1);
  }
  if (flagCount >= maxFlags) return flagCount;
  cell.flagged = true;
  return flagCount + 1;
}

export const sweeperGame = {
  id: 'sweeper',
  name: 'ABYSS LOG SWEEPER',
  title: '심해 로그 스위퍼',
  kicker: 'GAME 06 / EXPLORE',
  copy: '위험 신호를 읽고 데이터 로그 3개를 회수한 뒤 탈출 지점으로 이동하세요.',
  hint: 'ARROWS — 탐색 · SPACE — 조사 · F / 우클릭 — 깃발',
  accessibility: '10열 6행의 심해 탐사 구역입니다. 방향키로 조사 위치를 옮기고 스페이스 또는 Enter로 칸을 조사합니다. F키, 마우스 우클릭 또는 모바일 깃발 버튼으로 예상 위험 칸을 표시합니다. 숫자는 주변 여덟 칸의 위험 개수이며, 데이터 로그 세 개를 찾은 뒤 오른쪽 아래 탈출 지점을 조사하면 성공합니다.',
  ariaKeyShortcuts: 'ArrowLeft ArrowRight ArrowUp ArrowDown Space Enter F Escape',
  touchControls: ['left', 'up', 'down', 'right', 'action', 'mark'],
  card: {
    badge: 'NEW · ROGUE PUZZLE',
    icon: '◉',
    theme: 'six',
    summary: '위험을 읽고 로그를 회수하세요',
    difficulty: '보통',
    estimatedTime: '1~2분',
    controls: 'SCAN / FLAG',
  },

  create({ context, width, height, onScore, onEnd, sound }) {
    let state;

    function getScore() {
      return Math.max(0, Math.floor(state.score));
    }

    function revealSafeRegion(startIndex) {
      const pending = [startIndex];
      const visited = new Set();

      while (pending.length) {
        const index = pending.pop();
        if (visited.has(index)) continue;
        visited.add(index);
        const cell = state.cells[index];
        if (!cell || cell.revealed || cell.flagged || cell.kind !== 'safe') continue;
        cell.revealed = true;
        state.score += 35;
        if (cell.adjacentHazards === 0) {
          getNeighbors(index).forEach((neighborIndex) => {
            if (state.cells[neighborIndex].kind === 'safe') pending.push(neighborIndex);
          });
        }
      }
    }

    function probe(index) {
      if (state.finished) return;
      const cell = state.cells[index];
      if (!cell || cell.flagged) return;

      if (cell.kind === 'exit') {
        cell.revealed = true;
        if (state.logs < LOG_COUNT) {
          sound.play('wrong');
          return;
        }
        state.finished = true;
        state.score += Math.round(state.oxygen * 12 + state.hull * 180);
        onScore(getScore());
        onEnd('심해 로그 복구 완료!', getScore());
        return;
      }

      if (cell.revealed) return;
      if (cell.kind === 'hazard') {
        cell.revealed = true;
        state.hull -= 1;
        state.score = Math.max(0, state.score - 90);
        sound.play('hit');
        if (state.hull <= 0) {
          state.finished = true;
          onEnd('잠수정 선체 파손!', getScore());
        }
      } else if (cell.kind === 'log') {
        cell.revealed = true;
        cell.collected = true;
        state.logs += 1;
        state.score += 320;
        sound.play('match');
      } else {
        revealSafeRegion(index);
        sound.play('flip');
      }
      onScore(getScore());
    }

    function init() {
      state = {
        cells: createDiveBoard(),
        cursorIndex: 0,
        hull: STARTING_HULL,
        oxygen: STARTING_OXYGEN,
        logs: 0,
        flags: 0,
        score: 0,
        finished: false,
      };
      revealSafeRegion(0);
      onScore(0);
    }

    function update(deltaTime) {
      if (state.finished) return;
      state.oxygen = Math.max(0, state.oxygen - deltaTime);
      if (state.oxygen <= 0) {
        state.finished = true;
        onEnd('산소가 모두 소진됐어요!', getScore());
      }
    }

    function moveCursor(action) {
      const column = state.cursorIndex % COLUMNS;
      const row = Math.floor(state.cursorIndex / COLUMNS);
      const nextColumn = action === 'left'
        ? Math.max(0, column - 1)
        : action === 'right' ? Math.min(COLUMNS - 1, column + 1) : column;
      const nextRow = action === 'up'
        ? Math.max(0, row - 1)
        : action === 'down' ? Math.min(ROWS - 1, row + 1) : row;
      const nextIndex = nextRow * COLUMNS + nextColumn;
      if (nextIndex === state.cursorIndex) return;
      state.cursorIndex = nextIndex;
      sound.play('select');
    }

    function onAction(action) {
      if (action === 'action') probe(state.cursorIndex);
      else if (action === 'mark') toggleFlag(state.cursorIndex);
      else moveCursor(action);
    }

    function toggleFlag(index) {
      if (state.finished) return;
      const cell = state.cells[index];
      const nextFlagCount = toggleCellFlag(cell, state.flags);
      if (nextFlagCount === state.flags) {
        if (cell && !cell.revealed && !cell.flagged && cell.kind !== 'exit') sound.play('wrong');
        return;
      }
      state.flags = nextFlagCount;
      sound.play('select');
    }

    function onPointerDown(x, y, pointer = {}) {
      const column = Math.floor((x - BOARD_X) / CELL_STEP);
      const row = Math.floor((y - BOARD_Y) / CELL_STEP);
      if (column < 0 || column >= COLUMNS || row < 0 || row >= ROWS) return;
      state.cursorIndex = row * COLUMNS + column;
      if (pointer.button === 2) toggleFlag(state.cursorIndex);
      else probe(state.cursorIndex);
    }

    function renderCell(cell, index) {
      const column = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      const x = BOARD_X + column * CELL_STEP;
      const y = BOARD_Y + row * CELL_STEP;
      const isCursor = index === state.cursorIndex;
      const isExit = cell.kind === 'exit';
      let fill = '#0d1420';
      let stroke = '#25435b';

      if (cell.flagged) {
        fill = '#24152f';
        stroke = palette.pink;
      } else if (cell.revealed) {
        fill = cell.kind === 'hazard' ? '#35101d' : '#112b32';
        stroke = cell.kind === 'hazard' ? palette.danger : '#36b7c4';
      } else if (isExit) {
        stroke = state.logs === LOG_COUNT ? palette.lime : '#635675';
      }
      drawRoundRect(context, x, y, CELL_SIZE, CELL_SIZE, 6, fill, stroke);

      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = '700 17px monospace';
      context.fillStyle = palette.muted;
      context.shadowBlur = 0;
      let symbol = '·';
      if (cell.flagged) {
        symbol = '⚑';
        context.fillStyle = palette.pink;
        context.shadowColor = palette.pink;
        context.shadowBlur = 10;
      } else if (cell.revealed && cell.kind === 'hazard') {
        symbol = '✕';
        context.fillStyle = palette.danger;
      } else if (cell.revealed && cell.kind === 'log') {
        symbol = '▣';
        context.fillStyle = palette.lime;
        context.shadowColor = palette.lime;
        context.shadowBlur = 10;
      } else if (cell.revealed && cell.kind === 'exit') {
        symbol = state.logs === LOG_COUNT ? '⇥' : '⊠';
        context.fillStyle = state.logs === LOG_COUNT ? palette.lime : palette.muted;
      } else if (cell.revealed && cell.kind === 'safe') {
        symbol = cell.adjacentHazards ? String(cell.adjacentHazards) : '○';
        context.fillStyle = cell.adjacentHazards >= 3 ? palette.pink : '#69dce7';
      } else if (isExit) {
        symbol = 'E';
      }
      context.fillText(symbol, x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 1);
      context.shadowBlur = 0;

      if (isCursor) {
        context.strokeStyle = palette.lime;
        context.lineWidth = 3;
        context.strokeRect(x - 3, y - 3, CELL_SIZE + 6, CELL_SIZE + 6);
      }
    }

    function renderPanel() {
      const panelX = 518;
      context.textAlign = 'left';
      context.textBaseline = 'alphabetic';
      context.fillStyle = '#69dce7';
      context.font = '800 11px monospace';
      context.fillText('ABYSS DIVE // 06', panelX, 49);

      context.fillStyle = palette.muted;
      context.font = '700 11px monospace';
      context.fillText('HULL', panelX, 86);
      context.fillStyle = state.hull === 1 ? palette.danger : palette.lime;
      context.font = '700 19px monospace';
      context.fillText('◆'.repeat(Math.max(0, state.hull)), panelX, 108);

      context.fillStyle = palette.muted;
      context.font = '700 11px monospace';
      context.fillText('FLAGS', panelX + 102, 86);
      context.fillStyle = palette.pink;
      context.font = '800 16px monospace';
      context.fillText(`${state.flags}/${HAZARD_COUNT}`, panelX + 102, 108);

      context.fillStyle = palette.muted;
      context.font = '700 11px monospace';
      context.fillText('DATA LOGS', panelX, 145);
      context.fillStyle = state.logs === LOG_COUNT ? palette.lime : palette.text;
      context.font = '800 22px monospace';
      context.fillText(`${state.logs} / ${LOG_COUNT}`, panelX, 171);

      context.fillStyle = palette.muted;
      context.font = '700 11px monospace';
      context.fillText('OXYGEN', panelX, 210);
      context.fillStyle = '#12101c';
      context.fillRect(panelX, 222, 168, 12);
      context.fillStyle = state.oxygen < 15 ? palette.danger : '#69dce7';
      context.fillRect(panelX, 222, 168 * (state.oxygen / STARTING_OXYGEN), 12);
      context.fillStyle = palette.text;
      context.font = '700 12px monospace';
      context.fillText(`${Math.ceil(state.oxygen)} SEC`, panelX, 254);

      context.fillStyle = state.logs === LOG_COUNT ? palette.lime : palette.muted;
      context.font = '700 10px monospace';
      context.fillText(state.logs === LOG_COUNT ? 'EXIT ONLINE  ⇥' : 'FIND 3 LOGS', panelX, 296);
      context.fillStyle = palette.muted;
      context.fillText('NUMBER = NEARBY RISK', panelX, 318);
    }

    function render() {
      drawBackdrop(context, width, height);
      context.fillStyle = '#07141ccc';
      context.fillRect(0, 0, width, height);
      state.cells.forEach(renderCell);
      renderPanel();
    }

    return {
      init,
      update,
      render,
      onAction,
      onPointerDown,
      destroy() {
        state.finished = true;
        state.cells.length = 0;
      },
    };
  },
};
