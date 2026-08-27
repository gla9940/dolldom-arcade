export function createCanvasSurface(canvas, { width, height, maxPixelRatio = 2 }) {
  const context = canvas.getContext('2d');
  let pixelRatio = 1;

  function resize() {
    const nextPixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
    const nextWidth = Math.round(width * nextPixelRatio);
    const nextHeight = Math.round(height * nextPixelRatio);

    if (canvas.width === nextWidth && canvas.height === nextHeight && pixelRatio === nextPixelRatio) {
      return false;
    }

    pixelRatio = nextPixelRatio;
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return true;
  }

  function toCanvasPoint(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) * width) / bounds.width,
      y: ((event.clientY - bounds.top) * height) / bounds.height,
    };
  }

  resize();

  return {
    canvas,
    context,
    width,
    height,
    resize,
    toCanvasPoint,
  };
}
