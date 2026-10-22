// Общие UI-хелперы: текст, кнопки, модальные окна, полоски.
import { beep } from './audio.js';

export const W = 720;
export const H = 1280;
export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", sans-serif';

export const C = {
  dark: 0x2b1d14,
  panel: 0xfff4e3,
  card: 0xf6e3c6,
  accent: 0xc8874a,
  green: 0x5aa469,
  red: 0xd9534f,
  blue: 0x4a7fc8,
  gray: 0x9e9e9e,
  gold: 0xe0a82e,
};

export function txt(scene, x, y, s, size = 28, color = '#3b2a1e', o = {}) {
  const style = {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    align: o.align || 'center',
    padding: { top: 6, bottom: 6 },
    fontStyle: o.bold ? 'bold' : 'normal',
  };
  if (o.wrap) style.wordWrap = { width: o.wrap, useAdvancedWrap: true };
  if (o.stroke) { style.stroke = o.stroke; style.strokeThickness = o.strokeThickness || 5; }
  return scene.add.text(x, y, s, style).setOrigin(o.ox ?? 0.5, o.oy ?? 0.5);
}

export function button(scene, x, y, w, h, label, onClick, o = {}) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const t = txt(scene, 0, 0, label, o.size || 28, o.textColor || '#ffffff', { wrap: o.wrap ? w - 12 : 0, bold: o.bold !== false });
  c.add([g, t]);
  if (o.icon) {
    t.setY(h * 0.2);
    c.add(txt(scene, 0, -h * 0.17, o.icon, o.iconSize || 40));
  }
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.btnColor = o.color ?? C.accent;
  c.btnEnabled = true;
  const r = o.r ?? 18;
  const draw = () => {
    g.clear();
    g.fillStyle(0x000000, 0.22);
    g.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, r);
    g.fillStyle(c.btnColor, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    // перекрываем швы триангуляции скруглённого прямоугольника в WebGL
    g.fillRect(-w / 2 + r - 2, -h / 2, w - 2 * r + 4, h);
    g.fillRect(-w / 2, -h / 2 + r - 2, w, h - 2 * r + 4);
    if (c.btnSelected) {
      g.lineStyle(5, 0xffffff, 1);
      g.strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, r);
    }
  };
  draw();
  c.labelText = t;
  c.setBtnColor = (col) => { c.btnColor = col; draw(); return c; };
  c.setBtnSelected = (v) => { c.btnSelected = v; draw(); return c; };
  c.setBtnLabel = (s) => { t.setText(s); return c; };
  c.setBtnEnabled = (v) => { c.btnEnabled = v; c.setAlpha(v ? 1 : 0.45); return c; };
  c.on('pointerdown', () => { if (c.btnEnabled) c.setScale(0.95); });
  c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', () => {
    c.setScale(1);
    if (!c.btnEnabled) { if (o.onDisabled) o.onDisabled(); return; }
    if (!o.silent) beep('click');
    if (onClick) onClick();
  });
  return c;
}

// Затемнение + панель с текстом и кнопками. Возвращает контейнер.
export function modal(scene, message, buttons) {
  const c = scene.add.container(0, 0).setDepth(1000);
  const shade = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setInteractive();
  const panel = scene.add.graphics();
  panel.fillStyle(C.panel, 1);
  panel.fillRoundedRect(50, H / 2 - 260, W - 100, 520, 30);
  panel.lineStyle(6, C.accent, 1);
  panel.strokeRoundedRect(50, H / 2 - 260, W - 100, 520, 30);
  const t = txt(scene, W / 2, H / 2 - 80, message, 30, '#3b2a1e', { wrap: W - 160 });
  c.add([shade, panel, t]);
  const n = buttons.length;
  const bw = (W - 160 - (n - 1) * 20) / n;
  buttons.forEach((b, i) => {
    const btn = button(scene, 80 + bw / 2 + i * (bw + 20), H / 2 + 165, bw, 110, b.label, () => {
      c.destroy();
      if (b.cb) b.cb();
    }, { color: b.color ?? C.accent, size: 28 });
    c.add(btn);
  });
  return c;
}

// Фон экрана-оверлея: блокирует ввод нижних сцен, заголовок и кнопка закрытия.
export function overlayBase(scene, title, onClose) {
  scene.add.rectangle(W / 2, H / 2, W, H, C.panel).setInteractive();
  scene.add.rectangle(W / 2, 55, W, 110, C.dark);
  txt(scene, W / 2, 55, title, 38, '#ffffff', { bold: true });
  return button(scene, W - 60, 55, 84, 76, '✕', onClose, { color: C.red, size: 36 });
}

export function drawBar(g, x, y, w, h, frac, color, bg = 0x000000) {
  frac = Math.max(0, Math.min(1, frac));
  g.fillStyle(bg, 0.35);
  g.fillRoundedRect(x, y, w, h, h / 2);
  if (frac > 0) {
    g.fillStyle(color, 1);
    g.fillRoundedRect(x, y, Math.max(h, w * frac), h, h / 2);
  }
}

export function patienceColor(frac) {
  if (frac > 0.5) return 0x4caf50;
  if (frac > 0.25) return 0xffc107;
  return 0xf44336;
}
