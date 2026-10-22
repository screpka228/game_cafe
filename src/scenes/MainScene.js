// Главный экран: очередь сверху, стойка-касса, столики, HUD, события.
import Phaser from 'phaser';
import {
  W, H, C, txt, button, modal, drawBar, patienceColor,
} from '../ui.js';
import {
  S, run, bus, save, addCoins, unlock, makeOrder, writeNote, pick, pickType, patienceMul,
} from '../state.js';
import {
  TYPES, NAMES, FACES, SHIRTS, INGREDIENTS, CONDITIONS, DECOR, SEASONS, MAX_TABLES, season, condText,
} from '../data.js';
import { beep } from '../audio.js';

const QUEUE_X = [600, 455, 310, 165];
const QUEUE_Y = 225;
const TABLE_POS = [[185, 650], [535, 650], [185, 945], [535, 945]];
const HALL_TOP = 400;
const HALL_BOTTOM = 1110;
const MAX_REGULARS = 6;
const NOTE_MS = 4500;

export default class MainScene extends Phaser.Scene {
  constructor() { super('Main'); }

  create() {
    this.customers = [];
    this.queue = [];
    this.spills = [];
    this.tables = TABLE_POS.map(() => ({ customer: null, dirty: false }));
    this.roomObjs = [];
    this.tableObjs = [];
    this.spawnT = 2000;
    this.eventT = 45000;
    this.spillT = 25000;

    this.drawRoom();
    this.drawTables();
    this.createHud();
    this.createNav();

    this.scene.launch('Toast');

    const onRoom = () => { this.drawRoom(); this.drawTables(); };
    bus.on('room', onRoom);
    bus.on('orders', this.refreshNav, this);
    this.events.once('shutdown', () => { bus.off('room', onRoom); bus.off('orders', this.refreshNav, this); });

    if (run.offline) {
      const { mins, coins } = run.offline;
      run.offline = null;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const time = h ? `${h} ч ${m} мин` : `${m} мин`;
      modal(this, `☕ С возвращением!\n\nПока вас не было (${time}), кафе заработало\n+${coins} 💰`, [{ label: 'Отлично!', color: C.green }]);
      beep('coin');
    } else if (S.stats.served === 0) {
      modal(this, '👋 Добро пожаловать в кафе!\n\nНажмите на первого гостя в очереди, запомните заказ (3 значка) и приготовьте его на кухне.', [{ label: 'Начать', color: C.green }]);
    }
  }

  // ---------- Отрисовка зала ----------
  drawRoom() {
    this.roomObjs.forEach((o) => o.destroy());
    this.roomObjs = [];
    const add = (o) => { this.roomObjs.push(o); return o.setDepth(0); };
    const wall = DECOR.wall.find((d) => d.id === S.decor.wall) || DECOR.wall[0];
    const dark = wall.id === 'night';
    const wallCol = Phaser.Display.Color.IntegerToColor(wall.color);

    // Улица/вход с очередью
    add(this.add.rectangle(W / 2, 250, W, 300, wallCol.clone().darken(12).color));
    const g = add(this.add.graphics());
    // окна
    g.fillStyle(0xbfe3f5, dark ? 0.35 : 0.9);
    g.fillRoundedRect(30, 130, 110, 120, 10);
    g.fillRoundedRect(W - 140, 130, 110, 80, 10);
    g.lineStyle(4, 0xffffff, 0.8);
    g.strokeRoundedRect(30, 130, 110, 120, 10);
    // дверь
    g.fillStyle(0x7a4b2a, 1);
    g.fillRoundedRect(-20, 160, 50, 150, 8);
    add(txt(this, 85, 312, 'ВХОД →', 20, dark ? '#ffffff' : '#6b4a2f', { bold: true }));

    // Зал
    add(this.add.rectangle(W / 2, (HALL_TOP + HALL_BOTTOM) / 2, W, HALL_BOTTOM - HALL_TOP, wall.color));
    const f = add(this.add.graphics());
    f.lineStyle(2, 0x000000, 0.06);
    for (let x = 0; x <= W; x += 80) f.lineBetween(x, HALL_TOP, x, HALL_BOTTOM);
    for (let y = HALL_TOP; y <= HALL_BOTTOM; y += 80) f.lineBetween(0, y, W, y);

    // Стойка-касса
    const cg = add(this.add.graphics());
    cg.fillStyle(0x7a4b2a, 1);
    cg.fillRect(0, 300, W, 100);
    cg.fillStyle(0xa86a3c, 1);
    cg.fillRect(0, 300, W, 22);
    add(txt(this, 668, 352, '🛎️', 46));
    add(txt(this, 330, 362, 'КАССА · нажмите на первого гостя', 22, '#ffe9cc', { bold: true }));

    // Украшения
    const deco = DECOR.deco.find((d) => d.id === S.decor.deco);
    if (deco && deco.icon) {
      [[40, 440], [W - 40, 440], [40, 1075], [W - 40, 1075], [W / 2, 795]].forEach(([x, y]) => add(txt(this, x, y, deco.icon, 50)));
    }
  }

