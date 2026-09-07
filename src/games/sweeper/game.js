import { drawBackdrop, drawRoundRect, palette } from '../shared/rendering.js';

const BOARD_X = 18;
const BOARD_Y = 36;
const BOARD_WIDTH = 480;
const BOARD_HEIGHT = 306;
const MAX_BOARD_ATTEMPTS = 2000;

export const SWEEPER_DIFFICULTIES = Object.freeze({
  easy: Object.freeze({ id: 'easy', label: '이지', columns: 10, rows: 6, hazards: 9, logs: 3, hull: 3, oxygen: 90 }),
  medium: Object.freeze({ id: 'medium', label: '미디움', columns: 12, rows: 7, hazards: 14, logs: 4, hull: 3, oxygen: 120 }),
  hard: Object.freeze({ id: 'hard', label: '하드', columns: 14, rows: 8, hazards: 22, logs: 5, hull: 2, oxygen: 150 }),
});

function getNeighbors(index, columns, rows) {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const neighbors = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const nextColumn = column + columnOffset;
      const nextRow = row + rowOffset;
      if (nextColumn < 0 || nextColumn >= columns || nextRow < 0 || nextRow >= rows) continue;
      neighbors.push(nextRow * columns + nextColumn);
    }
  }

  return neighbors;
}

export function isNeighborCell(index, selectedIndex, columns = 10) {
  if (index === selectedIndex) return false;
  const column = index % columns;
  const row = Math.floor(index / columns);
  const selectedColumn = selectedIndex % columns;
  const selectedRow = Math.floor(selectedIndex / columns);
  return Math.abs(column - selectedColumn) <= 1 && Math.abs(row - selectedRow) <= 1;
}

function shuffle(values, random) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [values[index], values[randomIndex]] = [values[randomIndex], values[index]];
  }
  return values;
}

function buildBoard(config, random) {
  const exitIndex = config.columns * config.rows - 1;
  const cells = Array.from({ length: config.columns * config.rows }, () => ({
    kind: 'safe',
    revealed: false,
    flagged: false,
    collected: false,
    adjacentHazards: 0,
  }));
  const protectedIndexes = new Set([0, 1, config.columns, config.columns + 1, exitIndex]);
  const candidates = shuffle(
    cells.map((_cell, index) => index).filter((index) => !protectedIndexes.has(index)),
    random,
  );

  candidates.slice(0, config.hazards).forEach((index) => {
    cells[index].kind = 'hazard';
  });
  candidates.slice(config.hazards, config.hazards + config.logs).forEach((index) => {
    cells[index].kind = 'log';
  });
  cells[exitIndex].kind = 'exit';

  cells.forEach((cell, index) => {
    cell.adjacentHazards = getNeighbors(index, config.columns, config.rows)
      .filter((neighborIndex) => cells[neighborIndex].kind === 'hazard').length;
  });
  cells[0].revealed = true;
  return cells;
}

