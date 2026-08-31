import { getMuted, getVolume, saveMuted, saveVolume } from './storage.js';

const EFFECTS = {
  start: [
    { frequency: 420, duration: 0.06 },
    { frequency: 620, duration: 0.08, delay: 0.07 },
  ],
  select: [{ frequency: 320, duration: 0.05 }],
  restart: [{ frequency: 280, duration: 0.05 }],
  jump: [{ frequency: 520, duration: 0.08 }],
  flip: [{ frequency: 390, duration: 0.05 }],
  match: [
    { frequency: 620, duration: 0.06, type: 'sine' },
    { frequency: 820, duration: 0.1, type: 'sine', delay: 0.06 },
  ],
  success: [
    { frequency: 520, duration: 0.06, type: 'sine' },
    { frequency: 720, duration: 0.08, type: 'sine', delay: 0.07 },
    { frequency: 940, duration: 0.14, type: 'sine', delay: 0.15 },
  ],
  catch: [{ frequency: 680, duration: 0.05 }],
  shoot: [{ frequency: 760, duration: 0.035, type: 'square' }],
  hit: [
    { frequency: 260, duration: 0.04, type: 'sawtooth' },
    { frequency: 520, duration: 0.05, delay: 0.025 },
  ],
  miss: [{ frequency: 150, duration: 0.1, type: 'sawtooth' }],
  wrong: [{ frequency: 190, duration: 0.04 }],
  gameOver: [
    { frequency: 180, duration: 0.12, type: 'sawtooth' },
    { frequency: 110, duration: 0.22, type: 'sawtooth', delay: 0.1 },
  ],
};

export function createSoundManager() {
  let audioContext = null;
  let masterGain = null;
  let muted = getMuted();
  let volume = getVolume();

  function getAudioContext() {
    if (audioContext) return audioContext;

    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return null;

    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(audioContext.destination);
    return audioContext;
  }

  function tone(frequency = 440, duration = 0.07, type = 'square', delay = 0) {
    if (muted || volume === 0) return;

    try {
      const context = getAudioContext();
      if (!context) return;

      if (context.state === 'suspended') context.resume();

      const startTime = context.currentTime + Math.max(0, delay);
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.055, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      oscillator.connect(gain).connect(masterGain);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    } catch {
      // Sound is an enhancement; unsupported or blocked audio must not stop a game.
    }
  }

  return {
    tone,

    play(effectName) {
      EFFECTS[effectName]?.forEach(({ frequency, duration, type = 'square', delay = 0 }) => {
        tone(frequency, duration, type, delay);
      });
    },

    toggleMuted() {
      muted = !muted;
      saveMuted(muted);
      return muted;
    },

    setVolume(nextVolume) {
      volume = saveVolume(nextVolume);
      if (masterGain) masterGain.gain.value = volume;
      return volume;
    },

    get muted() {
      return muted;
    },

    get volume() {
      return volume;
    },

    destroy() {
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
      audioContext = null;
      masterGain = null;
    },
  };
}
