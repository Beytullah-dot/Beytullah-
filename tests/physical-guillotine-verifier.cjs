'use strict';
// Independent physical verifier. No production modules or engine loaders.
const norm = s => String(s ?? '').trim().toLocaleLowerCase('tr-TR');
// part may sit on stock iff same material and (part has no thickness OR stock thickness equal)
function compat(p, s) {
  if (norm(p.material) !== norm(s.material)) return false;
  if (p.t === null || p.t === undefined) return true;
  return s.t !== null && s.t !== undefined && Math.abs(p.t - s.t) < 1e-6;
}
// legal orientations [w along stock length(x), h along stock width(y), rotatedFlag]
function orientations(p) {
  const out = [[p.l, p.w, false]];
  if (p.rotate !== false && (p.l !== p.w || p.grain)) out.push([p.w, p.l, true]);
  return out.filter(([, , r]) => p.grain === 'length' ? !r : p.grain === 'width' ? r : true);
}
function stockPrice(s, m3) {
  if (s.priceUnit === 'm3') return (s.t > 0 && s.price > 0) ? s.l * s.w * s.t / 1e9 * s.price : null;
  return s.price > 0 ? s.price : null;
}

// ---------------------------------------------------------------- independent plan verifier
/* Method A: positions-only guillotine recognition (ignores the engine's cut list).
 * Method B: replay of the engine's own cut list with its own exact arithmetic.
 * Both must pass for a bin to be accepted.  Scaled integers (x1e6); reject unsupported precision and unsafe coordinates.
 */
const S = 1000000;
const I = v => { const scaled=v*S,r=Math.round(scaled); if (!Number.isFinite(v)||!Number.isSafeInteger(r)||Math.abs(r-scaled)>Math.max(1e-4,Math.abs(scaled)*Number.EPSILON*8)) throw new Error('non-grid or unsafe value '+v); return r; };

function recognizeGuillotine(pieces, k) { // pieces: {x,y,w,h} scaled ints; returns true if separable by full-span kerf cuts
  if (pieces.length <= 1) return true;
  for (const axis of ['x', 'y']) {
    const size = axis === 'x' ? 'w' : 'h';
    const sorted = pieces.slice().sort((a, b) => a[axis] - b[axis]);
    // candidate cut: right/bottom edge of the prefix group
    let maxEdge = -Infinity;
    for (let i = 0; i < sorted.length - 1; i++) {
      maxEdge = Math.max(maxEdge, sorted[i][axis] + sorted[i][size]);
      // suffix = all pieces whose start >= maxEdge + k ; prefix = the rest must end <= maxEdge
      const left = [], right = []; let ok = true;
      for (const p of pieces) {
        if (p[axis] + p[size] <= maxEdge) left.push(p);
        else if (p[axis] >= maxEdge + k) right.push(p);
        else { ok = false; break; }
      }
      if (ok && left.length && right.length)
        return recognizeGuillotine(left, k) && recognizeGuillotine(right, k);
    }
  }
  return false;
}