export function isLogicallySolvable(cells, config = SWEEPER_DIFFICULTIES.easy) {
  const revealed = new Set();
  const flagged = new Set();

  function revealSafeRegion(startIndex) {
    const pending = [startIndex];
    while (pending.length) {
      const index = pending.pop();
      const cell = cells[index];
      if (!cell || revealed.has(index) || cell.kind === 'hazard' || cell.kind === 'exit') continue;
      revealed.add(index);
      if (cell.kind === 'safe' && cell.adjacentHazards === 0) {
        getNeighbors(index, config.columns, config.rows).forEach((neighborIndex) => {
          if (cells[neighborIndex].kind === 'safe') pending.push(neighborIndex);
        });
      }
    }
  }

  revealSafeRegion(0);
  let changed = true;
  while (changed) {
    changed = false;
    [...revealed].forEach((index) => {
      const clue = cells[index];
      if (clue.kind !== 'safe' && clue.kind !== 'log') return;
      const neighbors = getNeighbors(index, config.columns, config.rows)
        .filter((neighborIndex) => cells[neighborIndex].kind !== 'exit');
      const markedCount = neighbors.filter((neighborIndex) => flagged.has(neighborIndex)).length;
      const unknown = neighbors.filter((neighborIndex) => (
        !revealed.has(neighborIndex) && !flagged.has(neighborIndex)
      ));
      if (!unknown.length) return;

      if (clue.adjacentHazards === markedCount) {
        unknown.forEach((neighborIndex) => {
          if (cells[neighborIndex].kind !== 'hazard' && !revealed.has(neighborIndex)) {
            revealSafeRegion(neighborIndex);
            changed = true;
          }
        });
      } else if (clue.adjacentHazards - markedCount === unknown.length) {
        unknown.forEach((neighborIndex) => {
          if (!flagged.has(neighborIndex)) {
            flagged.add(neighborIndex);
            changed = true;
          }
        });
      }
    });
  }

  return cells.every((cell, index) => (
    cell.kind === 'hazard' || cell.kind === 'exit' || revealed.has(index)
  ));
}

export function createDiveBoard(random = Math.random, difficultyId = 'easy') {
  const config = SWEEPER_DIFFICULTIES[difficultyId] ?? SWEEPER_DIFFICULTIES.easy;
  for (let attempt = 0; attempt < MAX_BOARD_ATTEMPTS; attempt += 1) {
    const offset = ((attempt + 1) * 0.618033988749895) % 1;
    const attemptRandom = () => (random() + offset) % 1;
    const cells = buildBoard(config, attemptRandom);
    if (isLogicallySolvable(cells, config)) return cells;
  }
  throw new Error(`${config.label} 난이도의 추리 가능한 보드를 생성하지 못했습니다.`);
}

