// Настройки: тряска для взбивания, порог чувствительности, звук, сброс прогресса.
import Phaser from 'phaser';
import {
  W, C, txt, button, overlayBase, modal, drawBar,
} from '../ui.js';
import { S, save, resetSave } from '../state.js';

export default class SettingsScene extends Phaser.Scene {
  constructor() { super('Settings'); }

  create() {
    overlayBase(this, '⚙️ Настройки', () => this.scene.stop());

    const card = (y, h) => {
      const g = this.add.graphics();
      g.fillStyle(C.card, 1);
      g.fillRoundedRect(30, y, W - 60, h, 20);
    };

    card(150, 220);
    txt(this, 55, 200, '📳 Взбивать сливки тряской', 28, '#3b2a1e', { bold: true, ox: 0 });
    txt(this, 55, 290, 'Работает только на экране взбивания.\nКнопка «Взбить» доступна всегда.', 20, '#7a5a3c', { ox: 0, align: 'left' });
    this.shakeBtn = button(this, W - 125, 200, 170, 76, '', () => {
      S.settings.shakeToWhip = !S.settings.shakeToWhip;
      save();
      this.refresh();
    }, { size: 26 });

    card(400, 240);
    txt(this, 55, 445, '🎚️ Чувствительность тряски', 28, '#3b2a1e', { bold: true, ox: 0 });
    this.sensG = this.add.graphics();
    this.sensText = txt(this, W / 2, 590, '', 22, '#7a5a3c');
    button(this, 90, 530, 90, 80, '−', () => this.changeSens(-0.1), { size: 40 });
    button(this, W - 90, 530, 90, 80, '+', () => this.changeSens(0.1), { size: 40 });

    card(670, 120);
    txt(this, 55, 730, '🔊 Звук', 28, '#3b2a1e', { bold: true, ox: 0 });
    this.soundBtn = button(this, W - 125, 730, 170, 76, '', () => {
      S.settings.sound = !S.settings.sound;
      save();
      this.refresh();
    }, { size: 26 });

    button(this, W / 2, 960, 420, 96, '🗑️ Сбросить прогресс', () => {
      modal(this, 'Удалить весь прогресс?\nМонеты, улучшения, рецепты и ачивки пропадут.', [
        { label: 'Удалить', color: C.red, cb: () => { resetSave(); window.location.reload(); } },
        { label: 'Отмена', color: C.gray },
      ]);
    }, { color: C.red, size: 26 });

    txt(this, W / 2, 1180, 'Кафе · v1.0 · сохранение автоматическое', 20, '#9e8a76');
    this.refresh();
  }

  changeSens(d) {
    S.settings.shakeSensitivity = Math.round(Math.min(1, Math.max(0.1, S.settings.shakeSensitivity + d)) * 10) / 10;
    save();
    this.refresh();
  }

  refresh() {
    const on = S.settings.shakeToWhip;
    this.shakeBtn.setBtnLabel(on ? 'Вкл' : 'Выкл').setBtnColor(on ? C.green : C.gray);
    this.soundBtn.setBtnLabel(S.settings.sound ? 'Вкл' : 'Выкл').setBtnColor(S.settings.sound ? C.green : C.gray);
    const s = S.settings.shakeSensitivity;
    this.sensG.clear();
    drawBar(this.sensG, 160, 518, W - 320, 26, s, on ? C.blue : C.gray);
    this.sensText.setText(`${Math.round(s * 100)}% — ${s >= 0.7 ? 'лёгкая тряска' : s >= 0.4 ? 'средняя тряска' : 'сильная тряска'}`);
  }
}
