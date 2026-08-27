import { getMuted, saveMuted } from './storage.js';

export function createSoundManager() {
  let audioContext = null;
  let muted = getMuted();

  function getAudioContext() {
    if (audioContext) return audioContext;

    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return null;

    audioContext = new AudioContext();
    return audioContext;
  }

  return {
    tone(frequency = 440, duration = 0.07, type = 'square') {
      if (muted) return;

      try {
        const context = getAudioContext();
        if (!context) return;

        if (context.state === 'suspended') context.resume();

        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.045, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + duration);
      } catch {
        // Sound is an enhancement; unsupported or blocked audio must not stop a game.
      }
    },

    toggleMuted() {
      muted = !muted;
      saveMuted(muted);
      return muted;
    },

    get muted() {
      return muted;
    },

    destroy() {
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
      audioContext = null;
    },
  };
}