  drawTables() {
    this.tableObjs.forEach((o) => o.destroy());
    this.tableObjs = [];
    const style = DECOR.table.find((d) => d.id === S.decor.table) || DECOR.table[0];
    const labelCol = S.decor.wall === 'night' ? '#ffffff' : '#5a3d26';
    TABLE_POS.forEach(([x, y], i) => {
      const t = this.tables[i];
      const g = this.add.graphics().setDepth(1);
      this.tableObjs.push(g);
      if (i < S.tables) {
        g.fillStyle(0x000000, 0.15);
        g.fillEllipse(x, y + 18, 190, 70);
        g.fillStyle(0x6d4c41, 1);
        g.fillCircle(x - 105, y + 10, 26);
        g.fillCircle(x + 105, y + 10, 26);
        g.fillStyle(style.color, 1);
        g.fillEllipse(x, y, 180, 90);
        g.lineStyle(4, 0x000000, 0.15);
        g.strokeEllipse(x, y, 180, 90);
        const label = txt(this, x, y + 70, `Столик ${i + 1}`, 20, labelCol, { bold: true }).setDepth(1);
        this.tableObjs.push(label);
        const dirty = txt(this, x, y - 4, '🍵💦', 40).setDepth(2).setVisible(t.dirty);
        t.dirtyIcon = dirty;
        this.tableObjs.push(dirty);
        const zone = this.add.zone(x, y, 200, 110).setInteractive().setDepth(2);
        zone.on('pointerup', () => this.cleanTable(i));
        this.tableObjs.push(zone);
      } else {
        g.lineStyle(4, 0x000000, 0.2);
        g.strokeEllipse(x, y, 180, 90);
        const lock = txt(this, x, y, '🔒', 40).setAlpha(0.5).setDepth(1);
        const label = txt(this, x, y + 70, 'Купите в магазине', 18, labelCol).setAlpha(0.6).setDepth(1);
        this.tableObjs.push(lock, label);
      }
    });
  }

  // ---------- HUD и навигация ----------
  createHud() {
    this.add.rectangle(W / 2, 45, W, 90, C.dark).setDepth(10);
    this.coinsText = txt(this, 20, 45, '', 32, '#ffd54f', { bold: true, ox: 0 }).setDepth(11);
    this.starsText = txt(this, 215, 45, '', 30, '#ffffff', { bold: true, ox: 0 }).setDepth(11);
    this.cleanText = txt(this, 335, 45, '', 26, '#ffffff', { ox: 0 }).setDepth(11);
    const s = SEASONS[season()];
    this.seasonText = txt(this, 490, 45, `${s.icon} ${s.name}`, 24, '#ffffff', { ox: 0 }).setDepth(11);
    this.repairBtn = button(this, 660, 45, 100, 70, '🔧', () => this.openOverlay('Repair'), { color: C.red, size: 34 }).setDepth(11);
    this.repairBtn.setVisible(false);
    this.banner = txt(this, W / 2, 94, '', 22, '#ffffff', { bold: true, stroke: '#000000', strokeThickness: 5, oy: 0 }).setDepth(11);
    this.updateHud();
  }

