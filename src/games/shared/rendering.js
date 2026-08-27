export const palette = {
  background: '#050609',
  purple: '#9b5cff',
  lime: '#b9ff38',
  pink: '#ff3fd8',
  text: '#f6f2ff',
  muted: '#80778f',
  danger: '#ff496c',
};

export function drawBackdrop(context, width, height) {
  context.fillStyle = palette.background;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = '#231a32';
  context.lineWidth = 1;

  for (let x = 0; x < width; x += 40) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  for (let y = 0; y < height; y += 40) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  const glow = context.createRadialGradient(
    width * 0.78,
    height * 0.2,
    0,
    width * 0.78,
    height * 0.2,
    160,
  );
  glow.addColorStop(0, '#7428a955');
  glow.addColorStop(1, '#7428a900');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
}

export function drawRoundRect(context, x, y, width, height, radius, fill, stroke) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);

  if (fill) {
    context.fillStyle = fill;
    context.fill();
  }

  if (stroke) {
    context.strokeStyle = stroke;
    context.stroke();
  }
}
