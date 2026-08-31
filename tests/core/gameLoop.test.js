import assert from 'node:assert/strict';
import test from 'node:test';

import { createGameLoop } from '../../src/core/gameLoop.js';

test('게임 루프는 중복 시작을 막고 deltaTime을 제한한다', () => {
  let nextFrame;
  let frameId = 0;
  const cancelledFrames = [];
  const deltaTimes = [];
  let renderCount = 0;

  global.window = {
    requestAnimationFrame(callback) {
      nextFrame = callback;
      frameId += 1;
      return frameId;
    },
    cancelAnimationFrame(id) {
      cancelledFrames.push(id);
    },
  };

  const loop = createGameLoop({
    update(deltaTime) {
      deltaTimes.push(deltaTime);
    },
    render() {
      renderCount += 1;
    },
    maxDelta: 1 / 30,
  });

  loop.start();
  loop.start();
  assert.equal(frameId, 1);
  assert.equal(loop.isRunning, true);

  nextFrame(1000);
  nextFrame(1100);

  assert.deepEqual(deltaTimes, [0, 1 / 30]);
  assert.equal(renderCount, 2);

  loop.stop();
  assert.equal(loop.isRunning, false);
  assert.deepEqual(cancelledFrames, [3]);
});
