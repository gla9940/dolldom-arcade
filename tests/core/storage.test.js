import assert from 'node:assert/strict';
import test from 'node:test';

import { getBestScore, getMuted, saveBestScore, saveMuted } from '../../src/core/storage.js';

function useMemoryStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  global.window = {
    localStorage: {
      getItem(key) {
        return values.has(key) ? values.get(key) : null;
      },
      setItem(key, value) {
        values.set(key, value);
      },
    },
  };
  return values;
}

test('최고 점수는 정수로 정규화하고 기존 기록보다 낮아지지 않는다', () => {
  const values = useMemoryStorage({ 'dolldom-best-runner': '120' });

  assert.equal(saveBestScore('runner', 98.9), 120);
  assert.equal(saveBestScore('runner', 245.8), 245);
  assert.equal(saveBestScore('runner', Number.NaN), 245);
  assert.equal(values.get('dolldom-best-runner'), '245');
});

test('손상된 저장값과 localStorage 오류를 안전하게 처리한다', () => {
  useMemoryStorage({ 'dolldom-best-memory': 'broken' });
  assert.equal(getBestScore('memory'), 0);

  global.window.localStorage.getItem = () => {
    throw new Error('storage blocked');
  };
  global.window.localStorage.setItem = () => {
    throw new Error('storage blocked');
  };

  assert.equal(getBestScore('memory'), 0);
  assert.equal(getMuted(), false);
  assert.doesNotThrow(() => saveMuted(true));
});

test('음소거 설정을 문자열 저장값으로 복원한다', () => {
  const values = useMemoryStorage();
  saveMuted(true);

  assert.equal(values.get('dolldom-muted'), 'true');
  assert.equal(getMuted(), true);
});
