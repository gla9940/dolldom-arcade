export function createGameLoop({ update, render, maxDelta = 1 / 30 }) {
  let animationFrameId = 0;
  let previousTime = 0;
  let running = false;

  function frame(currentTime) {
    if (!running) return;

    const deltaTime = previousTime
      ? Math.min(maxDelta, (currentTime - previousTime) / 1000)
      : 0;

    previousTime = currentTime;
    update(deltaTime);

    if (!running) return;
    render();
    animationFrameId = window.requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      previousTime = 0;
      animationFrameId = window.requestAnimationFrame(frame);
    },

    stop() {
      running = false;
      previousTime = 0;
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    },

    get isRunning() {
      return running;
    },
  };
}
