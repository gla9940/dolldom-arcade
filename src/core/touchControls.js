const CONTROL_DEFINITIONS = [
  { action: 'left', label: '왼쪽 이동', symbol: '←' },
  { action: 'up', label: '위로 이동', symbol: '↑' },
  { action: 'down', label: '아래로 이동', symbol: '↓' },
  { action: 'right', label: '오른쪽 이동', symbol: '→' },
  { action: 'action', label: '액션', symbol: '●' },
  { action: 'mark', label: '깃발 표시', symbol: '⚑' },
  { action: 'guide', label: '주변 범위 표시 켜기 또는 끄기', symbol: '◎' },
];

export function createTouchControls(container, input) {
  const abortController = new AbortController();
  const { signal } = abortController;
  const pointerActions = new Map();
  const buttonsByAction = new Map();
  let availableActions = new Set();
  let enabled = false;

  const fragment = document.createDocumentFragment();
  CONTROL_DEFINITIONS.forEach(({ action, label, symbol }) => {
    const button = document.createElement('button');
    button.className = `touch-control touch-${action}`;
    button.type = 'button';
    button.dataset.action = action;
    button.setAttribute('aria-label', label);
    button.textContent = symbol;
    button.hidden = true;
    buttonsByAction.set(action, button);
    fragment.append(button);
  });
  container.replaceChildren(fragment);

  function refreshVisibility() {
    buttonsByAction.forEach((button, action) => {
      button.hidden = !availableActions.has(action);
    });
    container.hidden = !enabled || availableActions.size === 0;
  }

  function releasePointer(pointerId) {
    const action = pointerActions.get(pointerId);
    if (!action) return;
    input.release(action, `pointer:${pointerId}`);
    pointerActions.delete(pointerId);
  }

  container.addEventListener(
    'pointerdown',
    (event) => {
      const button = event.target.closest('[data-action]');
      if (!enabled || !button || event.isPrimary === false && event.pointerType === 'mouse') return;

      const { action } = button.dataset;
      if (!availableActions.has(action)) return;
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      pointerActions.set(event.pointerId, action);
      input.press(action, `pointer:${event.pointerId}`, event);
    },
    { signal },
  );

  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((eventName) => {
    container.addEventListener(eventName, (event) => releasePointer(event.pointerId), { signal });
  });

  container.addEventListener(
    'click',
    (event) => {
      if (event.detail !== 0) return;
      const button = event.target.closest('[data-action]');
      if (!enabled || !button) return;
      const { action } = button.dataset;
      input.press(action, 'accessible-button', event);
      input.release(action, 'accessible-button');
    },
    { signal },
  );
  container.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });

  return {
    setActions(actions = []) {
      input.releaseVirtualInputs();
      pointerActions.clear();
      availableActions = new Set(actions);
      const directionalActions = ['left', 'up', 'down', 'right'];
      const hasDpad = directionalActions.every((action) => availableActions.has(action));
      const hasAction = availableActions.has('action');
      const hasMark = availableActions.has('mark');
      const hasGuide = availableActions.has('guide');
      container.dataset.layout = hasDpad && hasAction && hasMark && hasGuide
        ? 'dpad-guides'
        : hasDpad && hasAction && hasMark ? 'dpad-actions'
        : hasDpad && hasAction ? 'dpad-action' : hasDpad ? 'dpad' : 'action';
      refreshVisibility();
    },

    setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
      if (!enabled) {
        input.releaseVirtualInputs();
        pointerActions.clear();
      }
      refreshVisibility();
    },

    destroy() {
      input.releaseVirtualInputs();
      pointerActions.clear();
      abortController.abort();
      container.replaceChildren();
    },
  };
}
