'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const V = require('./physical-guillotine-verifier.cjs');

function cut(source, axis, first, kerf, overhang = false) {
  const vertical = axis === 'vertical';
  const at = (vertical ? source.x : source.y) + first + kerf / 2;
  return { source, axis, at, overhang,
    x1: vertical ? at : source.x, y1: vertical ? source.y : at,
    x2: vertical ? at : source.x + source.w,
    y2: vertical ? source.y + source.h : at };
}
function stripes() {
  const stock = { id: 'board', l: 2440, w: 1220, qty: 1, material: 'panel', t: 18, price: 1 };
  const parts = [0, 1, 2].map(i => ({ id: 'p' + i, l: 810, w: 1220, t: 18, material: 'panel', rotate: false }));
  const placed = parts.map((p, i) => ({ ...p, x: i * 814, y: 0, w: 810, h: 1220, rotated: false }));
  const cuts = [
    cut({x: 0, y: 0, w: 2440, h: 1220}, 'vertical', 810, 4),
    cut({x: 814, y: 0, w: 1626, h: 1220}, 'vertical', 810, 4),
    cut({x: 1628, y: 0, w: 812, h: 1220}, 'vertical', 810, 4, true)
  ].map((c, i) => ({ ...c, number: i + 1 }));
  return { data: { parts, stocks: [stock], trim: 0, kerf: 4, allowNarrowScrapCuts: true },
    plan: { bins: [{ stock, placed, cuts, free: [] }], unplaced: [] } };
}
function previousKerf(axis = 'vertical') {
  const vertical = axis === 'vertical';
  const stock = { l: vertical ? 20 : 12, w: vertical ? 12 : 20 };
  const first = { x: 0, y: 0, w: stock.l, h: stock.w };
  const left = { x: 0, y: 0, w: vertical ? 10 : 12, h: vertical ? 12 : 10 };
  const piece = { id: 'kept', x: 0, y: 0, w: vertical ? 9 : 12, h: vertical ? 12 : 9 };
  const right = { x: vertical ? 14 : 0, y: vertical ? 0 : 14, w: vertical ? 6 : 12, h: vertical ? 12 : 6 };
  return { stock, placed: [piece], free: [right], cuts: [cut(first, axis, 10, 4), cut(left, axis, 9, 4, true)] };
}

const sample = stripes();
assert.equal(V.verifyPlan(sample.data, sample.plan).ok, true);
assert.equal(V.verifyPlan({ ...sample.data, allowNarrowScrapCuts: false }, sample.plan).ok, false);
for (const axis of ['vertical', 'horizontal']) {
  assert.deepEqual(V.replayCuts(previousKerf(axis), 0, 4, { allowNarrowScrapCuts: true }), []);
}

// Ten explicitly located protected neighbors hit by the overhanging blade.
// Left source ends at x=10 (or y=10), spill extends to 13. These neighbors
// deliberately occupy the alleged earlier kerf gap and MUST be rejected.
const neighbors = [
  ['vertical', 10, 0, 2, 2], ['vertical', 10, 4, 2, 3],
  ['vertical', 11, 8, 2, 4], ['vertical', 12, 0, 1, 12],
  ['vertical', 10.5, 5, 1, 1],
  ['horizontal', 0, 10, 2, 2], ['horizontal', 4, 10, 3, 2],
  ['horizontal', 8, 11, 4, 2], ['horizontal', 0, 12, 12, 1],
  ['horizontal', 5, 10.5, 1, 1]
];
for (const [axis, x, y, w, h] of neighbors) {
  const bin = previousKerf(axis);
  bin.placed.push({ id: 'neighbor', x, y, w, h });
  assert(V.replayCuts(bin, 0, 4, { allowNarrowScrapCuts: true })
    .some(error => error.includes('neighboring')), JSON.stringify({axis, x, y, w, h}));
}
const forgedFree = previousKerf();
forgedFree.free.push({ x: 10, y: 0, w: 3, h: 12 });
assert(V.replayCuts(forgedFree, 0, 4, { allowNarrowScrapCuts: true }).length > 0);
const noScrap = previousKerf();
noScrap.cuts[1] = cut({x: 0, y: 0, w: 10, h: 12}, 'vertical', 10, 4, true);
assert(V.replayCuts(noScrap, 0, 4, { allowNarrowScrapCuts: true }).length > 0);
const missingMarker = stripes();
delete missingMarker.plan.bins[0].cuts[2].overhang;
assert.equal(V.verifyPlan(missingMarker.data, missingMarker.plan).ok, false);

assert(!/require\s*\(|import\s|loadEngine|docs\//.test(fs.readFileSync(require.resolve('./physical-guillotine-verifier.cjs'), 'utf8')));
console.log('Independent verifier: three strips, previous kerf in both axes, strict mode, 10 protected neighbors, free material, zero scrap and mandatory marker passed.');
module.exports = { stripes, previousKerf, neighbors };
