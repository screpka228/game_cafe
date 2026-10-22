// Всплывающие уведомления поверх всех экранов (не перехватывает нажатия).
import Phaser from 'phaser';
import { W, txt } from '../ui.js';
import { bus } from '../state.js';

const MAX = 4;

export default class ToastScene extends Phaser.Scene {
  constructor() { super('Toast'); }

  create() {
    this.items = [];
    bus.on('toast', this.show, this);
    this.events.once('shutdown', () => bus.off('toast', this.show, this));
  }

  show(msg) {
    const t = txt(this, 0, 0, msg, 24, '#ffffff', { bold: true, wrap: W - 120 });
    const w = Math.min(W - 60, t.width + 40);
    const h = t.height + 16;
    const g = this.add.graphics();
    g.fillStyle(0x2b1d14, 0.92);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    const c = this.add.container(W / 2, 1085 - h / 2, [g, t]).setAlpha(0);
    c.h = h;
    this.items.push(c);
    if (this.items.length > MAX) this.drop(this.items[0]);
    this.layout();
    this.tweens.add({ targets: c, alpha: 1, duration: 150 });
    this.time.delayedCall(2800, () => this.drop(c));
  }

  drop(c) {
    if (!this.items.includes(c)) return;
    this.items = this.items.filter((x) => x !== c);
    this.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: () => c.destroy() });
    this.layout();
  }

  // Стопка снизу вверх над нижней панелью: верх экрана занят баннером событий и вкладками.
  layout() {
    let y = 1085;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const c = this.items[i];
      this.tweens.add({ targets: c, y: y - c.h / 2, duration: 150 });
      y -= c.h + 8;
    }
  }
}
