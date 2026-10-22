// Взбивание сливок: тап по кнопке всегда, тряска телефона — если включена в настройках.
import Phaser from 'phaser';
import {
  W, C, txt, button, overlayBase,
} from '../ui.js';
import { S, unlock } from '../state.js';
import { beep } from '../audio.js';
import { startShake, stopShake } from '../motion.js';

const ZONE_MIN = 70;
const ZONE_MAX = 90;
const BAR_X = 80;
const BAR_W = 560;
const BAR_Y = 600;

export default class WhipScene extends Phaser.Scene {
  constructor() { super('Whip'); }

  init(data) {
    this.onDone = data && data.onDone;
  }

  create() {
    this.p = 0;
    this.byShake = 0;
    this.byTap = 0;
    this.finished = false;

    overlayBase(this, '☁️ Взбивание сливок', () => this.finish(false));
    this.bowl = txt(this, W / 2, 360, '🥣', 180);
    this.cloud = txt(this, W / 2, 280, '☁️', 40).setAlpha(0);

    this.barG = this.add.graphics();
    txt(this, BAR_X + (BAR_W * (ZONE_MIN + ZONE_MAX)) / 200, BAR_Y + 62, 'идеально', 20, '#2e7d32', { bold: true });
    this.status = txt(this, W / 2, 700, 'Взбейте до зелёной зоны и нажмите «Готово»', 26, '#3b2a1e', { wrap: W - 80 });

    button(this, W / 2, 850, 440, 160, '👆 Взбить!', () => this.whip(6, 'tap'), { size: 40, silent: true });

    const shakeOn = S.settings.shakeToWhip;
    txt(this, W / 2, 985, shakeOn ? '📳 Можно трясти телефон!' : 'Тряску можно включить в ⚙️ Настройках', 24, shakeOn ? '#4a7fc8' : '#8a7a6a', { bold: shakeOn });
    button(this, W / 2, 1130, 440, 120, '✓ Готово', () => this.done(), { color: C.green, size: 34 });

    if (shakeOn) {
      startShake(S.settings.shakeSensitivity, () => {
        if (this.sys.isActive()) this.whip(7, 'shake');
      });
    }
    this.events.once('shutdown', stopShake);
    this.draw();
  }

  whip(n, src) {
    if (this.finished) return;
    this.p += n;
    if (src === 'shake') this.byShake += n; else this.byTap += n;
    beep('whip');
    this.tweens.add({ targets: this.bowl, angle: { from: -8, to: 8 }, duration: 60, yoyo: true, onComplete: () => this.bowl.setAngle(0) });
    if (this.p > 100) {
      this.p = 0;
      this.byShake = 0;
      this.byTap = 0;
      beep('error');
      this.status.setText('💥 Перестарались — получилось масло! Заново');
    } else if (this.p >= ZONE_MIN && this.p <= ZONE_MAX) {
      this.status.setText('Отлично! Жмите «Готово»');
    } else if (this.p > ZONE_MAX) {
      this.status.setText('Осторожно, сейчас станет маслом!');
    }
    this.draw();
  }

  done() {
    if (this.p >= ZONE_MIN && this.p <= ZONE_MAX) {
      if (this.byShake > this.byTap) unlock('shake');
      beep('success');
      this.finish(true);
    } else if (this.p < ZONE_MIN) {
      beep('error');
      this.status.setText('Ещё жидковато — взбивайте дальше');
    } else {
      beep('error');
      this.status.setText('Перебор! Подождите, пока осядет, или начните заново');
    }
  }

  finish(ok) {
    if (this.finished) return;
    this.finished = true;
    const cb = this.onDone;
    this.scene.stop();
    if (cb) cb(ok);
  }

  draw() {
    const g = this.barG;
    g.clear();
    g.fillStyle(0x000000, 0.15);
    g.fillRoundedRect(BAR_X, BAR_Y - 25, BAR_W, 50, 25);
    g.fillStyle(0x81c784, 1);
    g.fillRect(BAR_X + (BAR_W * ZONE_MIN) / 100, BAR_Y - 25, (BAR_W * (ZONE_MAX - ZONE_MIN)) / 100, 50);
    const inZone = this.p >= ZONE_MIN && this.p <= ZONE_MAX;
    g.fillStyle(inZone ? 0x2e7d32 : C.accent, 1);
    if (this.p > 0) g.fillRoundedRect(BAR_X, BAR_Y - 15, Math.max(30, (BAR_W * this.p) / 100), 30, 15);
    g.lineStyle(4, 0x3b2a1e, 0.6);
    g.strokeRoundedRect(BAR_X, BAR_Y - 25, BAR_W, 50, 25);
    this.cloud.setAlpha(Math.min(1, this.p / 70));
    this.cloud.setScale(0.6 + this.p / 60);
  }

  update(time, delta) {
    // Сливки немного оседают, если не взбивать.
    if (this.p > 0 && !this.finished) {
      this.p = Math.max(0, this.p - (delta / 1000) * 3);
      this.draw();
    }
  }
}
