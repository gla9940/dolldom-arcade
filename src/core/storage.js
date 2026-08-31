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

function remove(key) {
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}-${key}`);
    return true;
  } catch {
    return false;
  }
}

export function readJson(key, fallbackValue) {
  try {
    const value = JSON.parse(read(key, 'null'));
    return value === null ? fallbackValue : value;
  } catch {
    return fallbackValue;
  }
}

export function writeJson(key, value) {
  try {
    return write(key, JSON.stringify(value));
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

export function getVolume() {
  const volume = Number(read('volume', 0.65));
  return Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.65;
}

export function saveVolume(volume) {
  const numericVolume = Number(volume);
  const safeVolume = Number.isFinite(numericVolume)
    ? Math.min(1, Math.max(0, numericVolume))
    : 0.65;
  write('volume', safeVolume);
  return safeVolume;
}

export function hasSeenGuide() {
  return read('guide-seen', 'false') === 'true';
}

export function saveGuideSeen() {
  write('guide-seen', true);
}

export function resetGameRecords(gameIds) {
  gameIds.forEach((gameId) => remove(`best-${gameId}`));
  remove('progress');
}
