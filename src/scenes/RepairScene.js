// Мини-игра починки кофемашины: закрутите все болты, пока не вышло время.
import Phaser from 'phaser';
import {
  W, C, txt, overlayBase, drawBar,
} from '../ui.js';
import { run, bus, unlock } from '../state.js';
import { beep } from '../audio.js';

const BOLTS = 5;
const TURNS = 3;
const TIME_MS = 12000;

export default class RepairScene extends Phaser.Scene {
  constructor() { super('Repair'); }

  create() {
    overlayBase(this, '🔧 Починка кофемашины', () => this.scene.stop());
    txt(this, W / 2, 160, `Закрутите все болты 🔩 — по ${TURNS} нажатия на каждый!`, 26, '#3b2a1e', { wrap: W - 60 });
    this.timerG = this.add.graphics();
    this.status = txt(this, W / 2, 1170, '', 30, '#3b2a1e', { bold: true });

    const g = this.add.graphics();
    g.fillStyle(0x546e7a, 1);
    g.fillRoundedRect(110, 260, 500, 760, 40);
    g.fillStyle(0x37474f, 1);
    g.fillRoundedRect(150, 300, 420, 200, 24);
    g.fillStyle(0x263238, 1);
    g.fillRect(300, 820, 120, 60);
    txt(this, W / 2, 400, '☕', 90);

    this.objs = [];
    if (!run.broken) {
      this.status.setText('Кофемашина в порядке 👍');
      return;
    }
    this.startRound();
  }

  startRound() {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
    this.timeLeft = TIME_MS;
    this.left = BOLTS;
    this.over = false;
    this.status.setText('');
    const pts = [];
    while (pts.length < BOLTS) {
      const x = Phaser.Math.Between(170, 550);
      const y = Phaser.Math.Between(560, 960);
      if (pts.every(([px, py]) => Math.hypot(px - x, py - y) > 120)) pts.push([x, y]);
    }
    pts.forEach(([x, y]) => {
      const spark = txt(this, x + 34, y - 34, '⚡', 32);
      this.tweens.add({ targets: spark, alpha: 0.1, duration: 200, yoyo: true, repeat: -1 });
      const bolt = txt(this, x, y, '🔩', 72).setInteractive();
      const turns = txt(this, x, y + 54, `0/${TURNS}`, 20, '#ffffff', { bold: true });
      bolt.hits = 0;
      bolt.on('pointerdown', () => {
        if (this.over || bolt.hits >= TURNS) return;
        bolt.hits += 1;
        beep('click');
        this.tweens.add({ targets: bolt, angle: bolt.angle + 120, duration: 120 });
        turns.setText(`${bolt.hits}/${TURNS}`);
        if (bolt.hits >= TURNS) {
          spark.destroy();
          bolt.setAlpha(0.5);
          turns.setText('✅');
          this.left -= 1;
          if (this.left <= 0) this.win();
        }
      });
      this.objs.push(spark, bolt, turns);
    });
  }

  win() {
    this.over = true;
    run.broken = false;
    unlock('repair');
    beep('success');
    this.status.setText('✅ Починено!');
    bus.emit('toast', '☕ Кофемашина снова работает!');
    this.time.delayedCall(900, () => this.scene.stop());
  }

  update(time, delta) {
    if (this.over || !run.broken || this.timeLeft === undefined) return;
    this.timeLeft -= delta;
    this.timerG.clear();
    drawBar(this.timerG, 110, 210, 500, 20, this.timeLeft / TIME_MS, this.timeLeft > 4000 ? C.green : C.red);
    if (this.timeLeft <= 0) {
      this.over = true;
      beep('error');
      this.status.setText('⏰ Не успели! Ещё раз…');
      this.time.delayedCall(1300, () => this.startRound());
    }
  }
}
