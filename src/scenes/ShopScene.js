// Магазин: улучшения, меню, декор, ачивки.
import Phaser from 'phaser';
import {
  W, C, txt, button, overlayBase,
} from '../ui.js';
import {
  S, bus, save, spend, unlock, tablePrice, speedPrice,
} from '../state.js';
import {
  INGREDIENTS, SHOP_MENU, DECOR, DECOR_SECTIONS, ACHIEVEMENTS, TABLE_STARS, MAX_TABLES, MAX_SPEED,
} from '../data.js';
import { beep } from '../audio.js';

const TABS = [['up', '⚡ Улучшения'], ['menu', '🍰 Меню'], ['decor', '🎨 Декор'], ['ach', '🏆 Ачивки']];

export default class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  create() {
    overlayBase(this, '🛒 Магазин', () => this.scene.stop());
    this.tab = 'up';
    this.wallet = txt(this, 30, 210, '', 28, '#3b2a1e', { bold: true, ox: 0 });
    this.content = this.add.container(0, 0);
    this.tabBtns = TABS.map(([id, label], i) => button(this, 93 + i * 178, 150, 168, 70, label, () => { this.tab = id; this.render(); }, { size: 20 }));
    bus.on('coins', this.render, this);
    this.events.once('shutdown', () => bus.off('coins', this.render, this));
    this.render();
  }

  render() {
    this.wallet.setText(`💰 ${S.coins}    ⭐ ${S.stars}`);
    this.tabBtns.forEach((b, i) => b.setBtnSelected(TABS[i][0] === this.tab).setBtnColor(TABS[i][0] === this.tab ? C.green : C.accent));
    this.content.removeAll(true);
    this.y = 250;
    if (this.tab === 'up') this.renderUpgrades();
    else if (this.tab === 'menu') this.renderMenu();
    else if (this.tab === 'decor') this.renderDecor();
    else this.renderAch();
  }

  // Строка: заголовок, описание, кнопка справа.
  row(title, desc, btnLabel, opts = {}) {
    const h = opts.h || 110;
    const y = this.y;
    const g = this.add.graphics();
    g.fillStyle(C.card, 1);
    g.fillRoundedRect(25, y, W - 50, h - 10, 18);
    this.content.add(g);
    this.content.add(txt(this, 45, y + (desc ? (h - 10) / 2 - 16 : (h - 10) / 2), title, opts.titleSize || 24, '#3b2a1e', { bold: true, ox: 0, wrap: 440, align: 'left' }));
    if (desc) this.content.add(txt(this, 45, y + (h - 10) / 2 + 18, desc, 18, '#7a5a3c', { ox: 0, wrap: 440, align: 'left' }));
    if (btnLabel) {
      const b = button(this, W - 135, y + (h - 10) / 2, 190, h - 30, btnLabel, opts.cb, { color: opts.color ?? C.green, size: 22, onDisabled: opts.onDisabled });
      if (opts.enabled === false) b.setBtnEnabled(false);
      this.content.add(b);
    }
    this.y += h;
  }

  header(s) {
    this.content.add(txt(this, 35, this.y + 20, s, 24, '#9a5a2f', { bold: true, ox: 0 }));
    this.y += 42;
  }

  buy(price, apply, needStars = 0) {
    if (S.stars < needStars) { beep('error'); bus.emit('toast', `Нужно ⭐ ${needStars}`); return; }
    if (!spend(price)) { beep('error'); bus.emit('toast', 'Не хватает монет'); return; }
    apply();
    save();
    beep('coin');
    this.render();
  }

  renderUpgrades() {
    this.y = 260;
    if (S.tables >= MAX_TABLES) {
      this.row(`🪑 Столики: ${S.tables}/${MAX_TABLES}`, 'Зал заполнен', '✓ Максимум', { color: C.gray, enabled: false, h: 140 });
    } else {
      const need = TABLE_STARS[S.tables];
      const price = tablePrice();
      this.row(`🪑 Новый столик (${S.tables}/${MAX_TABLES})`, `Больше гостей одновременно. ${need ? `Нужно ⭐ ${need}. ` : ''}Цена растёт после покупки.`, `${price} 💰`, {
        h: 140,
        enabled: S.coins >= price && S.stars >= need,
        onDisabled: () => bus.emit('toast', S.stars < need ? `Нужно ⭐ ${need} — открывайте ачивки` : 'Не хватает монет'),
        cb: () => this.buy(price, () => {
          S.tables += 1;
          S.upgrades.tables += 1;
          if (S.tables >= MAX_TABLES) unlock('tables4');
          bus.emit('room');
        }, need),
      });
    }
    const lvl = S.upgrades.speed;
    if (lvl >= MAX_SPEED) {
      this.row(`⚡ Ускорение: ур. ${lvl}/${MAX_SPEED}`, 'Максимальный уровень', '✓ Максимум', { color: C.gray, enabled: false, h: 140 });
    } else {
      const price = speedPrice();
      this.row(`⚡ Ускорение таймера (ур. ${lvl}/${MAX_SPEED})`, 'Быстрее варка и переделка, гости терпеливее на 8%. Цена растёт.', `${price} 💰`, {
        h: 140,
        enabled: S.coins >= price,
        onDisabled: () => bus.emit('toast', 'Не хватает монет'),
        cb: () => this.buy(price, () => { S.upgrades.speed += 1; }),
      });
    }
    this.y += 20;
    this.content.add(txt(this, W / 2, this.y + 60, `Статистика\nОбслужено: ${S.stats.served} · без ошибок: ${S.stats.perfect}\nУшли без заказа: ${S.stats.lost} · заработано: ${S.stats.earned} 💰`, 22, '#7a5a3c'));
  }

  renderMenu() {
    this.y = 260;
    this.content.add(txt(this, W / 2, this.y, 'Новые ингредиенты появятся на кухне и в заказах', 20, '#7a5a3c'));
    this.y += 30;
    SHOP_MENU.forEach((id) => {
      const ing = INGREDIENTS[id];
      const owned = S.menu.includes(id);
      const need = ing.stars || 0;
      const cat = { base: 'основа', addon: 'добавка', serve: 'подача' }[ing.cat];
      if (owned) {
        this.row(`${ing.icon} ${ing.name}`, `${cat} · в меню`, '✓ Есть', { color: C.gray, enabled: false });
      } else {
        this.row(`${ing.icon} ${ing.name}`, `${cat}${need ? ` · нужно ⭐ ${need}` : ''}`, `${ing.cost} 💰`, {
          enabled: S.coins >= ing.cost && S.stars >= need,
          onDisabled: () => bus.emit('toast', S.stars < need ? `Нужно ⭐ ${need}` : 'Не хватает монет'),
          cb: () => this.buy(ing.cost, () => S.menu.push(id), need),
        });
      }
    });
  }

  renderDecor() {
    this.y = 240;
    for (const sec of DECOR_SECTIONS) {
      this.header(sec.name);
      for (const d of DECOR[sec.id]) {
        const owned = S.decor.owned.includes(d.id);
        const active = S.decor[sec.id] === d.id;
        const title = `${d.icon ? `${d.icon} ` : ''}${d.name}`;
        const opts = { h: 82, titleSize: 22 };
        if (active) {
          this.row(title, null, '✓ Выбрано', { ...opts, color: C.gray, enabled: false });
        } else if (owned) {
          this.row(title, null, 'Выбрать', {
            ...opts,
            color: C.blue,
            cb: () => { S.decor[sec.id] = d.id; save(); bus.emit('room'); this.render(); },
          });
        } else {
          this.row(title, d.stars ? `нужно ⭐ ${d.stars}` : null, `${d.cost} 💰`, {
            ...opts,
            enabled: S.coins >= d.cost && S.stars >= d.stars,
            onDisabled: () => bus.emit('toast', S.stars < d.stars ? `Нужно ⭐ ${d.stars} — открывайте ачивки` : 'Не хватает монет'),
            cb: () => this.buy(d.cost, () => {
              S.decor.owned.push(d.id);
              S.decor[sec.id] = d.id;
              bus.emit('room');
            }, d.stars),
          });
        }
      }
    }
  }

  renderAch() {
    this.y = 245;
    const got = ACHIEVEMENTS.filter((a) => S.achievements[a.id]).length;
    this.content.add(txt(this, W / 2, this.y, `Получено ${got} из ${ACHIEVEMENTS.length}. Каждая ачивка = ⭐, звёзды открывают декор и столики`, 19, '#7a5a3c', { wrap: W - 60 }));
    this.y += 30;
    ACHIEVEMENTS.forEach((a) => {
      const done = !!S.achievements[a.id];
      this.row(`${done ? '🏆' : '🔒'} ${a.name}`, a.desc, null, { h: 74, titleSize: 21 });
      if (done) this.content.add(txt(this, W - 50, this.y - 42, '⭐', 30, '#000', { ox: 1 }));
    });
  }
}
