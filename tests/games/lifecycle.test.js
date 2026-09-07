import assert from 'node:assert/strict';
import test from 'node:test';

import { createGameRegistry, games } from '../../src/games/index.js';
import {
  createDiveBoard,
  isLogicallySolvable,
  isNeighborCell,
  SWEEPER_DIFFICULTIES,
  toggleCellFlag,
} from '../../src/games/sweeper/game.js';
import { getMinimumMoves, GRIDLOCK_LEVELS } from '../../src/games/gridlock/game.js';
import { findReachableAnchor, TETHER_LEVELS } from '../../src/games/tether/game.js';

function createContextStub() {
  const gradient = { addColorStop() {} };
  const methods = new Set([
    'arc',
    'beginPath',
    'closePath',
    'ellipse',
    'fill',
    'fillRect',
    'fillText',
    'lineTo',
    'moveTo',
    'restore',
    'rotate',
    'roundRect',
    'save',
    'setLineDash',
    'stroke',
    'strokeRect',
    'translate',
  ]);

  return new Proxy(
    {
      createRadialGradient() {
        return gradient;
      },
    },
    {
      get(target, property) {
        if (property in target) return target[property];
        if (methods.has(property)) return () => {};
        return undefined;
      },
      set(target, property, value) {
        target[property] = value;
        return true;
      },
    },
  );
}

test('모든 게임 모듈은 독립 생명주기를 오류 없이 수행한다', () => {
  assert.equal(new Set(games.map((game) => game.id)).size, games.length);

  games.forEach((definition) => {
    const scores = [];
    const game = definition.create({
      context: createContextStub(),
      width: 720,
      height: 360,
      input: { isPressed() { return false; } },
      sound: { play() {}, tone() {} },
      settings: { get() { return undefined; } },
      onScore(score) {
        scores.push(score);
      },
      onEnd() {},
    });

    game.init();
    game.update(1 / 60);
    game.render();
    game.onAction?.('action');
    game.onPointerDown?.(80, 50);
    game.destroy();

    assert.ok(scores.length > 0, `${definition.id} 게임이 점수를 알리지 않았습니다.`);
    assert.ok(scores.every(Number.isFinite), `${definition.id} 게임 점수가 유효하지 않습니다.`);
  });
});

test('게임 레지스트리는 중복 id와 불완전한 정의를 거부한다', () => {
  assert.throws(() => createGameRegistry([games[0], games[0]]), /게임 id는 서로 달라야/);
  assert.throws(
    () => createGameRegistry([{ id: 'broken', name: 'BROKEN' }]),
    /title 값이 필요합니다/,
  );
});

test('글리치 메모리는 공통 키보드 액션으로 플레이할 수 있다', () => {
  const sounds = [];
  const game = games.find(({ id }) => id === 'memory').create({
    context: createContextStub(),
    width: 720,
    height: 360,
    sound: { play(name) { sounds.push(name); } },
    onScore() {},
    onEnd() {},
  });

  game.init();
  game.onAction('right');
  game.onAction('action');
  game.destroy();

  assert.ok(sounds.includes('flip'));
});

test('심해 로그 스위퍼 보드는 안전한 시작점과 유효한 위험 신호를 만든다', () => {
  const board = createDiveBoard(() => 0.42);
  const hazards = board.filter(({ kind }) => kind === 'hazard');
  const logs = board.filter(({ kind }) => kind === 'log');

  assert.equal(board.length, 60);
  assert.equal(hazards.length, 9);
  assert.equal(logs.length, 3);
  assert.equal(board[0].kind, 'safe');
  assert.equal(board[1].kind, 'safe');
  assert.equal(board[10].kind, 'safe');
  assert.equal(board[59].kind, 'exit');

  board.forEach((cell, index) => {
    const column = index % 10;
    const row = Math.floor(index / 10);
    const nearbyHazards = board.filter((candidate, candidateIndex) => {
      const candidateColumn = candidateIndex % 10;
      const candidateRow = Math.floor(candidateIndex / 10);
      return candidateIndex !== index
        && candidate.kind === 'hazard'
        && Math.abs(candidateColumn - column) <= 1
        && Math.abs(candidateRow - row) <= 1;
    }).length;
    assert.equal(cell.adjacentHazards, nearbyHazards);
  });
});

test('심해 로그 스위퍼는 난이도별 크기와 위험 수를 적용하고 추리 가능한 보드만 만든다', () => {
  Object.values(SWEEPER_DIFFICULTIES).forEach((difficulty) => {
    const board = createDiveBoard(() => 0.42, difficulty.id);
    assert.equal(board.length, difficulty.columns * difficulty.rows);
    assert.equal(board.filter(({ kind }) => kind === 'hazard').length, difficulty.hazards);
    assert.equal(board.filter(({ kind }) => kind === 'log').length, difficulty.logs);
    assert.equal(board.at(-1).kind, 'exit');
    assert.equal(isLogicallySolvable(board, difficulty), true);
  });
});

