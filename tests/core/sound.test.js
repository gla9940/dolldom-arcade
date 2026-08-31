import assert from 'node:assert/strict';
import test from 'node:test';

import { createSoundManager } from '../../src/core/sound.js';

test('사운드 시스템은 AudioContext를 재사용하고 음량과 정리를 관리한다', () => {
  const values = new Map([
    ['dolldom-muted', 'false'],
    ['dolldom-volume', '0.5'],
  ]);
  const oscillators = [];
  let closeCount = 0;
  let contextCount = 0;

  class FakeAudioContext {
    constructor() {
      contextCount += 1;
      this.currentTime = 0;
      this.destination = {};
      this.state = 'running';
    }

    createGain() {
      return {
        gain: {
          value: 1,
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {
          return this;
        },
      };
    }

    createOscillator() {
      const oscillator = {
        frequency: { value: 0 },
        connect() {
          return this;
        },
        start() {},
        stop() {},
      };
      oscillators.push(oscillator);
      return oscillator;
    }

    close() {
      closeCount += 1;
      this.state = 'closed';
    }
  }

  global.window = {
    AudioContext: FakeAudioContext,
    localStorage: {
      getItem(key) {
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        values.set(key, value);
      },
    },
  };

  const sound = createSoundManager();
  sound.play('start');
  sound.play('jump');

  assert.equal(contextCount, 1);
  assert.equal(oscillators.length, 3);
  assert.equal(sound.volume, 0.5);
  assert.equal(sound.setVolume(0.8), 0.8);
  assert.equal(values.get('dolldom-volume'), '0.8');
  assert.equal(sound.toggleMuted(), true);
  assert.equal(values.get('dolldom-muted'), 'true');

  sound.play('match');
  assert.equal(oscillators.length, 3);
  sound.destroy();
  assert.equal(closeCount, 1);
});
