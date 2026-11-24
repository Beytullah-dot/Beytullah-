'use strict';

// Independent constructive benchmark. No production packing or proof imports.
const { rng, compat, orientations, verifyPlan } = require('./vendor/lib.js');
const scale = value => Math.round(value * 1000);
const rectangle = r => Object.fromEntries(Object.entries(r).map(([key, value]) => [key, value / 1000]));

function split(bin, source, axis, firstSize, kerf) {
  const vertical = axis === 'vertical';
  const size = vertical ? 'w' : 'h';
  const coord = vertical ? 'x' : 'y';
  if (source[size] === firstSize) return source;
  const remainder = source[size] - firstSize - kerf;
  if (remainder < 0) throw new Error('Reference requires a full kerf inside the leaf');
  const at = source[coord] + firstSize + kerf / 2;
  bin.cuts.push({
    axis, source: rectangle(source), at: at / 1000,
    x1: (vertical ? at : source.x) / 1000,
    y1: (vertical ? source.y : at) / 1000,
    x2: (vertical ? at : source.x + source.w) / 1000,
    y2: (vertical ? source.y + source.h : at) / 1000
  });
  if (remainder > 0) bin.leaves.push({ ...source, [coord]: source[coord] + firstSize + kerf, [size]: remainder });
  return { ...source, [size]: firstSize };
}

function construct(data, seed, objective = 'count', variant = 0) {
  const random = rng(seed);
  const kerf = scale(data.kerf);
  const trim = scale(data.trim);
  const bins = [];
  const unplaced = [];
  const usage = new Map();
  const ordered = data.parts.map(part => {
    let weight = part.l * part.w;
    if (variant % 4 === 1) weight = Math.max(part.l, part.w);
    if (variant % 4 === 2) weight = Math.min(part.l, part.w);
    if (variant >= 4) weight *= 0.65 + random() * 0.7;
    return { part, weight };
  }).sort((a, b) => b.weight - a.weight);

  function fit(bin, part) {
    if (!compat(part, bin.stock)) return null;
    let best = null;
    bin.leaves.forEach((leaf, index) => {
      for (const [width, height, rotated] of orientations(part)) {
        const w = scale(width), h = scale(height);
        const dx = leaf.w - w, dy = leaf.h - h;
        if (dx < 0 || dy < 0 || (dx > 0 && dx < kerf) || (dy > 0 && dy < kerf)) continue;
        const score = variant % 2 ? leaf.w * leaf.h - w * h : Math.min(dx, dy) * 1e9 + Math.max(dx, dy);
        if (!best || score < best.score) best = { index, w, h, rotated, score };
      }
    });
    return best;
  }

  for (const { part } of ordered) {
    let selection = null;
    for (const bin of bins) {
      const candidate = fit(bin, part);
      if (candidate && (!selection || candidate.score < selection.fit.score)) selection = { bin, fit: candidate };
    }
    if (!selection) {
      let bestRank = Infinity;
      for (const stock of data.stocks) {
        if ((usage.get(stock.id) || 0) >= stock.qty) continue;
        const bin = { stock, placed: [], cuts: [], leaves: [{ x: trim, y: trim, w: scale(stock.l) - 2 * trim, h: scale(stock.w) - 2 * trim }] };
        const candidate = fit(bin, part);
        if (!candidate) continue;
        const area = (stock.l - 2 * data.trim) * (stock.w - 2 * data.trim);
        let rank = objective === 'count' ? -area : stock.price / area;
        if (variant >= 4) rank *= 0.8 + random() * 0.4;
        if (rank < bestRank) { bestRank = rank; selection = { bin, fit: candidate, fresh: true }; }
      }
    }
    if (!selection) { unplaced.push(part); continue; }
    const { bin, fit: position } = selection;
    if (selection.fresh) { bins.push(bin); usage.set(bin.stock.id, (usage.get(bin.stock.id) || 0) + 1); }
    let leaf = bin.leaves.splice(position.index, 1)[0];
    if (variant % 2 === 0) {
      leaf = split(bin, leaf, 'vertical', position.w, kerf);
      leaf = split(bin, leaf, 'horizontal', position.h, kerf);
    } else {
      leaf = split(bin, leaf, 'horizontal', position.h, kerf);
      leaf = split(bin, leaf, 'vertical', position.w, kerf);
    }
    bin.placed.push({ ...part, ...rectangle(leaf), rotated: position.rotated });
  }
  return { bins: bins.map(({ leaves, ...bin }) => ({ ...bin, free: leaves.map(rectangle) })), unplaced };
}