test('심해 로그 스위퍼는 선택 칸과 인접한 최대 8칸만 범위로 판정한다', () => {
  const centerNeighbors = Array.from({ length: 60 }, (_value, index) => index)
    .filter((index) => isNeighborCell(index, 22));
  const cornerNeighbors = Array.from({ length: 60 }, (_value, index) => index)
    .filter((index) => isNeighborCell(index, 0));

  assert.deepEqual(centerNeighbors, [11, 12, 13, 21, 23, 31, 32, 33]);
  assert.deepEqual(cornerNeighbors, [1, 10, 11]);
  assert.equal(isNeighborCell(22, 22), false);
});

test('심해 로그 스위퍼 깃발은 숨은 칸에서만 제한 개수 안에 토글된다', () => {
  const hiddenCell = { kind: 'safe', revealed: false, flagged: false };
  let flagCount = toggleCellFlag(hiddenCell, 0, 1);
  assert.equal(flagCount, 1);
  assert.equal(hiddenCell.flagged, true);

  const anotherCell = { kind: 'hazard', revealed: false, flagged: false };
  assert.equal(toggleCellFlag(anotherCell, flagCount, 1), 1);
  assert.equal(anotherCell.flagged, false);

  flagCount = toggleCellFlag(hiddenCell, flagCount, 1);
  assert.equal(flagCount, 0);
  assert.equal(hiddenCell.flagged, false);
  assert.equal(toggleCellFlag({ kind: 'safe', revealed: true, flagged: false }, 0, 1), 0);
  assert.equal(toggleCellFlag({ kind: 'exit', revealed: false, flagged: false }, 0, 1), 0);
});

test('심해 로그 스위퍼는 공통 방향·액션 입력과 deltaTime 산소를 처리한다', () => {
  const sounds = [];
  const scores = [];
  const endings = [];
  const game = games.find(({ id }) => id === 'sweeper').create({
    context: createContextStub(),
    width: 720,
    height: 360,
    sound: { play(name) { sounds.push(name); } },
    onScore(score) { scores.push(score); },
    onEnd(message) { endings.push(message); },
  });

  game.init();
  game.onAction('right');
  game.onAction('mark');
  game.onAction('guide');
  game.onAction('guide');
  game.onAction('action');
  game.update(91);
  game.render();
  game.destroy();

  assert.ok(sounds.includes('select'));
  assert.ok(scores.every(Number.isFinite));
  assert.deepEqual(endings, ['산소가 모두 소진됐어요!']);
});

test('심해 로그 스위퍼 연습 모드는 시간이 지나도 산소로 종료되지 않는다', () => {
  const endings = [];
  const game = games.find(({ id }) => id === 'sweeper').create({
    context: createContextStub(),
    width: 720,
    height: 360,
    getMode() { return 'practice'; },
    sound: { play() {} },
    onScore() {},
    onEnd(message) { endings.push(message); },
  });

  game.init();
  game.update(600);
  game.render();
  game.destroy();

  assert.deepEqual(endings, []);
});

test('네온 블록 탈출의 모든 스테이지는 유효하고 목표 이동 수로 해결된다', () => {
  assert.equal(GRIDLOCK_LEVELS.length, 8);
  GRIDLOCK_LEVELS.forEach((level, index) => {
    assert.equal(getMinimumMoves(level), level.par, `${index + 1} 스테이지의 PAR가 잘못되었습니다.`);
  });
});

test('네온 테더는 범위 안에서 가장 가까운 상단 앵커를 선택한다', () => {
  const result = findReachableAnchor(
    { x: 100, y: 220 },
    [{ x: 180, y: 100 }, { x: 120, y: 390 }, { x: 500, y: 80 }],
  );
  assert.equal(result.index, 0);
  assert.equal(TETHER_LEVELS.length, 12);
  TETHER_LEVELS.forEach((level) => {
    assert.equal(level.start.velocityX, 0);
    assert.equal(level.start.y, level.pads[0].y - 12);
  });
});

test('네온 테더는 공통 액션을 누르고 놓아 연결과 해제를 처리한다', () => {
  let pressed = true;
  const sounds = [];
  const game = games.find(({ id }) => id === 'tether').create({
    context: createContextStub(),
    width: 720,
    height: 360,
    input: { isPressed() { return pressed; } },
    sound: { play(name) { sounds.push(name); } },
    onScore() {},
    onEnd() {},
  });

  game.init();
  game.onAction('action');
  game.update(1 / 60);
  pressed = false;
  game.update(1 / 60);
  game.render();
  game.destroy();

  assert.ok(sounds.includes('flip'));
  assert.ok(sounds.includes('select'));
});
