// Блокнот у кассы: записанные заказы (могут быть с ошибками!), книга рецептов, постоянные гости.
import Phaser from 'phaser';
import {
  W, C, txt, button, overlayBase,
} from '../ui.js';
import {
  S, run, bus, isKnown,
} from '../state.js';
import {
  INGREDIENTS, RECIPES, TYPES, CONDITIONS, SEASONS,
} from '../data.js';

const TABS = [['orders', '📒 Заказы'], ['recipes', '📖 Рецепты'], ['guests', '⭐ Гости']];

export default class NotepadScene extends Phaser.Scene {
  constructor() { super('Notepad'); }

  create() {
    overlayBase(this, '📒 Блокнот', () => this.scene.stop());
    this.tab = 'orders';
    this.content = this.add.container(0, 0);
    this.tabBtns = TABS.map(([id, label], i) => button(this, 125 + i * 235, 160, 220, 80, label, () => { this.tab = id; this.render(); }, { size: 24 }));
    bus.on('orders', this.render, this);
    this.events.once('shutdown', () => bus.off('orders', this.render, this));
    this.render();
  }

  render() {
    this.tabBtns.forEach((b, i) => b.setBtnSelected(TABS[i][0] === this.tab).setBtnColor(TABS[i][0] === this.tab ? C.green : C.accent));
    this.content.removeAll(true);
    if (this.tab === 'orders') this.renderOrders();
    else if (this.tab === 'recipes') this.renderRecipes();
    else this.renderGuests();
  }

  card(y, h) {
    const g = this.add.graphics();
    g.fillStyle(C.card, 1);
    g.fillRoundedRect(30, y, W - 60, h, 18);
    this.content.add(g);
  }

  put(...objs) { this.content.add(objs); }

  renderOrders() {
    this.put(txt(this, W / 2, 245, '⚠ Записи у кассы делаются в спешке: чем длиннее очередь, тем выше шанс ошибки. Доверяйте, но проверяйте!', 21, '#9a5a2f', { wrap: W - 60 }));
    if (!run.orders.length) {
      this.put(txt(this, W / 2, 500, 'Заказов пока нет.\nНажмите на гостя у кассы.', 30, '#7a5a3c'));
      return;
    }
    run.orders.forEach((o, i) => {
      const y = 310 + i * 200;
      const c = o.customer;
      this.card(y, 180);
      this.put(txt(this, 55, y + 35, `#${o.id} ${c.name} ${TYPES[c.type].icon} · столик ${o.table + 1}`, 26, '#3b2a1e', { bold: true, ox: 0 }));
      if (!o.note) {
        this.put(txt(this, W / 2, y + 110, '«Как обычно» — вспомните сами! 🤔', 28, '#7a5a3c'));
      } else {
        this.put(txt(this, 55, y + 100, o.note.steps.map((s) => INGREDIENTS[s].icon).join(' ➜ '), 48, '#000000', { ox: 0 }));
        const ct = o.note.cond ? CONDITIONS[o.note.cond].text : '';
        if (ct) this.put(txt(this, W - 55, y + 100, `⚠ ${ct}`, 24, '#d9534f', { bold: true, ox: 1 }));
        this.put(txt(this, 55, y + 150, o.note.steps.map((s) => INGREDIENTS[s].name).join(', '), 18, '#7a5a3c', { ox: 0 }));
      }
      if (o.progress && o.progress.ready) this.put(txt(this, W - 55, y + 35, '✅ готово', 22, '#2e7d32', { bold: true, ox: 1 }));
    });
  }

  renderRecipes() {
    const known = RECIPES.filter(isKnown).length;
    this.put(txt(this, W / 2, 240, `Открыто: ${known} из ${RECIPES.length}. Смешивайте на кухне во вкладке ⚗️ Опыт`, 22, '#7a5a3c', { wrap: W - 60 }));
    RECIPES.forEach((r, i) => {
      const y = 280 + i * 74;
      this.card(y, 66);
      const known = isKnown(r);
      const seasonTag = r.season ? `${SEASONS[r.season].icon} ` : '';
      if (known) {
        this.put(txt(this, 50, y + 33, `${seasonTag}${r.name}`, 23, '#3b2a1e', { bold: true, ox: 0 }));
        this.put(txt(this, W - 50, y + 33, `${r.steps.map((s) => INGREDIENTS[s].icon).join('')}  ${r.price}💰`, 26, '#3b2a1e', { ox: 1 }));
      } else if (r.season) {
        this.put(txt(this, 50, y + 33, `${seasonTag}Сезонный напиток — ждите сезона «${SEASONS[r.season].name}»`, 20, '#9e9e9e', { ox: 0 }));
      } else {
        this.put(txt(this, 50, y + 33, `❓ ??? — ${r.hint}`, 20, '#7a5a3c', { ox: 0 }));
      }
    });
  }

  renderGuests() {
    const names = Object.keys(S.regulars);
    this.put(txt(this, W / 2, 245, 'Постоянные гости запоминают любимый заказ. Скажут «как обычно» — угадайте и получите бонус!', 21, '#7a5a3c', { wrap: W - 60 }));
    if (!names.length) {
      this.put(txt(this, W / 2, 500, 'Пока никого.\nХорошо обслуживайте гостей —\nони начнут возвращаться.', 28, '#7a5a3c'));
      return;
    }
    names.forEach((n, i) => {
      const r = S.regulars[n];
      const y = 310 + i * 110;
      this.card(y, 96);
      this.put(txt(this, 60, y + 48, r.face, 50, '#000', { ox: 0 }));
      this.put(txt(this, 140, y + 48, `${n} ${TYPES[r.type].icon}`, 28, '#3b2a1e', { bold: true, ox: 0 }));
      this.put(txt(this, W - 55, y + 48, `визитов: ${r.visits}`, 24, '#7a5a3c', { ox: 1 }));
    });
  }
}
