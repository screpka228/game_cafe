// Детектор тряски через акселерометр (DeviceMotion / @capacitor/motion).
import { Motion } from '@capacitor/motion';

let handle = null;
let token = 0;

// sensitivity 0.1..1 — чем больше, тем слабее нужна тряска.
export async function startShake(sensitivity, onShake) {
  stopShake();
  const my = ++token;
  const threshold = 6 + (1 - sensitivity) * 20; // м/с² суммарного рывка
  let last = null;
  let lastT = 0;
  const handler = (e) => {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a) return;
    const cur = { x: a.x || 0, y: a.y || 0, z: a.z || 0 };
    if (last) {
      const d = Math.abs(cur.x - last.x) + Math.abs(cur.y - last.y) + Math.abs(cur.z - last.z);
      const now = Date.now();
      if (d > threshold && now - lastT > 110) {
        lastT = now;
        onShake(d);
      }
    }
    last = cur;
  };

  try {
    const DME = window.DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === 'function') await DME.requestPermission();
  } catch (e) { /* разрешение не требуется */ }

  let h;
  try {
    h = await Motion.addListener('accel', handler);
  } catch (e) {
    window.addEventListener('devicemotion', handler);
    h = { remove: () => window.removeEventListener('devicemotion', handler) };
  }
  if (my !== token) { h.remove(); return; } // уже остановили, пока ждали
  handle = h;
}

export function stopShake() {
  token++;
  if (handle) {
    try { handle.remove(); } catch (e) { /* ignore */ }
    handle = null;
  }
}
