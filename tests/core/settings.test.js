import assert from 'node:assert/strict';
import test from 'node:test';

import { createSettingsManager, DEFAULT_SETTINGS } from '../../src/core/settings.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test('설정은 손상되거나 허용되지 않은 값을 안전한 기본값으로 복구한다', () => {
  global.window = { localStorage: new MemoryStorage() };
  window.localStorage.setItem('dolldom-settings', JSON.stringify({
    screenShake: 'yes',
    particles: 'maximum',
    highContrast: true,
    touchSize: 'huge',
  }));

  const settings = createSettingsManager();
  assert.deepEqual(settings.getSnapshot(), { ...DEFAULT_SETTINGS, highContrast: true });
  assert.equal(JSON.parse(window.localStorage.getItem('dolldom-settings')).particles, 'full');
});

test('설정 변경과 초기화는 구독자와 localStorage에 반영된다', () => {
  global.window = { localStorage: new MemoryStorage() };
  const settings = createSettingsManager();
  const changes = [];
  settings.subscribe((snapshot) => changes.push(snapshot));

  settings.update({ particles: 'off', touchSize: 'large', dodgeDifficulty: 'relaxed' });
  assert.equal(settings.get('particles'), 'off');
  assert.equal(changes.length, 1);
  settings.reset();
  assert.deepEqual(settings.getSnapshot(), DEFAULT_SETTINGS);
  settings.destroy();
});