// Overhang is allowed only at a positive scrap narrower than kerf. Its
// footprint outside the source must be outside usable stock or in a kerf
// rectangle removed by an EARLIER cut. Other leaves remain protected.
function intersection(a, b) {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > 0 && h > 0 ? { x, y, w, h } : null;
}
function subtractRectangle(rect, removed) {
  const overlap = intersection(rect, removed);
  if (!overlap) return [rect];
  const pieces = [
    {x: rect.x, y: rect.y, w: overlap.x - rect.x, h: rect.h},
    {x: overlap.x + overlap.w, y: rect.y, w: rect.x + rect.w - overlap.x - overlap.w, h: rect.h},
    {x: overlap.x, y: rect.y, w: overlap.w, h: overlap.y - rect.y},
    {x: overlap.x, y: overlap.y + overlap.h, w: overlap.w, h: rect.y + rect.h - overlap.y - overlap.h}
  ];
  return pieces.filter(piece => piece.w > 0 && piece.h > 0);
}
function replayCuts(bin, trim, k, options = {}) {
  const err = [];
  const T = I(trim), K = I(k);
  const root = { x: T, y: T, w: I(bin.stock.l) - 2 * T, h: I(bin.stock.w) - 2 * T };
  const leaves = [{ ...root }], removed = [];
  const same = (a, b) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
  const scaled = rect => Object.fromEntries(['x', 'y', 'w', 'h'].map(key => [key, I(rect[key])]));
  if (!Array.isArray(bin.cuts)) return ['missing cut list'];
  for (const [number, c] of bin.cuts.entries()) {
    if (!c.source || !['vertical', 'horizontal'].includes(c.axis)) {
      err.push('invalid cut descriptor or sequence'); break;
    }
    const src = scaled(c.source);
    const idx = leaves.findIndex(leaf => same(leaf, src));
    if (idx < 0) { err.push('cut source is not a current leaf'); break; }
    const at = I(c.at), vert = c.axis === 'vertical';
    const first = vert ? at - K / 2 - src.x : at - K / 2 - src.y;
    const total = vert ? src.w : src.h;
    const second = total - first - K;
    const overhang = second < 0;
    if (first < 0 || first >= total || (overhang &&
        (options.allowNarrowScrapCuts !== true || K <= 0 || total - first <= 0 || total - first >= K))) {
      err.push('blade leaves the leaf without a positive narrow scrap'); break;
    }
    if (overhang !== (c.overhang === true)) { err.push('overhang marker does not match cut geometry'); break; }
    if (vert ? !(I(c.x1) === at && I(c.x2) === at && I(c.y1) === src.y && I(c.y2) === src.y + src.h)
      : !(I(c.y1) === at && I(c.y2) === at && I(c.x1) === src.x && I(c.x2) === src.x + src.w)) {
      err.push('cut does not span leaf'); break;
    }
    const blade = vert ? {x: at - K / 2, y: src.y, w: K, h: src.h}
      : {x: src.x, y: at - K / 2, w: src.w, h: K};
    if (overhang) {
      const spill = vert ? {x: src.x + src.w, y: src.y, w: -second, h: src.h}
        : {x: src.x, y: src.y + src.h, w: src.w, h: -second};
      const inside = intersection(spill, root);
      let uncovered = inside ? [inside] : [];
      for (const oldKerf of removed) uncovered = uncovered.flatMap(rect => subtractRectangle(rect, oldKerf));
      if (uncovered.length || leaves.some((leaf, i) => i !== idx && intersection(spill, leaf)) ||
          (bin.placed || []).some(piece => intersection(blade, scaled(piece)))) {
        err.push('overhang reaches a neighboring piece or uncut free material'); break;
      }
    }
    leaves.splice(idx, 1);
    const consumed = intersection(blade, src);
    if (consumed) removed.push(consumed);
    if (vert) {
      if (first > 0) leaves.push({ x: src.x, y: src.y, w: first, h: src.h });
      if (second > 0) leaves.push({ x: at + K / 2, y: src.y, w: second, h: src.h });
    } else {
      if (first > 0) leaves.push({ x: src.x, y: src.y, w: src.w, h: first });
      if (second > 0) leaves.push({ x: src.x, y: at + K / 2, w: src.w, h: second });
    }
  }
  if (err.length) return err;
  for (const piece of bin.placed || []) {
    const index = leaves.findIndex(leaf => same(leaf, scaled(piece)));
    if (index < 0) return ['placed piece ' + piece.id + ' is not a leaf of the cut tree'];
    leaves.splice(index, 1);
  }
  for (const free of bin.free || []) {
    const index = leaves.findIndex(leaf => same(leaf, scaled(free)));
    if (index < 0) return ['free rectangle is not a remaining leaf'];
    leaves.splice(index, 1);
  }
  if (leaves.length) err.push('unclassified remaining leaf');
  return err;
}

