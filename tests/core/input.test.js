import assert from 'node:assert/strict';
import test from 'node:test';

import { createInputManager } from '../../src/core/input.js';

class FakeTarget {
  listeners = new Map();

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type, listener) {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }

  dispatch(type, event = {}) {
    this.listeners.get(type)?.(event);
  }
}

class FakeElement {
  constructor(interactive = false) {
    this.interactive = interactive;
  }

  closest() {
    return this.interactive ? this : null;
  }
}

test('입력 시스템은 키를 액션으로 변환하고 반복 입력과 스크롤을 제어한다', () => {
  global.Element = FakeElement;
  global.document = { activeElement: null };

  const target = new FakeTarget();
  const input = createInputManager({ target });
  const presses = [];
  input.onPress('left', () => presses.push('left'));
  input.setGameplayActive(true);

  let prevented = false;
  const keyEvent = {
    code: 'ArrowLeft',
    target: null,
    preventDefault() {
      prevented = true;
    },
  };

  target.dispatch('keydown', keyEvent);
  target.dispatch('keydown', keyEvent);

  assert.equal(prevented, true);
  assert.deepEqual(presses, ['left']);
  assert.equal(input.isPressed('left'), true);

  target.dispatch('keyup', { code: 'ArrowLeft' });
  assert.equal(input.isPressed('left'), false);

  target.dispatch('keydown', {
    code: 'ArrowLeft',
    target: new FakeElement(true),
    preventDefault() {
      throw new Error('입력 UI에서는 기본 동작을 막으면 안 됩니다.');
    },
  });
  assert.deepEqual(presses, ['left']);

  input.destroy();
  assert.equal(target.listeners.size, 0);
});

test('가상 터치 입력은 키보드와 같은 논리 액션을 공유하고 비활성화 시 정리된다', () => {
  global.Element = FakeElement;
  global.document = { activeElement: null };
  const input = createInputManager({ target: new FakeTarget() });
  let presses = 0;
  input.onPress('action', () => { presses += 1; });
  input.setGameplayActive(true);

  assert.equal(input.press('action', 'finger-1'), true);
  assert.equal(input.isPressed('action'), true);
  input.press('action', 'finger-2');
  assert.equal(presses, 1);
  input.release('action', 'finger-1');
  assert.equal(input.isPressed('action'), true);
  input.setGameplayActive(false);
  assert.equal(input.isPressed('action'), false);
  input.destroy();
});