  updateHud() {
    this.coinsText.setText(`💰 ${S.coins}`);
    this.starsText.setText(`⭐ ${S.stars}`);
    this.cleanText.setText(`✨ ${this.cleanliness()}%`);
    this.repairBtn.setVisible(run.broken);
    const parts = [];
    if (run.blogger > 0) parts.push(`📸 Блогер: оплата ×2 (${Math.ceil(run.blogger / 1000)}с)`);
    if (run.inspection > 0) parts.push(`🕵️ Проверка через ${Math.ceil(run.inspection / 1000)}с — уберите зал!`);
    if (run.broken) parts.push('💥 Кофемашина сломана');
    this.banner.setText(parts.join('\n'));
  }

  createNav() {
    this.add.rectangle(W / 2, 1195, W, 170, C.dark).setDepth(10);
    const items = [
      ['🍳', 'Кухня', 'Kitchen'],
      ['📒', 'Блокнот', 'Notepad'],
      ['🛒', 'Магазин', 'Shop'],
      ['⚙️', 'Настройки', 'Settings'],
    ];
    this.navBtns = items.map(([icon, label, key], i) => button(this, 92 + i * 179, 1195, 168, 140, label, () => this.openOverlay(key), { size: 25, icon, iconSize: 44 }).setDepth(11));
    this.refreshNav();
  }

  refreshNav() {
    const n = run.orders.length;
    this.navBtns[0].setBtnLabel(n ? `Кухня (${n})` : 'Кухня');
    this.navBtns[0].setBtnColor(n ? C.green : C.accent);
  }

  openOverlay(key, data) {
    if (this.scene.isActive(key)) return;
    this.scene.launch(key, data);
  }

  // ---------- Клиенты ----------
  spawnCustomer() {
    const present = new Set(this.customers.map((c) => c.name));
    const regNames = Object.keys(S.regulars).filter((n) => !present.has(n));
    const freeNames = NAMES.filter((n) => !present.has(n) && !S.regulars[n]);
    let name;
    if (regNames.length && (Math.random() < 0.35 || !freeNames.length)) name = pick(regNames);
    else name = pick(freeNames.length ? freeNames : NAMES.filter((n) => !present.has(n)));
    if (!name) return;

    const reg = S.regulars[name];
    const type = reg ? reg.type : pickType();
    const T = TYPES[type];
    const maxP = T.patience * 1000 * patienceMul();
    const c = {
      name, type, isRegular: !!reg, face: reg ? reg.face : pick(FACES),
      patience: maxP, maxP, state: 'queue', order: null, table: -1, bubble: null,
    };

    const obj = this.add.container(-120, QUEUE_Y).setDepth(3);
    const body = this.add.graphics();
    body.fillStyle(pick(SHIRTS), 1);
    body.fillRoundedRect(-38, 12, 76, 62, 22);
    const head = txt(this, 0, -16, c.face, 62);
    const typeIcon = txt(this, 44, -62, T.icon, 30);
    const bar = this.add.graphics();
    const nameText = txt(this, 0, 92, name, 20, '#ffffff', { bold: true, stroke: '#3b2a1e', strokeThickness: 5 });
    const idText = txt(this, -46, 40, '', 20, '#ffffff', { bold: true, stroke: '#3b2a1e', strokeThickness: 5 });
    obj.add([body, head, typeIcon, bar, nameText, idText]);
    if (c.isRegular) obj.add(txt(this, -44, -62, '⭐', 26));
    obj.setSize(120, 200);
    obj.setInteractive();
    obj.on('pointerup', () => this.onCustomerTap(c));
    Object.assign(c, { obj, head, bar, idText });

    this.customers.push(c);
    this.queue.push(c);
    this.layoutQueue();
  }

  layoutQueue() {
    this.queue.forEach((c, i) => {
      this.tweens.add({ targets: c.obj, x: QUEUE_X[i], y: QUEUE_Y, duration: 600, ease: 'Sine.easeOut' });
    });
  }

  onCustomerTap(c) {
    if (c.state === 'queue') {
      if (this.queue[0] !== c) {
        bus.emit('toast', 'Сначала обслужите первого в очереди');
        return;
      }
      this.takeOrder(c);
    } else if (c.state === 'seated') {
      this.peek(c);
    }
  }

  freeTable() {
    return this.tables.findIndex((t, i) => i < S.tables && !t.customer && !t.dirty);
  }

