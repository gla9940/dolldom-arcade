const GAME_SHORTCUT_BINDINGS = Object.fromEntries(
  Array.from({ length: 9 }, (_, index) => {
    const number = index + 1;
    return [`game${number}`, [`Digit${number}`, `Numpad${number}`]];
  }),
);

const DEFAULT_BINDINGS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  action: ['Space', 'Enter'],
  mark: ['KeyF'],
  pause: ['Escape', 'KeyP'],
  restart: ['KeyR'],
  ...GAME_SHORTCUT_BINDINGS,
};

const BLOCKED_SCROLL_ACTIONS = new Set(['left', 'right', 'up', 'down', 'action']);

function isInteractiveElement(element) {
  if (!(element instanceof Element)) return false;

  return Boolean(
    element.closest(
      'input, textarea, select, button, a, dialog[open], [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
    ),
  );
}

export function createInputManager({ target = window, bindings = DEFAULT_BINDINGS } = {}) {
  const actionByCode = new Map();
  const pressedCodes = new Set();
  const virtualSourcesByAction = new Map();
  const pressListeners = new Map();
  let gameplayActive = false;

  Object.entries(bindings).forEach(([action, codes]) => {
    codes.forEach((code) => actionByCode.set(code, action));
  });

  function emitPress(action, event) {
    pressListeners.get(action)?.forEach((listener) => listener(event));
  }

  function isActionPressed(action) {
    const keyboardPressed = bindings[action]?.some((code) => pressedCodes.has(code)) ?? false;
    const virtualPressed = (virtualSourcesByAction.get(action)?.size ?? 0) > 0;
    return keyboardPressed || virtualPressed;
  }

  function handleKeyDown(event) {
    if (isInteractiveElement(event.target) || isInteractiveElement(document.activeElement)) return;

    const action = actionByCode.get(event.code);
    if (!action) return;

    if (gameplayActive && BLOCKED_SCROLL_ACTIONS.has(action)) {
      event.preventDefault();
    }

    if (pressedCodes.has(event.code)) return;
    const wasPressed = isActionPressed(action);
    pressedCodes.add(event.code);
    if (!wasPressed) emitPress(action, event);
  }

  function handleKeyUp(event) {
    pressedCodes.delete(event.code);
  }

  function handleBlur() {
    pressedCodes.clear();
    virtualSourcesByAction.clear();
  }

  target.addEventListener('keydown', handleKeyDown);
  target.addEventListener('keyup', handleKeyUp);
  target.addEventListener('blur', handleBlur);

  return {
    onPress(action, listener) {
      const listeners = pressListeners.get(action) ?? new Set();
      listeners.add(listener);
      pressListeners.set(action, listeners);
      return () => listeners.delete(listener);
    },

    isPressed(action) {
      return isActionPressed(action);
    },

    press(action, source = 'virtual', event = null) {
      if (!gameplayActive) return false;

      const sources = virtualSourcesByAction.get(action) ?? new Set();
      const wasPressed = isActionPressed(action);
      sources.add(source);
      virtualSourcesByAction.set(action, sources);
      if (!wasPressed) {
        emitPress(action, event ?? { code: 'Virtual', source });
      }
      return true;
    },

    release(action, source = 'virtual') {
      const sources = virtualSourcesByAction.get(action);
      if (!sources) return;
      sources.delete(source);
      if (!sources.size) virtualSourcesByAction.delete(action);
    },

    releaseVirtualInputs() {
      virtualSourcesByAction.clear();
    },

    setGameplayActive(active) {
      gameplayActive = Boolean(active);
      if (!gameplayActive) {
        pressedCodes.clear();
        virtualSourcesByAction.clear();
      }
    },

    destroy() {
      target.removeEventListener('keydown', handleKeyDown);
      target.removeEventListener('keyup', handleKeyUp);
      target.removeEventListener('blur', handleBlur);
      pressedCodes.clear();
      virtualSourcesByAction.clear();
      pressListeners.clear();
    },
  };
}
