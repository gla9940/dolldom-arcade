const STORAGE_PREFIX = 'dolldom';

function read(key, fallbackValue) {
  try {
    const value = window.localStorage.getItem(`${STORAGE_PREFIX}-${key}`);
    return value === null ? fallbackValue : value;
  } catch {
    return fallbackValue;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}-${key}`, String(value));
    return true;
  } catch {
    return false;
  }
}

export function getBestScore(gameId) {
  const score = Number(read(`best-${gameId}`, 0));
  return Number.isFinite(score) && score >= 0 ? Math.floor(score) : 0;
}

export function saveBestScore(gameId, score) {
  const numericScore = Number(score);
  const safeScore = Number.isFinite(numericScore) ? Math.max(0, Math.floor(numericScore)) : 0;
  const bestScore = Math.max(getBestScore(gameId), safeScore);
  write(`best-${gameId}`, bestScore);
  return bestScore;
}

export function getMuted() {
  return read('muted', 'false') === 'true';
}

export function saveMuted(muted) {
  write('muted', Boolean(muted));
}
