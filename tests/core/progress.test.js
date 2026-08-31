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
  assert.equal(progress.getSnapshot().recentRuns.length, 2);
  assert.equal(progress.getSnapshot().version, 2);
});

test('v1 통계는 기존 점수와 업적을 유지하며 v2 상세 기록으로 마이그레이션된다', () => {
  global.window = { localStorage: new MemoryStorage() };
  window.localStorage.setItem('dolldom-progress', JSON.stringify({
    version: 1,
    totalPlays: 3,
    totalCompleted: 2,
    totalScore: 1500,
    achievements: ['first-play'],
    games: {
      runner: { plays: 3, completed: 2, totalScore: 1500, bestRun: 1100, clears: 0 },
    },
  }));

  const progress = createProgressManager(['runner']);
  const snapshot = progress.getSnapshot();
  assert.equal(snapshot.version, 2);
  assert.equal(snapshot.games.runner.bestRun, 1100);
  assert.equal(snapshot.games.runner.lastScore, 0);
  assert.deepEqual(snapshot.recentRuns, []);
  assert.equal(JSON.parse(window.localStorage.getItem('dolldom-progress')).version, 2);
});

test('상세 통계는 평균 계산용 점수와 최근 기록을 최대 8개까지 보관한다', () => {
  global.window = { localStorage: new MemoryStorage() };
  let minute = 0;
  const progress = createProgressManager(['dodge'], {
    now: () => new Date(Date.UTC(2026, 7, 31, 7, minute++)),
  });
  for (let index = 0; index < 10; index += 1) {
    progress.recordStart('dodge');
    progress.recordEnd('dodge', index * 100, '종료');
  }

  const snapshot = progress.getSnapshot();
  assert.equal(snapshot.games.dodge.plays, 10);
  assert.equal(snapshot.games.dodge.totalScore, 4500);
  assert.equal(snapshot.games.dodge.lastScore, 900);
  assert.equal(snapshot.recentRuns.length, 8);
  assert.equal(snapshot.recentRuns[0].score, 900);
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
