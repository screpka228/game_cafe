// Простые звуки через WebAudio — без файлов, работает оффлайн.
import { S } from './state.js';

let ctx = null;

const SOUNDS = {
  click: [[660, 0.05]],
  coin: [[880, 0.08], [1320, 0.12]],
  error: [[220, 0.12], [160, 0.18]],
  success: [[523, 0.09], [659, 0.09], [784, 0.16]],
  whip: [[420, 0.04]],
  clean: [[1000, 0.05], [1400, 0.05]],
  alarm: [[700, 0.12], [500, 0.12], [700, 0.12]],
};

export function beep(name) {
  if (!S.settings.sound) return;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    let t = ctx.currentTime;
    for (const [freq, dur] of SOUNDS[name] || SOUNDS.click) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = name === 'error' ? 'sawtooth' : 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur;
    }
  } catch (e) { /* звук недоступен */ }
}
