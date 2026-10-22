// Кухня: выбор заказа, сборка по шагам (основа → добавка → подача), условия, подача, эксперименты.
import Phaser from 'phaser';
import {
  W, C, txt, button, overlayBase, drawBar, patienceColor,
} from '../ui.js';
import {
  S, run, bus, save, unlock, available, addCoins, isKnown, brewTime, redoTime,
} from '../state.js';
import {
  INGREDIENTS, CATEGORIES, RECIPES, TYPES,
} from '../data.js';
import { beep } from '../audio.js';

const SLOT_X = [200, 360, 520];
const SLOT_Y = 330;
const EXTRAS = [
  { id: 'sugar', label: '🍬 Сахар' },
  { id: 'foam', label: '🥛 Пенка' },
  { id: 'double', label: '☕×2 Шот' },
  { id: 'ice', label: '❄️ Лёд' },
];
const CAT_NAME = { base: 'Основа', addon: 'Добавка', serve: 'Подача' };

function newProgress() {
  return { cur: [], extras: { sugar: true, foam: true, double: false, ice: false }, brewLeft: 0, ready: false };
}

export default class KitchenScene extends Phaser.Scene {
  constructor() { super('Kitchen'); }

  create() {
    this.main = this.scene.get('Main');
    this.exp = [];
    this.lock = 0;
    this.lockOrder = null;
    this.wasBrewing = false;
    this.tabBtns = [];
    this.sel = run.orders[0] || null;

    overlayBase(this, '🍳 Кухня', () => this.scene.stop());
    this.repairBtn = button(this, 110, 55, 180, 76, '🔧 Починить', () => this.scene.launch('Repair'), { color: C.red, size: 24 });

    this.info = txt(this, W / 2, 205, '', 24, '#3b2a1e', { wrap: W - 60 });
    this.patBar = this.add.graphics();

    // Слоты сборки
    this.slotG = this.add.graphics();
    this.slotIcons = SLOT_X.map((x) => txt(this, x, SLOT_Y, '', 64));
    this.slotLabels = SLOT_X.map((x) => txt(this, x, SLOT_Y + 78, '', 20, '#7a5a3c', { bold: true }));
    this.status = txt(this, W / 2, 448, '', 26, '#3b2a1e', { bold: true, wrap: W - 40 });
    this.brewG = this.add.graphics();

    this.buildIngredients();

    this.extraBtns = EXTRAS.map((e, i) => button(this, 96 + i * 176, 1010, 164, 76, e.label, () => this.toggleExtra(e.id), { size: 22 }));
    this.resetBtn = button(this, 150, 1150, 240, 110, '🔄 Сброс', () => this.resetCurrent(), { color: C.gray });
    this.serveBtn = button(this, 485, 1150, 390, 110, '🛎️ Подать', () => this.serve(), { color: C.green, size: 32 });

    bus.on('orders', this.onOrders, this);
    this.events.once('shutdown', () => bus.off('orders', this.onOrders, this));
    this.renderTabs();
    this.renderSel();
  }

  buildIngredients() {
    let y = 510;
    this.ingBtns = {};
    for (const cat of CATEGORIES) {
      txt(this, 24, y, cat.name, 24, '#7a5a3c', { bold: true, ox: 0 });
      const ids = Object.keys(INGREDIENTS).filter((id) => INGREDIENTS[id].cat === cat.id && available(id));
      ids.forEach((id, i) => {
        const ing = INGREDIENTS[id];
        const b = button(this, 70 + i * 116, y + 85, 108, 104, '', () => this.tapIngredient(id), { color: 0xffffff, r: 16 });
        b.add(txt(this, 0, -14, ing.icon, 44));
        b.add(txt(this, 0, 33, ing.name, ing.name.length > 9 ? 13 : 17, '#3b2a1e', { bold: true }));
        if (ing.season) b.add(txt(this, 40, -38, '★', 20, '#e0a82e', { bold: true }));
        this.ingBtns[id] = b;
      });
      y += 160;
    }
    if (this.ingBtns.coffee) {
      this.coffeeBroken = txt(this, 0, -14, '🔧', 40).setVisible(false);
      this.ingBtns.coffee.add(this.coffeeBroken);
    }
  }

