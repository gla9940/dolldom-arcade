import assert from 'node:assert/strict';
import test from 'node:test';

import { createProgressManager } from '../../src/core/progress.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

test('진행 기록은 손상된 저장값을 복구하고 업적을 중복 지급하지 않는다', () => {
  global.window = { localStorage: new MemoryStorage() };
  window.localStorage.setItem('dolldom-progress', '{broken');
  const progress = createProgressManager(['runner', 'memory', 'reaction', 'dodge']);

  progress.recordStart('runner');
  const unlocked = progress.recordEnd('runner', 1200, '종료');
  assert.deepEqual(unlocked.map(({ id }) => id), ['first-play', 'runner-1000']);
  assert.equal(progress.recordEnd('runner', 500, '종료').length, 0);
  assert.equal(progress.getSnapshot().games.runner.bestRun, 1200);
});

test('기록 초기화는 통계와 게임별 최고 기록을 함께 삭제한다', () => {
  global.window = { localStorage: new MemoryStorage() };
  window.localStorage.setItem('dolldom-best-runner', '999');
  const progress = createProgressManager(['runner']);
  progress.recordStart('runner');
  progress.reset();

  assert.equal(progress.getSnapshot().totalPlays, 0);
  assert.equal(window.localStorage.getItem('dolldom-best-runner'), null);
  assert.equal(window.localStorage.getItem('dolldom-progress'), null);
});
