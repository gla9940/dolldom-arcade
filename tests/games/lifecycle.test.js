import assert from 'node:assert/strict';
import test from 'node:test';

import { createGameRegistry, games } from '../../src/games/index.js';
import { getDodgeDifficulty } from '../../src/games/dodge/game.js';

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

test('deltaTime 기반 게임 속도는 60Hz와 144Hz에서 동일하다', () => {
  function simulate(frameRate) {
    const scores = [];
    const game = games.find(({ id }) => id === 'dodge').create({
      context: createContextStub(),
      width: 720,
      height: 360,
      input: { isPressed() { return false; } },
      sound: { play() {}, tone() {} },
      settings: { get() { return undefined; } },
      onScore(score) { scores.push(score); },
      onEnd() {},
    });
    game.init();
    for (let frame = 0; frame < frameRate; frame += 1) game.update(1 / frameRate);
    game.destroy();
    return scores.at(-1);
  }

  assert.ok(Math.abs(simulate(60) - simulate(144)) < 0.001);
});

test('게임 레지스트리는 중복 id와 불완전한 정의를 거부한다', () => {
  assert.throws(() => createGameRegistry([games[0], games[0]]), /게임 id는 서로 달라야/);
  assert.throws(
    () => createGameRegistry([{ id: 'broken', name: 'BROKEN' }]),
    /title 값이 필요합니다/,
  );
});

test('보이드 드리프터는 안전한 초반 이후 세 단계로 난이도가 상승한다', () => {
  const opening = getDodgeDifficulty(0);
  const middle = getDodgeDifficulty(16);
  const late = getDodgeDifficulty(40);

  assert.deepEqual([opening.wave, middle.wave, late.wave], [1, 2, 3]);
  assert.ok(opening.spawnInterval > middle.spawnInterval);
  assert.ok(middle.spawnInterval > late.spawnInterval);
  assert.ok(late.spawnInterval >= 0.36);
});

test('포인터 중심 게임도 공통 키보드 액션으로 플레이할 수 있다', () => {
  for (const gameId of ['memory', 'reaction']) {
    const sounds = [];
    const definition = games.find((game) => game.id === gameId);
    const game = definition.create({
      context: createContextStub(),
      width: 720,
      height: 360,
      sound: { play(name) { sounds.push(name); } },
      onScore() {},
      onEnd() {},
    });

    game.init();
    game.update(gameId === 'reaction' ? 0.5 : 1 / 60);
    if (gameId === 'memory') game.onAction('right');
    game.onAction('action');
    game.destroy();

    assert.ok(
      sounds.includes(gameId === 'memory' ? 'flip' : 'catch'),
      `${gameId} 게임의 키보드 액션이 적용되지 않았습니다.`,
    );
  }
});
