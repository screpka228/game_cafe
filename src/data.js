// Статические игровые данные: ингредиенты, рецепты, клиенты, ачивки, декор, сезоны.

export const SEASONS = {
  spring: { name: 'Весна', icon: '🌸' },
  summer: { name: 'Лето', icon: '☀️' },
  autumn: { name: 'Осень', icon: '🍂' },
  winter: { name: 'Зима', icon: '❄️' },
};

export function season() {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

// cat: base — основа, addon — добавка, serve — подача.
// cost — цена покупки в магазине (если нет — доступно с начала), stars — сколько звёзд нужно.
// season — сезонный ингредиент, доступен только в свой сезон.
export const INGREDIENTS = {
  coffee: { name: 'Эспрессо', icon: '☕', cat: 'base', price: 5, drink: 'Кофе' },
  tea: { name: 'Чай', icon: '🍵', cat: 'base', price: 4, drink: 'Чай' },
  cocoa: { name: 'Какао', icon: '🍫', cat: 'base', price: 6, drink: 'Какао', cost: 40 },
  matcha: { name: 'Матча', icon: '🍃', cat: 'base', price: 8, drink: 'Матча', cost: 70, stars: 1 },

  milk: { name: 'Молоко', icon: '🥛', cat: 'addon', price: 2, with: 'с молоком' },
  cream: { name: 'Сливки', icon: '☁️', cat: 'addon', price: 4, with: 'со сливками', whip: true },
  caramel: { name: 'Карамель', icon: '🍮', cat: 'addon', price: 3, with: 'с карамелью', syrup: true },
  vanilla: { name: 'Ваниль', icon: '🌼', cat: 'addon', price: 3, with: 'с ванилью', syrup: true, cost: 30 },
  honey: { name: 'Мёд', icon: '🍯', cat: 'addon', price: 3, with: 'с мёдом', cost: 35 },
  pumpkin: { name: 'Тыква', icon: '🎃', cat: 'addon', price: 4, with: 'с тыквой', syrup: true, season: 'autumn' },
  candy: { name: 'Мятная карамель', icon: '🍬', cat: 'addon', price: 4, with: 'с мятной карамелью', syrup: true, season: 'winter' },
  sakura: { name: 'Сакура', icon: '🌸', cat: 'addon', price: 4, with: 'с сакурой', syrup: true, season: 'spring' },
  strawberry: { name: 'Клубника', icon: '🍓', cat: 'addon', price: 4, with: 'с клубникой', syrup: true, season: 'summer' },

  togo: { name: 'С собой', icon: '🥤', cat: 'serve', price: 1, with: 'с собой' },
  plate: { name: 'В зале', icon: '🍽️', cat: 'serve', price: 1, with: '' },
  cake: { name: 'Торт', icon: '🍰', cat: 'serve', price: 6, with: 'и торт' },
  cookie: { name: 'Печенье', icon: '🍪', cat: 'serve', price: 3, with: 'и печенье', cost: 25 },
  icecream: { name: 'Мороженое', icon: '🍦', cat: 'serve', price: 5, with: 'и мороженое', cost: 45 },
};

export const CATEGORIES = [
  { id: 'base', name: 'Основа' },
  { id: 'addon', name: 'Добавка' },
  { id: 'serve', name: 'Подача' },
];

export const START_MENU = ['coffee', 'tea', 'milk', 'cream', 'caramel', 'togo', 'plate', 'cake'];
export const SHOP_MENU = ['cookie', 'vanilla', 'honey', 'cocoa', 'icecream', 'matcha'];

// Рецепты-открытия: ингредиенты в строгом порядке. Сезонные доступны сразу в свой сезон.
export const RECIPES = [
  { id: 'macchiato', name: 'Карамель-макиато', steps: ['milk', 'coffee', 'caramel'], price: 16, hint: 'Сначала молоко, потом кофе…' },
  { id: 'raf', name: 'Раф', steps: ['coffee', 'cream', 'vanilla'], price: 18, hint: 'Кофе, сливки и что-то цветочное' },
  { id: 'mocha', name: 'Мокко', steps: ['coffee', 'cocoa', 'milk'], price: 17, hint: 'Кофе встречает шоколад' },
  { id: 'honeytea', name: 'Медовый чай-латте', steps: ['tea', 'milk', 'honey'], price: 15, hint: 'Чай, молоко и сладость пчёл' },
  { id: 'affogato', name: 'Аффогато', steps: ['icecream', 'coffee', 'caramel'], price: 19, hint: 'Начните с холодного десерта' },
  { id: 'glace', name: 'Гляссе', steps: ['coffee', 'icecream', 'cream'], price: 19, hint: 'Кофе, мороженое, облако сверху' },
  { id: 'matchalatte', name: 'Матча-латте', steps: ['matcha', 'milk', 'honey'], price: 20, hint: 'Зелёный порошок и молоко' },
  { id: 'cocoacloud', name: 'Какао-облако', steps: ['cream', 'cocoa', 'cookie'], price: 18, hint: 'Сливки вперёд шоколада' },
  { id: 'pumpkinlatte', name: 'Тыквенный латте', steps: ['coffee', 'pumpkin', 'milk'], price: 21, season: 'autumn' },
  { id: 'newyear', name: 'Новогодний какао', steps: ['cocoa', 'candy', 'cream'], price: 21, season: 'winter' },
  { id: 'newyeartea', name: 'Зимний чай', steps: ['tea', 'candy', 'cookie'], price: 18, season: 'winter' },
  { id: 'sakuralatte', name: 'Сакура-латте', steps: ['tea', 'sakura', 'milk'], price: 20, season: 'spring' },
  { id: 'berrytea', name: 'Клубничный айс-ти', steps: ['tea', 'strawberry', 'icecream'], price: 20, season: 'summer' },
];

// Условия заказа. Проверяются при выдаче по переключателям на кухне.
export const CONDITIONS = {
  no_sugar: { text: 'без сахара', check: (e) => !e.sugar },
  no_milk: { text: 'без молока', check: (e) => !e.foam },
  double: { text: 'двойной шот', check: (e) => e.double },
  cold: { text: 'холодное', check: (e) => e.ice },
};

export function condText(order) {
  if (!order.cond) return '';
  if (order.cond === 'cold' && order.steps.includes('icecream')) return 'холодное мороженое';
  return CONDITIONS[order.cond].text;
}

export const TYPES = {
  hurry: { name: 'Торопыга', icon: '⚡', patience: 45, pay: 1.0, tip: 0.6, weight: 3 },
  calm: { name: 'Спокойный', icon: '😌', patience: 100, pay: 0.7, tip: 0.1, weight: 4 },
  picky: { name: 'Привереда', icon: '🧐', patience: 70, pay: 1.1, tip: 0.35, weight: 2 },
};

export const NAMES = ['Аня', 'Борис', 'Вика', 'Гоша', 'Даша', 'Егор', 'Женя', 'Зоя', 'Илья', 'Катя',
  'Лёва', 'Маша', 'Никита', 'Оля', 'Паша', 'Рита', 'Саша', 'Тима', 'Уля', 'Фёдор'];
export const FACES = ['👩', '👨', '👵', '👴', '👧', '👦', '🧑', '👱', '👲', '👸'];
export const SHIRTS = [0xe57373, 0x64b5f6, 0x81c784, 0xffb74d, 0xba68c8, 0x4db6ac, 0xf06292, 0x90a4ae];

export const ACHIEVEMENTS = [
  { id: 'first', name: 'Первый гость', desc: 'Обслужите первого клиента' },
  { id: 'served25', name: 'Своя публика', desc: 'Обслужите 25 клиентов' },
  { id: 'served100', name: 'Легенда района', desc: 'Обслужите 100 клиентов' },
  { id: 'perfect10', name: 'Без ошибок', desc: 'Выполните 10 заказов без ошибок' },
  { id: 'rich', name: 'Копилка', desc: 'Накопите 300 монет' },
  { id: 'recipe1', name: 'Алхимик', desc: 'Откройте новый рецепт' },
  { id: 'recipe5', name: 'Шеф-бариста', desc: 'Откройте 5 рецептов' },
  { id: 'regular', name: 'Как обычно!', desc: 'Угадайте заказ постоянного гостя' },
  { id: 'repair', name: 'Мастер на все руки', desc: 'Почините кофемашину' },
  { id: 'inspection', name: 'Чистота — залог успеха', desc: 'Пройдите проверку санэпидемстанции' },
  { id: 'shake', name: 'Шейкер', desc: 'Взбейте сливки тряской телефона' },
  { id: 'blogger', name: 'Звезда соцсетей', desc: 'Обслужите гостя при блогере' },
  { id: 'tables4', name: 'Полный зал', desc: 'Купите все 4 столика' },
];

// Звёзды, необходимые для покупки столика с этим номером (индекс = текущее кол-во столиков).
export const TABLE_STARS = [0, 0, 1, 3];
export const MAX_TABLES = 4;
export const MAX_SPEED = 5;

export const DECOR = {
  wall: [
    { id: 'cream', name: 'Кремовые стены', color: 0xf3e2c3, stars: 0, cost: 0 },
    { id: 'mint', name: 'Мятные стены', color: 0xcfe9d6, stars: 1, cost: 30 },
    { id: 'pink', name: 'Розовые стены', color: 0xf5d3de, stars: 2, cost: 45 },
    { id: 'night', name: 'Ночной лофт', color: 0x5b4a5e, stars: 4, cost: 80 },
  ],
  table: [
    { id: 'wood', name: 'Деревянные столы', color: 0xa0673a, stars: 0, cost: 0 },
    { id: 'white', name: 'Белые столы', color: 0xf4f4f4, stars: 1, cost: 40 },
    { id: 'marble', name: 'Мраморные столы', color: 0x9fb3c8, stars: 3, cost: 70 },
  ],
  deco: [
    { id: 'none', name: 'Без украшений', icon: '', stars: 0, cost: 0 },
    { id: 'flowers', name: 'Цветы', icon: '🌻', stars: 1, cost: 25 },
    { id: 'art', name: 'Картины', icon: '🖼️', stars: 2, cost: 50 },
    { id: 'lights', name: 'Гирлянды', icon: '🎄', stars: 5, cost: 90 },
  ],
};
export const DECOR_SECTIONS = [
  { id: 'wall', name: 'Цвет стен' },
  { id: 'table', name: 'Мебель' },
  { id: 'deco', name: 'Украшения' },
];
