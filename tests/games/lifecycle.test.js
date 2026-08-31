import assert from 'node:assert/strict';
import test from 'node:test';

import { createGameRegistry, games } from '../../src/games/index.js';

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
      input: {},
      sound: { play() {}, tone() {} },
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
