import { readJson, writeJson } from './storage.js';

export const DEFAULT_SETTINGS = Object.freeze({
  screenShake: true,
  particles: 'full',
  highContrast: false,
  touchSize: 'normal',
  dodgeDifficulty: 'normal',
});

const ALLOWED_VALUES = {
  particles: new Set(['full', 'reduced', 'off']),
  touchSize: new Set(['normal', 'large']),
  dodgeDifficulty: new Set(['normal', 'relaxed']),
};

function normalizeSettings(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    screenShake: typeof source.screenShake === 'boolean'
      ? source.screenShake
      : DEFAULT_SETTINGS.screenShake,
    particles: ALLOWED_VALUES.particles.has(source.particles)
      ? source.particles
      : DEFAULT_SETTINGS.particles,
    highContrast: typeof source.highContrast === 'boolean'
      ? source.highContrast
      : DEFAULT_SETTINGS.highContrast,
    touchSize: ALLOWED_VALUES.touchSize.has(source.touchSize)
      ? source.touchSize
      : DEFAULT_SETTINGS.touchSize,
    dodgeDifficulty: ALLOWED_VALUES.dodgeDifficulty.has(source.dodgeDifficulty)
      ? source.dodgeDifficulty
      : DEFAULT_SETTINGS.dodgeDifficulty,
  };
}

export function createSettingsManager() {
  let settings = normalizeSettings(readJson('settings', null));
  const listeners = new Set();

  function saveAndNotify() {
    writeJson('settings', settings);
    const snapshot = { ...settings };
    listeners.forEach((listener) => listener(snapshot));
    return snapshot;
  }

  writeJson('settings', settings);

  return {
    get(key) {
      return settings[key];
    },

    getSnapshot() {
      return { ...settings };
    },

    update(changes) {
      settings = normalizeSettings({ ...settings, ...changes });
      return saveAndNotify();
    },

    reset() {
      settings = { ...DEFAULT_SETTINGS };
      return saveAndNotify();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    destroy() {
      listeners.clear();
    },
  };
}
