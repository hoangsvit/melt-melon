(function () {
  'use strict';
  const names = ['蓝莓', '葡萄', '樱桃', '橙子', '柠檬', '苹果', '猕猴桃', '蜜桃', '椰子', '哈密瓜', '西瓜'];
  const colors = ['#6371ac', '#8760b0', '#d7475b', '#f69e38', '#efce53', '#ca5953', '#97ae51', '#edac99', '#b48b62', '#a9ba78', '#5d9970', '#e87977'];
  window.MelonFruitCatalog = Object.freeze({ names: Object.freeze(names), colors: Object.freeze(colors), finalLevel: names.length - 1, logoLevel: names.length, atlasColumns: 4, atlasRows: 3 });
})();
