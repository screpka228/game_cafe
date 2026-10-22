import Phaser from 'phaser';
import { W, H } from './ui.js';
import { S, run } from './state.js';
import MainScene from './scenes/MainScene.js';
import KitchenScene from './scenes/KitchenScene.js';
import NotepadScene from './scenes/NotepadScene.js';
import ShopScene from './scenes/ShopScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import WhipScene from './scenes/WhipScene.js';
import RepairScene from './scenes/RepairScene.js';
import ToastScene from './scenes/ToastScene.js';

// Порядок сцен = порядок отрисовки: оверлеи рисуются поверх главного экрана.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#2b1d14',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: W,
    height: H,
  },
  input: { activePointers: 2 },
  render: { roundPixels: true },
  scene: [MainScene, KitchenScene, NotepadScene, ShopScene, SettingsScene, WhipScene, RepairScene, ToastScene],
});

// Доступ из консоли для отладки.
window.cafe = { game, S, run };