// Reconstruct leftovers from cuts, rather than trusting a candidate's free list.
// Only call after the independent cut replay succeeds.
function largestOffcut(plan, trim, kerf) {
  let largest = 0;
  for (const bin of plan.bins) {
    let leaves = [{ x: scale(trim), y: scale(trim), w: scale(bin.stock.l - 2 * trim), h: scale(bin.stock.w - 2 * trim) }];
    const same = (a, b) => ['x', 'y', 'w', 'h'].every(key => a[key] === b[key]);
    for (const cut of bin.cuts) {
      const source = Object.fromEntries(Object.entries(cut.source).map(([key, value]) => [key, scale(value)]));
      const index = leaves.findIndex(leaf => same(leaf, source));
      if (index < 0) throw new Error('Invalid cut source in offcut measurement');
      leaves.splice(index, 1);
      const coord = cut.axis === 'vertical' ? 'x' : 'y';
      const size = cut.axis === 'vertical' ? 'w' : 'h';
      const edge = scale(cut.at) - scale(kerf) / 2;
      const first = edge - source[coord];
      const second = source[coord] + source[size] - edge - scale(kerf);
      if (first > 0) leaves.push({ ...source, [size]: first });
      if (second > 0) leaves.push({ ...source, [coord]: edge + scale(kerf), [size]: second });
    }
    for (const part of bin.placed) {
      const occupied = Object.fromEntries(['x', 'y', 'w', 'h'].map(key => [key, scale(part[key])]));
      const index = leaves.findIndex(leaf => same(leaf, occupied));
      if (index < 0) throw new Error('Missing occupied leaf');
      leaves.splice(index, 1);
    }
    for (const leaf of leaves) {
      const area = leaf.w * leaf.h / 1e6;
      if (Math.min(leaf.w, leaf.h) >= 50000 && area >= 10000) largest = Math.max(largest, area);
    }
  }
  return largest;
}

function score(data, plan) {
  const verification = verifyPlan(data, plan);
  return { ...verification, largestOffcut: verification.ok && verification.complete ? largestOffcut(plan, data.trim, data.kerf) : null };
}

function better(candidate, incumbent, objective) {
  if (!candidate?.ok || !candidate.complete || candidate[objective] === null) return false;
  if (!incumbent) return true;
  return candidate[objective] < incumbent[objective] ||
    (candidate[objective] === incumbent[objective] && candidate.largestOffcut > incumbent.largestOffcut);
}

function addWitness(instance) {
  // The witness determines finite availability, never the requested part shapes.
  const witness = construct(instance.data, instance.seed, 'count', 0);
  const result = score(instance.data, witness);
  if (!result.ok || !result.complete) throw new Error(`No independent witness for seed ${instance.seed}`);
  const used = new Map();
  for (const bin of witness.bins) used.set(bin.stock.id, (used.get(bin.stock.id) || 0) + 1);
  if (instance.scenario !== 'ample') {
    for (const stock of instance.data.stocks) {
      stock.qty = (used.get(stock.id) || 0) + (instance.scenario === 'limited' ? 1 : stock.l >= 2800 ? 2 : 1);
    }
  }
  instance.witness = witness;
  instance.witnessScore = score(instance.data, witness);
  return instance;
}

// Exhaustive integer stock-area covering relaxation, independently implemented.
// Every physical plan covers total part area with trimmed stock area. Ignoring
// kerf, orientation and shape only enlarges the feasible set, including B1 cuts.
function lowerBounds(data) {
  const groups = new Map();
  for (const part of data.parts) {
    const key = [part.material, part.t].join('|');
    if (!groups.has(key)) groups.set(key, { part, area: 0 });
    groups.get(key).area += scale(part.l) * scale(part.w);
  }
  const details = [];
  for (const { part, area } of groups.values()) {
    const stocks = data.stocks.filter(stock => compat(part, stock) && stock.qty > 0);
    let count = Infinity, costCents = Infinity;
    const allPriced = stocks.every(stock => Number.isFinite(stock.price) && stock.price > 0);
    function visit(index, covered, used, spent) {
      if (covered >= area) { count = Math.min(count, used); costCents = Math.min(costCents, spent); return; }
      if (index === stocks.length) return;
      const stock = stocks[index];
      const capacity = scale(stock.l - 2 * data.trim) * scale(stock.w - 2 * data.trim);
      if (capacity <= 0) { visit(index + 1, covered, used, spent); return; }
      const limit = Math.min(stock.qty, Math.ceil((area - covered) / capacity));
      for (let n = 0; n <= limit; n++) {
        visit(index + 1, covered + n * capacity, used + n, spent + n * (allPriced ? Math.round(stock.price * 100) : 0));
      }
    }
    visit(0, 0, 0, 0);
    details.push({ material: part.material, thickness: part.t, count, cost: allPriced ? costCents / 100 : null });
  }
  return {
    method: 'independent-integer-stock-area-cover',
    count: details.reduce((sum, group) => sum + group.count, 0),
    cost: details.some(group => group.cost === null) ? null : details.reduce((sum, group) => sum + group.cost, 0),
    details
  };
}

module.exports = { construct, largestOffcut, score, better, addWitness, lowerBounds };