export function toggleCellFlag(cell, flagCount, maxFlags = SWEEPER_DIFFICULTIES.easy.hazards) {
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
  kicker: 'GAME 02 / EXPLORE',
  copy: '난이도를 고르고 위험 신호만으로 데이터 로그를 회수한 뒤 탈출하세요.',
  hint: 'ARROWS — 탐색 · SPACE — 조사 · F — 깃발 · G — 범위 표시',
  accessibility: '난이도별 심해 탐사 구역입니다. 방향키로 조사 위치를 옮기고 스페이스 또는 Enter로 칸을 조사합니다. 선택한 칸의 주변 여덟 칸은 청록색 점선으로 은은하게 표시되며 G키 또는 모바일 범위 버튼으로 끌 수 있습니다. F키, 마우스 우클릭 또는 모바일 깃발 버튼으로 예상 위험 칸을 표시합니다. 숫자는 주변 여덟 칸의 위험 개수이며, 데이터 로그 칸도 회수 후 숫자 단서를 표시합니다. 모든 보드는 추리만으로 풀 수 있도록 검증됩니다.',
  ariaKeyShortcuts: 'ArrowLeft ArrowRight ArrowUp ArrowDown Space Enter F G Escape',
  touchControls: ['left', 'up', 'down', 'right', 'action', 'mark', 'guide'],
  defaultMode: 'normal',
  modes: [
    { id: 'practice', label: '연습 모드', description: '시간 무제한', record: false },
    { id: 'normal', label: '일반 모드', description: '난이도별 제한 시간', record: true },
  ],
  defaultDifficulty: 'easy',
  difficulties: [
    { id: 'easy', label: '이지', description: '10×6 · 위험 9 · 로그 3' },
    { id: 'medium', label: '미디움', description: '12×7 · 위험 14 · 로그 4' },
    { id: 'hard', label: '하드', description: '14×8 · 위험 22 · 로그 5' },
  ],
  card: {
    badge: 'NEW · ROGUE PUZZLE',
    icon: '◉',
    theme: 'six',
    summary: '위험을 읽고 로그를 회수하세요',
    difficulty: '이지~하드',
    estimatedTime: '1~2분',
    controls: 'SCAN / FLAG',
  },

  create({ context, width, height, onScore, onEnd, sound, getMode, getDifficulty }) {
    let state;

    function getConfig() {
      return SWEEPER_DIFFICULTIES[getDifficulty?.()] ?? SWEEPER_DIFFICULTIES.easy;
    }

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
          getNeighbors(index, state.config.columns, state.config.rows).forEach((neighborIndex) => {
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
        if (state.logs < state.config.logs) {
          sound.play('wrong');
          return;
        }
        state.finished = true;
        state.score += state.practice
          ? state.hull * 180
          : Math.round(state.oxygen * 12 + state.hull * 180);
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
        config: getConfig(),
        cells: [],
        cursorIndex: 0,
        hull: 0,
        oxygen: 0,
        logs: 0,
        flags: 0,
        rangeGuide: true,
        practice: getMode?.() === 'practice',
        score: 0,
        finished: false,
      };
      state.cells = createDiveBoard(Math.random, state.config.id);
      state.hull = state.config.hull;
      state.oxygen = state.config.oxygen;
      revealSafeRegion(0);
      onScore(0);
    }

    function update(deltaTime) {
      if (state.finished) return;
      if (state.practice) return;
      state.oxygen = Math.max(0, state.oxygen - deltaTime);
      if (state.oxygen <= 0) {
        state.finished = true;
        onEnd('산소가 모두 소진됐어요!', getScore());
      }
    }

    function moveCursor(action) {
      const column = state.cursorIndex % state.config.columns;
      const row = Math.floor(state.cursorIndex / state.config.columns);
      const nextColumn = action === 'left'
        ? Math.max(0, column - 1)
        : action === 'right' ? Math.min(state.config.columns - 1, column + 1) : column;
      const nextRow = action === 'up'
        ? Math.max(0, row - 1)
        : action === 'down' ? Math.min(state.config.rows - 1, row + 1) : row;
      const nextIndex = nextRow * state.config.columns + nextColumn;
      if (nextIndex === state.cursorIndex) return;
      state.cursorIndex = nextIndex;
      sound.play('select');
    }

    function onAction(action) {
      if (action === 'action') probe(state.cursorIndex);
      else if (action === 'mark') toggleFlag(state.cursorIndex);
      else if (action === 'guide') {
        state.rangeGuide = !state.rangeGuide;
        sound.play('select');
      }
      else moveCursor(action);
    }

    function toggleFlag(index) {
      if (state.finished) return;
      const cell = state.cells[index];
      const nextFlagCount = toggleCellFlag(cell, state.flags, state.config.hazards);
      if (nextFlagCount === state.flags) {
        if (cell && !cell.revealed && !cell.flagged && cell.kind !== 'exit') sound.play('wrong');
        return;
      }
      state.flags = nextFlagCount;
      sound.play('select');
    }

    function onPointerDown(x, y, pointer = {}) {
      const cellStep = Math.min(48, BOARD_WIDTH / state.config.columns, BOARD_HEIGHT / state.config.rows);
      const column = Math.floor((x - BOARD_X) / cellStep);
      const row = Math.floor((y - BOARD_Y) / cellStep);
      if (column < 0 || column >= state.config.columns || row < 0 || row >= state.config.rows) return;
      state.cursorIndex = row * state.config.columns + column;
      if (pointer.button === 2) toggleFlag(state.cursorIndex);
      else probe(state.cursorIndex);
    }

    function renderCell(cell, index) {
      const cellStep = Math.min(48, BOARD_WIDTH / state.config.columns, BOARD_HEIGHT / state.config.rows);
      const cellSize = cellStep - 6;
      const column = index % state.config.columns;
      const row = Math.floor(index / state.config.columns);
      const x = BOARD_X + column * cellStep;
      const y = BOARD_Y + row * cellStep;
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
        stroke = state.logs === state.config.logs ? palette.lime : '#635675';
      }
      drawRoundRect(context, x, y, cellSize, cellSize, 6, fill, stroke);

      if (state.rangeGuide && isNeighborCell(index, state.cursorIndex, state.config.columns)) {
        context.save();
        context.fillStyle = '#69dce70c';
        context.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        context.strokeStyle = '#69dce766';
        context.lineWidth = 1;
        context.setLineDash([3, 4]);
        context.strokeRect(x + 3, y + 3, cellSize - 6, cellSize - 6);
        context.restore();
      }

      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `700 ${Math.max(12, Math.min(17, cellSize * 0.42))}px monospace`;
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
        symbol = cell.adjacentHazards ? String(cell.adjacentHazards) : '○';
        context.fillStyle = palette.lime;
        context.shadowColor = palette.lime;
        context.shadowBlur = 10;
      } else if (cell.revealed && cell.kind === 'exit') {
        symbol = state.logs === state.config.logs ? '⇥' : '⊠';
        context.fillStyle = state.logs === state.config.logs ? palette.lime : palette.muted;
      } else if (cell.revealed && cell.kind === 'safe') {
        symbol = cell.adjacentHazards ? String(cell.adjacentHazards) : '○';
        context.fillStyle = cell.adjacentHazards >= 3 ? palette.pink : '#69dce7';
      } else if (isExit) {
        symbol = 'E';
      }
      context.fillText(symbol, x + cellSize / 2, y + cellSize / 2 + 1);
      if (cell.revealed && cell.kind === 'log') {
        context.fillStyle = palette.lime;
        context.fillRect(x + cellSize - 8, y + 4, 4, 4);
      }
      context.shadowBlur = 0;

      if (isCursor) {
        context.strokeStyle = palette.lime;
        context.lineWidth = 3;
        context.strokeRect(x - 3, y - 3, cellSize + 6, cellSize + 6);
      }
    }

    function renderPanel() {
      const panelX = 518;
      context.textAlign = 'left';
      context.textBaseline = 'alphabetic';
      context.fillStyle = '#69dce7';
      context.font = '800 11px monospace';
      context.fillText(`${state.practice ? 'PRACTICE' : 'ABYSS'} // ${state.config.label.toUpperCase()}`, panelX, 49);

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
      context.fillText(`${state.flags}/${state.config.hazards}`, panelX + 102, 108);

      context.fillStyle = palette.muted;
      context.font = '700 11px monospace';
      context.fillText('DATA LOGS', panelX, 145);
      context.fillStyle = state.logs === state.config.logs ? palette.lime : palette.text;
      context.font = '800 22px monospace';
      context.fillText(`${state.logs} / ${state.config.logs}`, panelX, 171);

      context.fillStyle = palette.muted;
      context.font = '700 11px monospace';
      context.fillText('OXYGEN', panelX, 210);
      context.fillStyle = '#12101c';
      context.fillRect(panelX, 222, 168, 12);
      context.fillStyle = state.oxygen < 15 && !state.practice ? palette.danger : '#69dce7';
      context.fillRect(
        panelX,
        222,
        state.practice ? 168 : 168 * (state.oxygen / state.config.oxygen),
        12,
      );
      context.fillStyle = palette.text;
      context.font = '700 12px monospace';
      context.fillText(state.practice ? 'UNLIMITED  ∞' : `${Math.ceil(state.oxygen)} SEC`, panelX, 254);

      context.fillStyle = state.logs === state.config.logs ? palette.lime : palette.muted;
      context.font = '700 10px monospace';
      context.fillText(state.logs === state.config.logs ? 'EXIT ONLINE  ⇥' : `FIND ${state.config.logs} LOGS`, panelX, 296);
      context.fillStyle = palette.muted;
      context.fillStyle = state.rangeGuide ? '#69dce7' : palette.muted;
      context.fillText(`8-CELL RANGE  ${state.rangeGuide ? 'ON' : 'OFF'}  [G]`, panelX, 318);
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