  onOrders() {
    if (this.sel && !run.orders.includes(this.sel)) this.sel = run.orders[0] || null;
    this.renderTabs();
    this.renderSel();
  }

  renderTabs() {
    this.tabBtns.forEach((b) => b.destroy());
    this.tabBtns = [];
    const list = run.orders.slice(0, 4);
    const n = list.length + 1;
    const w = Math.min(170, (W - 30) / n - 10);
    const total = n * (w + 10) - 10;
    const x0 = (W - total) / 2 + w / 2;
    list.forEach((o, i) => {
      const c = o.customer;
      const ready = o.progress && o.progress.ready;
      const label = `#${o.id} ${c.name}\n${TYPES[c.type].icon} стол ${o.table + 1}${ready ? ' ✅' : ''}`;
      const b = button(this, x0 + i * (w + 10), 150, w, 74, label, () => { this.sel = o; this.renderTabs(); this.renderSel(); }, { size: 18, color: C.accent });
      if (this.sel === o) b.setBtnSelected(true).setBtnColor(C.green);
      this.tabBtns.push(b);
    });
    const e = button(this, x0 + list.length * (w + 10), 150, w, 74, '⚗️ Опыт', () => { this.sel = null; this.renderTabs(); this.renderSel(); }, { size: 20, color: C.blue });
    if (!this.sel) e.setBtnSelected(true);
    this.tabBtns.push(e);
  }

  progress() {
    if (!this.sel) return null;
    if (!this.sel.progress) this.sel.progress = newProgress();
    return this.sel.progress;
  }

  renderSel() {
    const o = this.sel;
    const p = this.progress();
    const cur = o ? p.cur : this.exp;

    this.slotG.clear();
    SLOT_X.forEach((x, i) => {
      const active = i === cur.length;
      this.slotG.fillStyle(active ? 0xfff9c4 : 0xffffff, 1);
      this.slotG.fillRoundedRect(x - 65, SLOT_Y - 60, 130, 120, 18);
      this.slotG.lineStyle(4, active ? C.gold : 0xd7c3a5, 1);
      this.slotG.strokeRoundedRect(x - 65, SLOT_Y - 60, 130, 120, 18);
      if (i < 2) {
        this.slotG.fillStyle(0xc8a27a, 1);
        this.slotG.fillTriangle(x + 72, SLOT_Y - 10, x + 72, SLOT_Y + 10, x + 88, SLOT_Y);
      }
      this.slotIcons[i].setText(cur[i] ? INGREDIENTS[cur[i]].icon : '');
      this.slotLabels[i].setText(o ? `${i + 1}. ${CAT_NAME[INGREDIENTS[o.steps[i]].cat]}` : `${i + 1}`);
    });

    this.extraBtns.forEach((b, i) => {
      const id = EXTRAS[i].id;
      const on = o ? p.extras[id] : false;
      b.setVisible(!!o);
      b.setBtnColor(on ? C.green : C.gray);
      b.setBtnLabel(`${EXTRAS[i].label}${on ? ' ✓' : ''}`);
    });
    this.serveBtn.setVisible(!!o);
    this.serveBtn.setBtnEnabled(!!(o && p.ready));

    if (!o) {
      this.info.setText('⚗️ Смешайте 3 ингредиента в любом порядке —\nвдруг получится новый напиток?');
      if (!this.lock) this.status.setText('Неудачный опыт стоит 1 💰');
    } else if (!this.lock) {
      if (p.ready) this.status.setText('✅ Готово! Проверьте условия и подавайте');
      else if (p.brewLeft > 0) this.status.setText('⏳ Готовится…');
      else this.status.setText(`Шаг ${p.cur.length + 1}: ${CAT_NAME[INGREDIENTS[o.steps[p.cur.length]].cat].toLowerCase()} · помните заказ? Загляните в 📒`);
    }
    this.repairBtn.setVisible(run.broken);
    if (this.coffeeBroken) {
      this.coffeeBroken.setVisible(run.broken);
      this.ingBtns.coffee.list[2].setAlpha(run.broken ? 0.25 : 1);
    }
  }