  takeOrder(c) {
    const ti = this.freeTable();
    if (ti < 0) {
      beep('error');
      bus.emit('toast', 'Нет свободного чистого столика! 💦');
      return;
    }
    if (c.isRegular) {
      modal(this, `⭐ ${c.name} — постоянный гость:\n«Мне как обычно!»\n\nПомните любимый заказ?\nУгадаете без ошибок — бонус +15 💰`, [
        { label: 'Помню!', color: C.green, cb: () => this.seat(c, true) },
        { label: 'Напомните', cb: () => this.seat(c, false) },
      ]);
      return;
    }
    this.seat(c, false);
  }

  seat(c, guess) {
    const ti = this.freeTable();
    if (c.state !== 'queue' || ti < 0) return;
    const fav = c.isRegular ? S.regulars[c.name].fav : null;
    const base = fav ? { steps: [...fav.steps], name: fav.name, price: fav.price, cond: fav.cond } : makeOrder(c.type);
    const o = Object.assign(base, {
      id: run.seq++, customer: c, table: ti, guess, redos: 0, progress: null,
    });
    o.note = guess ? null : writeNote(o, this.queue.length - 1);

    c.order = o;
    c.state = 'seated';
    c.table = ti;
    this.tables[ti].customer = c;
    this.queue.shift();
    run.orders.push(o);
    c.idText.setText(`#${o.id}`);

    const [x, y] = TABLE_POS[ti];
    this.tweens.add({ targets: c.obj, x, y: y - 95, duration: 700, ease: 'Sine.easeInOut' });
    this.layoutQueue();
    this.showNote(c, NOTE_MS, guess);
    beep('click');
    bus.emit('orders');
  }

