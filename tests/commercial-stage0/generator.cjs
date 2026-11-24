'use strict';

const { rng, mkPart, mkStock, mkData } = require('./vendor/lib.js');

const VERSION = 'apartment-1';
const DEVELOPMENT_SEEDS = Array.from({ length: 20 }, (_, i) => 230100 + i);
const ACCEPTANCE_SEEDS = Array.from({ length: 40 }, (_, i) => 930100 + i);

// A bill of rectangular panel parts, before edging/hardware machining.
// Dimension templates and frequencies are declared synthetic design assumptions.
function apartment(seed) {
  const random = rng(seed);
  const parts = [];
  const modules = [];
  const scenario = ['ample', 'limited', 'offcuts'][seed % 3];
  const kerf = [3.2, 3.2, 3.2, 3, 4][seed % 5];
  const trim = [10, 10, 10, 5, 0][seed % 5];
  const separateBathroom = seed % 2 === 0;
  const separateHall = seed % 4 === 0;

  function add(room, module, label, l, w, material, thickness, grain = '') {
    const part = mkPart(parts.length, l, w, {
      material, t: thickness, grain, rotate: grain !== 'length'
    });
    part.label = `${room}/${module}/${label}`;
    parts.push(part);
  }

  function cabinet(room, index, width, height, depth, frontMaterial, base = false) {
    const module = `${room}-${index}`;
    const inner = width - 36;
    const body = 'panel|body18';
    const frontGrain = room === 'vestiyer' || seed % 3 !== 0 ? 'length' : 'width';
    modules.push({ id: module, room, width, height, depth, frontMaterial, base });
    for (let i = 0; i < 2; i++) add(room, module, `side-${i}`, height, depth, body, 18);
    add(room, module, 'bottom', inner, depth, body, 18);
    if (base) {
      for (let i = 0; i < 2; i++) add(room, module, `rail-${i}`, inner, 100, body, 18);
    } else {
      add(room, module, 'top', inner, depth, body, 18);
    }
    const shelves = room === 'vestiyer' ? 3 : 1;
    for (let i = 0; i < shelves; i++) add(room, module, `shelf-${i}`, inner, depth - 20, body, 18);
    const doors = width >= 800 ? 2 : 1;
    for (let i = 0; i < doors; i++) {
      add(room, module, `door-${i}`, height - 4, width / doors - 4, frontMaterial, 18, frontGrain);
    }
    add(room, module, 'back', height - 4, width - 4, 'panel|back8', 8);
  }

  const varied = seed % 3 !== 0;
  const kitchenCount = random.int(8, 15);
  for (let i = 0; i < kitchenCount; i++) {
    const base = i < Math.ceil(kitchenCount / 2);
    const width = random.pick(varied ? [500, 600, 700, 800] : [600, 800]);
    const height = varied ? random.pick([720, 760]) : 720;
    const depth = base ? (varied ? random.pick([520, 560]) : 560) : 320;
    cabinet('mutfak', i, width, height, depth, 'panel|front18', base);
  }
  for (let i = 0, n = random.int(1, 2); i < n; i++) {
    cabinet('wc', i, 600, 720, 350, separateBathroom ? 'panel|bath18' : 'panel|front18');
  }
  for (let i = 0, n = random.int(2, 3); i < n; i++) {
    cabinet('banyo', i, random.pick([600, 800]), 720, 480,
      separateBathroom ? 'panel|bath18' : 'panel|front18');
  }
  for (let i = 0, n = random.int(4, 7); i < n; i++) {
    cabinet('vestiyer', i, random.pick([600, 800]), varied ? random.pick([2100, 2200]) : 2100, 580,
      separateHall ? 'panel|hall18' : 'panel|front18');
  }

  const stocks = [];
  const groups = [...new Map(parts.map(p => [p.material, p.t])).entries()];
  for (const [material, thickness] of groups) {
    // Synthetic prices in whole units, deliberately different cost/area ratios.
    const unit = thickness === 8 ? 950 : material === 'panel|body18' ? 1800 : 2300;
    const dimensions = [[2800, 2100], [3660, 1830]];
    if (scenario === 'offcuts') dimensions.push([1400, 900], [1800, 650]);
    dimensions.forEach(([l, w], index) => {
      const price = Math.round(unit * l * w / (2800 * 2100) * random.pick([0.85, 1, 1.15]));
      stocks.push(mkStock(stocks.length, l, w, index < 2 ? 30 : 1, price,
        { material, t: thickness }));
    });
  }
  const data = mkData(parts, stocks, kerf, trim);
  return {
    version: VERSION, seed, scenario, modules, data,
    dimensionsUnit: 'mm', priceUnit: 'synthetic-unit',
    counts: {
      parts: parts.length,
      types: new Set(parts.map(p => [p.l, p.w, p.material, p.t, p.grain, p.rotate].join('|'))).size,
      groups: groups.length,
      rooms: Object.fromEntries(['mutfak', 'wc', 'banyo', 'vestiyer'].map(room =>
        [room, parts.filter(p => p.label.startsWith(room + '/')).length]))
    }
  };
}

module.exports = { VERSION, DEVELOPMENT_SEEDS, ACCEPTANCE_SEEDS, apartment };