  tapIngredient(id) {
    if (this.lock > 0) return;
    if (id === 'coffee' && run.broken) {
      beep('error');
      bus.emit('toast', '💥 Кофемашина сломана — почините её!');
      return;
    }
    if (!this.sel) { this.experiment(id); return; }
    const o = this.sel;
    const p = this.progress();
    if (p.cur.length >= 3) return;
    const expected = o.steps[p.cur.length];
    if (id !== expected) { this.redo(); return; }
    const ing = INGREDIENTS[id];
    if (ing.whip) {
      this.scene.launch('Whip', {
        onDone: (ok) => {
          if (ok && run.orders.includes(o) && o.progress.cur.length < 3) this.pushStep(o, id);
          this.renderSel();
        },
      });
      return;
    }
    this.pushStep(o, id);
  }

  pushStep(o, id) {
    const p = o.progress;
    p.cur.push(id);
    beep('click');
    if (p.cur.length === 3) p.brewLeft = brewTime();
    this.renderSel();
    if (this.sel === o) this.renderTabs();
  }

  // Ошибка на шаге — переделка и потеря времени.
  redo() {
    const o = this.sel;
    o.redos += 1;
    beep('error');
    this.cameras.main.shake(250, 0.01);
    this.lock = redoTime();
    this.status.setText(`❌ Не то! Переделываем… (${(this.lock / 1000).toFixed(1)}с)`);
    this.lockOrder = o;
  }

  resetCurrent() {
    if (this.lock > 0) return;
    if (!this.sel) { this.exp = []; this.renderSel(); return; }
    this.sel.progress = newProgress();
    this.renderSel();
    this.renderTabs();
  }

  toggleExtra(id) {
    const p = this.progress();
    if (!p) return;
    p.extras[id] = !p.extras[id];
    this.renderSel();
  }

  serve() {
    const o = this.sel;
    if (!o || !o.progress || !o.progress.ready) return;
    this.main.serveOrder(o, o.progress.extras);
  }

  experiment(id) {
    if (this.exp.length >= 3) return;
    this.exp.push(id);
    beep('click');
    this.renderSel();
    if (this.exp.length < 3) return;
    const seq = this.exp.join(',');
    const r = RECIPES.find((x) => x.steps.join(',') === seq && x.steps.every(available));
    this.lock = 1200;
    if (r && isKnown(r)) {
      this.status.setText(`📖 Уже известно: ${r.name}`);
    } else if (r) {
      S.discovered.push(r.id);
      save();
      beep('success');
      this.status.setText(`🎉 Новый рецепт: ${r.name}!`);
      bus.emit('toast', `🎉 Открыт рецепт «${r.name}» — теперь его будут заказывать!`);
      unlock('recipe1');
      if (S.discovered.length >= 5) unlock('recipe5');
    } else {
      addCoins(-1);
      beep('error');
      this.status.setText('💨 Ничего не вышло… (−1 💰)');
    }
  }

  update(time, delta) {
    if (this.lock > 0) {
      this.lock -= delta;
      if (this.sel && this.lockOrder === this.sel) this.status.setText(`❌ Не то! Переделываем… (${Math.max(0, this.lock / 1000).toFixed(1)}с)`);
      if (this.lock <= 0) {
        this.lock = 0;
        if (this.lockOrder) {
          this.lockOrder.progress = newProgress();
          this.lockOrder = null;
        } else {
          this.exp = [];
        }
        this.renderSel();
      }
    }

    this.patBar.clear();
    this.brewG.clear();
    const o = this.sel;
    if (o) {
      const c = o.customer;
      const frac = Math.max(0, c.patience / c.maxP);
      this.info.setText(`${TYPES[c.type].icon} ${c.name} (${TYPES[c.type].name.toLowerCase()}) · столик ${o.table + 1}`);
      drawBar(this.patBar, 160, 232, 400, 14, frac, patienceColor(frac));
      const p = o.progress;
      if (p && p.brewLeft > 0) {
        drawBar(this.brewG, 160, 474, 400, 16, 1 - p.brewLeft / brewTime(), C.blue);
        this.wasBrewing = true;
      } else if (this.wasBrewing) {
        this.wasBrewing = false;
        this.renderSel();
        this.renderTabs();
      }
    }
    if (this.repairBtn.visible !== run.broken) this.renderSel();
  }
}