  // Записка-рецепт над гостем: три иконки (+ условие), нужно запомнить.
  showNote(c, ms, hideRecipe = false) {
    if (c.bubble) c.bubble.destroy();
    const o = c.order;
    const [x, y] = TABLE_POS[c.table];
    const b = this.add.container(x, y - 215).setDepth(5);
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.97);
    g.fillRoundedRect(-150, -62, 300, 124, 20);
    g.fillTriangle(-14, 60, 14, 60, 0, 82);
    g.lineStyle(3, C.accent, 1);
    g.strokeRoundedRect(-150, -62, 300, 124, 20);
    b.add(g);
    b.add(txt(this, -132, -46, `#${o.id}`, 18, '#9a6a3f', { bold: true, ox: 0 }));
    if (hideRecipe) {
      b.add(txt(this, 0, -6, '«Как обычно!»', 30, '#3b2a1e', { bold: true }));
      b.add(txt(this, 0, 36, 'вспомните сами 🤔', 20, '#777777'));
    } else {
      b.add(txt(this, 0, -12, o.steps.map((s) => INGREDIENTS[s].icon).join(' ➜ '), 40));
      const ct = condText(o);
      b.add(txt(this, 0, 38, ct ? `⚠ ${ct}` : 'запомните!', 22, ct ? '#d9534f' : '#777777', { bold: !!ct }));
    }
    b.setScale(0.3);
    this.tweens.add({ targets: b, scale: 1, duration: 200, ease: 'Back.easeOut' });
    c.bubble = b;
    this.time.delayedCall(ms, () => {
      if (c.bubble !== b) return;
      this.tweens.add({ targets: b, alpha: 0, duration: 300, onComplete: () => b.destroy() });
      c.bubble = null;
    });
  }

  // Подсмотреть заказ ещё раз — стоит терпения гостя.
  peek(c) {
    if (c.bubble) return;
    c.patience -= c.maxP * 0.15;
    if (c.order.guess) {
      c.order.guess = false;
      bus.emit('toast', 'Подсказка взята — бонуса за угадывание не будет');
    }
    if (c.isRegular) {
      // постоянный гость, даже если не угадывали — запись в блокноте появится
      c.order.note = c.order.note || { steps: [...c.order.steps], cond: c.order.cond };
      bus.emit('orders');
    }
    beep('click');
    this.showNote(c, 2500);
  }

  removeCustomer(c, face, dx = 0) {
    c.state = 'leaving';
    if (c.bubble) { c.bubble.destroy(); c.bubble = null; }
    this.customers = this.customers.filter((x) => x !== c);
    c.obj.disableInteractive();
    c.head.setText(face);
    c.bar.clear();
    this.tweens.add({
      targets: c.obj, alpha: 0, x: c.obj.x + dx, y: c.obj.y - 40, delay: 500, duration: 700,
      onComplete: () => c.obj.destroy(),
    });
  }

  leaveAngry(c) {
    if (c.state === 'queue') {
      this.queue = this.queue.filter((x) => x !== c);
      this.layoutQueue();
    } else if (c.state === 'seated') {
      this.tables[c.table].customer = null;
      run.orders = run.orders.filter((o) => o !== c.order);
      bus.emit('orders');
    }
    S.stats.lost += 1;
    save();
    beep('error');
    bus.emit('toast', `😠 ${c.name}: не дождались — ушли`);
    this.removeCustomer(c, '😠', -60);
  }

  // Выдача заказа с кухни. extras — переключатели (сахар, пенка, двойной шот, лёд).
  serveOrder(order, extras) {
    const c = order.customer;
    if (!c || c.state !== 'seated') return null;
    const T = TYPES[c.type];
    const condOk = !order.cond || CONDITIONS[order.cond].check(extras);
    const frac = Math.max(0, c.patience / c.maxP);
    let pay = order.price * T.pay;
    let tip = order.price * T.tip * frac;
    let msg = null;
    if (!condOk) {
      tip = 0;
      if (c.type === 'picky') {
        pay = 0;
        msg = `🧐 Условие «${condText(order)}» не выполнено — привереда не платит!`;
      } else {
        pay *= 0.5;
        msg = `Условие «${condText(order)}» не выполнено: −50%`;
      }
    }
    if (c.type === 'picky' && order.redos > 0) tip = 0;
    let bonus = 0;
    if (order.guess && order.redos === 0 && condOk) {
      bonus = 15;
      unlock('regular');
    }
    const mult = run.blogger > 0 ? 2 : 1;
    const total = Math.round((pay + tip + bonus) * mult);
    const perfect = condOk && order.redos === 0;

    S.stats.served += 1;
    if (perfect) S.stats.perfect += 1;
    if (condOk) {
      const r = S.regulars[c.name];
      if (r) r.visits += 1;
      else if (Object.keys(S.regulars).length < MAX_REGULARS && Math.random() < 0.5) {
        S.regulars[c.name] = {
          fav: { steps: order.steps, name: order.name, price: order.price, cond: order.cond },
          visits: 1, type: c.type, face: c.face,
        };
      }
    }
    addCoins(total);
    if (S.stats.served >= 1) unlock('first');
    if (S.stats.served >= 25) unlock('served25');
    if (S.stats.served >= 100) unlock('served100');
    if (S.stats.perfect >= 10) unlock('perfect10');
    if (mult > 1) unlock('blogger');

    run.orders = run.orders.filter((o) => o !== order);
    const t = this.tables[c.table];
    t.customer = null;
    t.dirty = true;
    if (t.dirtyIcon) t.dirtyIcon.setVisible(true);

    this.floatText(c.obj.x, c.obj.y - 80, `+${total} 💰`);
    let face = '🙂';
    if (!condOk) face = '😒';
    else if (perfect) face = '😍';
    this.removeCustomer(c, face, 0);
    beep(condOk ? 'coin' : 'error');
    let line = `${c.name}: +${total} 💰`;
    if (tip >= 1) line += ' (с чаевыми)';
    if (bonus) line += ' · угадали «как обычно»!';
    if (mult > 1) line += ' · ×2 блогер';
    bus.emit('toast', msg || line);
    save();
    bus.emit('orders');
    return { total, condOk };
  }

  floatText(x, y, s) {
    const t = txt(this, x, y, s, 34, '#ffd54f', { bold: true, stroke: '#3b2a1e', strokeThickness: 6 }).setDepth(20);
    this.tweens.add({ targets: t, y: y - 90, alpha: 0, duration: 1300, onComplete: () => t.destroy() });
  }

  // ---------- Чистота ----------
  cleanTable(i) {
    const t = this.tables[i];
    if (!t.dirty) {
      if (t.customer) this.peek(t.customer);
      return;
    }
    t.dirty = false;
    t.dirtyIcon.setVisible(false);
    beep('clean');
    const [x, y] = TABLE_POS[i];
    this.floatText(x, y, '✨');
  }

  spawnSpill() {
    if (this.spills.length >= 3) return;
    let x; let y;
    for (let k = 0; k < 20; k++) {
      x = Phaser.Math.Between(60, W - 60);
      y = Phaser.Math.Between(HALL_TOP + 60, HALL_BOTTOM - 40);
      if (TABLE_POS.every(([tx, ty]) => Math.abs(tx - x) > 130 || Math.abs(ty - y) > 110)) break;
    }
    const s = txt(this, x, y, '💧', 44).setDepth(2).setInteractive();
    s.on('pointerup', () => {
      this.spills = this.spills.filter((o) => o !== s);
      beep('clean');
      s.destroy();
    });
    this.spills.push(s);
  }

  cleanliness() {
    const dirty = this.tables.filter((t) => t.dirty).length;
    return Math.max(0, 100 - dirty * 25 - this.spills.length * 15);
  }

  // ---------- Случайные события ----------
  randomEvent() {
    const options = [];
    if (run.blogger <= 0) options.push('blogger');
    if (!run.broken) options.push('break');
    if (run.inspection <= 0) options.push('inspection');
    if (!options.length) return;
    const ev = pick(options);
    beep('alarm');
    if (ev === 'blogger') {
      run.blogger = 30000;
      bus.emit('toast', '📸 Пришёл блогер! 30 секунд двойной оплаты!');
    } else if (ev === 'break') {
      run.broken = true;
      bus.emit('toast', '💥 Кофемашина сломалась! Почините её — кнопка 🔧');
    } else {
      run.inspection = 20000;
      bus.emit('toast', '🕵️ Через 20 секунд санэпидемстанция! Уберите столы и пол');
    }
  }

  finishInspection() {
    const cl = this.cleanliness();
    if (cl >= 80) {
      addCoins(30);
      unlock('inspection');
      beep('success');
      bus.emit('toast', `✅ Проверка пройдена (чистота ${cl}%)! +30 💰`);
    } else {
      addCoins(-20);
      beep('error');
      bus.emit('toast', `❌ Грязно (${cl}%)! Штраф −20 💰`);
    }
  }

  update(time, delta) {
    const dt = Math.min(delta, 200);

    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      if (this.queue.length < 4) this.spawnCustomer();
      const busy = S.tables >= 3 ? 0.85 : 1;
      this.spawnT = Phaser.Math.Between(7000, 13000) * busy;
    }

    for (const c of [...this.customers]) {
      if (c.state === 'leaving') continue;
      c.patience -= dt * (c.state === 'queue' ? 0.6 : 1);
      if (c.patience <= 0) {
        this.leaveAngry(c);
        continue;
      }
      const frac = c.patience / c.maxP;
      c.bar.clear();
      drawBar(c.bar, -40, -82, 80, 12, frac, patienceColor(frac));
    }

    // Варка в процессе — тикает, даже если кухня закрыта.
    for (const o of run.orders) {
      const p = o.progress;
      if (p && p.brewLeft > 0) {
        p.brewLeft -= dt;
        if (p.brewLeft <= 0) { p.brewLeft = 0; p.ready = true; }
      }
    }

    this.spillT -= dt;
    if (this.spillT <= 0) {
      this.spawnSpill();
      this.spillT = Phaser.Math.Between(18000, 35000);
    }

    this.eventT -= dt;
    if (this.eventT <= 0) {
      this.randomEvent();
      this.eventT = Phaser.Math.Between(55000, 95000);
    }
    if (run.blogger > 0) {
      run.blogger -= dt;
      if (run.blogger <= 0) { run.blogger = 0; bus.emit('toast', '📸 Блогер ушёл'); }
    }
    if (run.inspection > 0) {
      run.inspection -= dt;
      if (run.inspection <= 0) { run.inspection = 0; this.finishInspection(); }
    }

    this.updateHud();
  }
}

export { TABLE_POS, MAX_TABLES };
