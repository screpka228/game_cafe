// Сохранение (localStorage), общее состояние, экономика и генерация заказов.
import Phaser from 'phaser';
import { App } from '@capacitor/app';
import {
  INGREDIENTS, RECIPES, ACHIEVEMENTS, START_MENU, TYPES, season,
} from './data.js';

const KEY = 'game_cafe_save_v1';
const OFFLINE_CAP_MS = 2 * 60 * 60 * 1000; // оффлайн-доход не более чем за 2 часа

function defaults() {
  return {
    coins: 0,
    tables: 2,
    menu: [...START_MENU],
    upgrades: { speed: 0, tables: 0 },
    settings: { shakeToWhip: false, shakeSensitivity: 0.5, sound: true },
    lastSeen: 0,
    stars: 0,
    achievements: {},
    discovered: [],
    regulars: {},
    stats: { served: 0, perfect: 0, lost: 0, earned: 0 },
    decor: { wall: 'cream', table: 'wood', deco: 'none', owned: ['cream', 'wood', 'none'] },
  };
}

function merge(base, extra) {
  for (const k of Object.keys(extra)) {
    const v = extra[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      merge(base[k], v);
    } else {
      base[k] = v;
    }
  }
  return base;
}

function load() {
  const d = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) merge(d, JSON.parse(raw));
  } catch (e) { /* повреждённое сохранение — начинаем заново */ }
  return d;
}

export const S = load();
export const bus = new Phaser.Events.EventEmitter();

// Состояние текущей сессии (не сохраняется).
export const run = {
  orders: [],
  blogger: 0, // мс двойной оплаты
  inspection: 0, // мс до проверки
  broken: false,
  seq: 1,
  offline: null,
};

export function save() {
  S.lastSeen = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* нет места */ }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}

// Оффлайн-прогресс: пассивный доход за время отсутствия, максимум 2 часа.
export function offlineRate() {
  return 0.25 * S.tables + 0.15 * S.stars; // монет в минуту
}
(function applyOffline() {
  if (S.lastSeen > 0) {
    const elapsed = Math.min(Date.now() - S.lastSeen, OFFLINE_CAP_MS);
    if (elapsed > 60 * 1000) {
      const coins = Math.floor((elapsed / 60000) * offlineRate());
      if (coins > 0) {
        S.coins += coins;
        run.offline = { mins: Math.round(elapsed / 60000), coins };
      }
    }
  }
  save();
})();

// Сохранение при выходе / сворачивании.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('pagehide', save);
  window.addEventListener('beforeunload', save);
}
try {
  App.addListener('pause', save).catch(() => {});
} catch (e) { /* не нативная платформа */ }

export function addCoins(n) {
  S.coins = Math.max(0, S.coins + n);
  if (n > 0) S.stats.earned += n;
  if (S.coins >= 300) unlock('rich');
  save();
  bus.emit('coins');
}

export function spend(n) {
  if (S.coins < n) return false;
  S.coins -= n;
  save();
  bus.emit('coins');
  return true;
}

export function unlock(id) {
  if (S.achievements[id]) return;
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) return;
  S.achievements[id] = Date.now();
  S.stars += 1;
  save();
  bus.emit('toast', `🏆 ${a.name}  +1 ⭐`);
  bus.emit('coins');
}

export function available(id) {
  const ing = INGREDIENTS[id];
  if (!ing) return false;
  if (ing.season) return ing.season === season();
  return S.menu.includes(id);
}

export function isKnown(r) {
  return r.season ? r.season === season() : S.discovered.includes(r.id);
}

export function knownRecipes() {
  return RECIPES.filter((r) => isKnown(r) && r.steps.every(available));
}

export function tablePrice() { return Math.round(50 * Math.pow(1.6, S.upgrades.tables)); }
export function speedPrice() { return Math.round(30 * Math.pow(1.5, S.upgrades.speed)); }
export function brewTime() { return Math.max(600, 2500 - 350 * S.upgrades.speed); }
export function redoTime() { return Math.max(500, 2000 - 300 * S.upgrades.speed); }
export function patienceMul() { return 1 + 0.08 * S.upgrades.speed; }

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function pickType() {
  const entries = Object.entries(TYPES);
  let r = Math.random() * entries.reduce((s, [, t]) => s + t.weight, 0);
  for (const [id, t] of entries) {
    r -= t.weight;
    if (r <= 0) return id;
  }
  return 'calm';
}

function ingredientsOf(cat) {
  return Object.keys(INGREDIENTS).filter((id) => INGREDIENTS[id].cat === cat && available(id));
}

// Новый заказ: основа → добавка → подача (или известный рецепт) + возможное условие.
export function makeOrder(type) {
  let steps;
  let name;
  let price;
  const known = knownRecipes();
  const seasonal = known.filter((r) => r.season);
  if (seasonal.length && Math.random() < 0.25) {
    const r = pick(seasonal);
    steps = [...r.steps]; name = r.name; price = r.price;
  } else if (known.length && Math.random() < 0.3) {
    const r = pick(known);
    steps = [...r.steps]; name = r.name; price = r.price;
  } else {
    const b = pick(ingredientsOf('base'));
    const a = pick(ingredientsOf('addon'));
    const s = pick(ingredientsOf('serve'));
    steps = [b, a, s];
    const A = INGREDIENTS[a];
    const Sv = INGREDIENTS[s];
    name = `${INGREDIENTS[b].drink} ${A.with}${Sv.with ? ' ' + Sv.with : ''}`;
    price = INGREDIENTS[b].price + A.price + Sv.price + (A.season ? 3 : 0);
  }

  const possible = ['no_sugar', 'cold'];
  if (steps.includes('coffee')) possible.push('double');
  if (!steps.includes('milk') && !steps.includes('cream')) possible.push('no_milk');
  let cond = null;
  if (type === 'picky') cond = pick(['no_sugar', 'no_sugar', ...possible]); // привереда всегда с условием
  else if (Math.random() < 0.35) cond = pick(possible);

  return { steps, name, price, cond };
}

// Запись в блокнот у кассы: чем длиннее очередь, тем выше шанс перепутать.
export function writeNote(order, queueLen) {
  const note = { steps: [...order.steps], cond: order.cond };
  const p = Math.min(0.5, 0.12 * queueLen);
  if (Math.random() < p) {
    if (Math.random() < 0.5) {
      const i = Math.random() < 0.5 ? 0 : 1;
      [note.steps[i], note.steps[i + 1]] = [note.steps[i + 1], note.steps[i]];
    } else {
      const i = Math.floor(Math.random() * 3);
      const cat = INGREDIENTS[note.steps[i]].cat;
      const others = ingredientsOf(cat).filter((id) => id !== note.steps[i]);
      if (others.length) note.steps[i] = pick(others);
      else note.cond = note.cond ? null : 'no_sugar';
    }
  }
  return note;
}