function verifyPlan(data, plan, opts = {}) {
  const errors = [], push = m => { if (errors.length < 30) errors.push(m); };
  const k = data.kerf, trim = data.trim;
  const parts = new Map(data.parts.map(p => [p.id, p]));
  const stocks = new Map(data.stocks.map(s => [s.id, s]));
  const seen = new Set(), usage = new Map();
  let count = 0, area = 0, cost = 0, unknownCost = 0;
  const useCuts = opts.checkCuts !== false;
  for (const bin of plan.bins) {
    const st = stocks.get(bin.stock.id);
    if (!st) { push('unknown stock ' + bin.stock.id); continue; }
    usage.set(st.id, (usage.get(st.id) || 0) + 1);
    if (bin.stock.l !== st.l || bin.stock.w !== st.w || norm(bin.stock.material) !== norm(st.material) || (bin.stock.t ?? null) !== (st.t ?? null))
      push('bin stock descriptor altered');
    if (!bin.placed.length) push('empty bin used');
    area += st.l * st.w;
    const pr = stockPrice(st, data.m3); if (pr === null) unknownCost++; else cost += pr;
    const sc = [];
    for (const pc of bin.placed) {
      count++;
      const orig = parts.get(pc.id);
      if (!orig) { push('unknown part ' + pc.id); continue; }
      if (seen.has(pc.id)) push('duplicate part ' + pc.id);
      seen.add(pc.id);
      if (!compat(orig, st)) push('material/thickness mismatch ' + pc.id);
      const unrot = pc.w === orig.l && pc.h === orig.w, rot = pc.w === orig.w && pc.h === orig.l;
      if (!(unrot || rot)) push('dimension changed ' + pc.id);
      const flag = !!pc.rotated;
      // physical orientation: derive from geometry, then also require flag consistency
      const geomRot = unrot ? false : true; // if both (square) trust flag
      const effectiveRot = (unrot && rot) ? flag : geomRot;
      if (effectiveRot && orig.rotate === false) push('rotation forbidden ' + pc.id);
      if (orig.grain === 'length' && effectiveRot) push('grain length violated ' + pc.id);
      if (orig.grain === 'width' && !effectiveRot) push('grain width violated ' + pc.id);
      if (flag !== effectiveRot && !(unrot && rot)) push('rotated flag inconsistent ' + pc.id);
      if (pc.x < trim || pc.y < trim || pc.x + pc.w > st.l - trim || pc.y + pc.h > st.w - trim) push('outside trimmed stock ' + pc.id);
      sc.push({ x: I(pc.x), y: I(pc.y), w: I(pc.w), h: I(pc.h) });
    }
    const K = I(k);
    for (let i = 0; i < sc.length; i++) for (let j = i + 1; j < sc.length; j++) {
      const a = sc[i], b = sc[j];
      if (!(a.x + a.w + K <= b.x || b.x + b.w + K <= a.x || a.y + a.h + K <= b.y || b.y + b.h + K <= a.y)) push('kerf/overlap violation');
    }
    if (!recognizeGuillotine(sc, K)) push('positions are not recognizable as a full-edge guillotine pattern');
    if (useCuts) for (const e of replayCuts(bin, trim, k, {allowNarrowScrapCuts: data.allowNarrowScrapCuts === true})) push('cut replay: ' + e);
  }
  for (const [id, n] of usage) if (n > stocks.get(id).qty) push('stock quantity exceeded ' + id);
  for (const u of plan.unplaced) { if (seen.has(u.id)) push('part both placed and unplaced'); seen.add(u.id); if (!parts.has(u.id)) push('unknown unplaced'); }
  if (seen.size !== parts.size) push('parts lost');
  return { ok: errors.length === 0, errors, count: plan.bins.length, area, cost: unknownCost ? null : cost, placed: count, complete: plan.unplaced.length === 0 && count === parts.size };
}


module.exports = {norm,compat,orientations,stockPrice,recognizeGuillotine,replayCuts,verifyPlan};
