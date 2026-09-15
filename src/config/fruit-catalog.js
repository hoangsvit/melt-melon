(function () {
  'use strict';
  const fruitData = [
    ['blueberry', '蓝莓', '#6371ac'], ['grape', '葡萄', '#8760b0'], ['cherry', '樱桃', '#d7475b'],
    ['orange', '橙子', '#f69e38'], ['lemon', '柠檬', '#efce53'], ['apple', '苹果', '#ca5953'],
    ['kiwi', '猕猴桃', '#97ae51'], ['peach', '蜜桃', '#edac99'], ['coconut', '椰子', '#b48b62'],
    ['cantaloupe', '哈密瓜', '#a9ba78'], ['watermelon', '西瓜', '#5d9970'],
  ];
  const fruits = Object.freeze(fruitData.map(([id, name, color]) => Object.freeze({ id, name, color })));
  const ids = Object.freeze(fruits.map(fruit => fruit.id));
  const names = Object.freeze(fruits.map(fruit => fruit.name));
  const fruitColors = fruits.map(fruit => fruit.color);
  const logoLevel = names.length;
  // The atlas has one extra brand cell after the 11 fruit cells. FruitPainter
  // applies the same membrane treatment to icons, so this cell also needs a
  // valid CSS color instead of indexing past the fruit palette.
  const colors = Object.freeze([...fruitColors, '#426b47']);
  window.MelonFruitCatalog = Object.freeze({
    fruits, ids, names, colors,
    finalLevel: names.length - 1,
    logoLevel,
    atlasColumns: 4,
    atlasRows: 3,
  });
})();
