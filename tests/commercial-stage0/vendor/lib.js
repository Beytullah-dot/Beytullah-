'use strict';
/* Independent verification library for the Beythaus Cut audit.
 * NOTHING here imports production algorithms except loadEngine(), which only
 * loads the shipped modules so they can be *tested*. The verifier and the oracle
 * are written from scratch from the physical definition of a guillotine plan.
 */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

const SRC = process.env.BEY_SRC ||
  path.resolve(__dirname, '../../..', 'docs');

// ---------------------------------------------------------------- engine loader
function loadEngine(stateOverride) {
  const window = {};
  const state = Object.assign({ mode: 'guillotine', priceMode: 'panel', offcutMinEdgeMm: 50, offcutMinAreaCm2: 100 }, stateOverride || {});
  for (const f of ['engine/material-policy.js', 'engine/optimality-certificate.js', 'engine/fullspan-strip-exact.js',
    'engine/production-audit.js', 'engine/mixed-strip-patterns.js', 'engine/guillotine-block-repair.js',
    'engine/cutting-engine.js'])
    vm.runInNewContext(fs.readFileSync(path.join(SRC, f), 'utf8'), { window, console }, { filename: f });
  // same mkey as docs/index.html
  const mkey = m => String(m).trim().toLocaleLowerCase('tr-TR');
  const engine = window.BeythausCutEngine.createEngine({ getState: () => state, val: Number, mkey, fmt: (v, n = 0) => Number(v).toFixed(n) });
  return { window, engine, state };
}

// Loads a Worker file in a vm sandbox that mimics importScripts (used for the exact workers).
function loadWorker(file) {
  // self === global object, exactly like a real DedicatedWorkerGlobalScope
  const g = { console, result: null, messages: [] };
  g.postMessage = m => { g.messages.push(m); g.result = m; };
  g.self = g; g.window = g;
  vm.createContext(g);
  g.importScripts = (...names) => { for (const n of names) vm.runInContext(fs.readFileSync(path.join(SRC, n.replace(/^\.\//, '')), 'utf8'), g, { filename: n }); };
  vm.runInContext(fs.readFileSync(path.join(SRC, file), 'utf8'), g, { filename: file });
  return g;
}

// ---------------------------------------------------------------- RNG
function rng(seed) { // mulberry32
  let a = seed >>> 0;
  const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.pick = a => a[Math.floor(r() * a.length)];
  return r;
}

// ---------------------------------------------------------------- shared physical rules (re-derived from AGENTS.md / HANDOFF B2)
const {norm,compat,orientations,stockPrice,recognizeGuillotine,replayCuts,verifyPlan} = require('../../physical-guillotine-verifier.cjs');

// ---------------------------------------------------------------- exact brute-force oracle (small integer instances)
/* sliver: 'relaxed' -> a single piece may sit in any leaf that contains it (offcut narrower than the blade is simply cut away)
 *         'strict'  -> the auditor's semantics: leftover next to a closed leaf must be 0 or >= kerf. */
function oracle(data, { sliver = 'relaxed', wantLayout = false } = {}) {
  const k = data.kerf, trim = data.trim, n = data.parts.length;
  if (n > 8) throw new Error('oracle limited to n<=8');
  const types = data.stocks.filter(s => s.qty > 0 && s.l - 2 * trim > 0 && s.w - 2 * trim > 0);
  const opts = data.parts.map(p => types.map(t => compat(p, t) ? orientations(p) : []));
  const full = (1 << n) - 1;
  const areaOf = new Array(1 << n).fill(0);
  for (let m = 1; m <= full; m++) { const low = m & -m, i = 31 - Math.clz32(low); areaOf[m] = areaOf[m ^ low] + data.parts[i].l * data.parts[i].w; }
  const memo = types.map(t => new Int8Array((((t.l - 2 * trim) + 1) * ((t.w - 2 * trim) + 1)) << n).fill(-1));
  const choice = types.map(() => new Map());
  function F(ti, w, h, mask) {
    if (mask === 0) return true;
    const T = types[ti], Hh = T.w - 2 * trim, Ww = T.l - 2 * trim;
    const key = ((w * (Hh + 1) + h) << n) | mask;
    const c = memo[ti][key]; if (c !== -1) return c === 1;
    let res = false;
    if (areaOf[mask] > w * h) res = false;
    else if ((mask & (mask - 1)) === 0) {
      const i = 31 - Math.clz32(mask);
      for (const [a, b, rot] of opts[i][ti]) {
        if (a > w || b > h) continue;
        if (sliver === 'strict' && !((w === a || w - a >= k) && (h === b || h - b >= k))) continue;
        res = true; if (wantLayout) choice[ti].set(key, { single: true, a, b, rot }); break;
      }
    } else {
      outer:
      for (const vert of [true, false]) {
        const total = vert ? w : h;
        for (let a = 1; a + k + 1 <= total; a++) {
          const bsz = total - a - k;
          for (let m1 = (mask - 1) & mask; m1 > 0; m1 = (m1 - 1) & mask) {
            const m2 = mask ^ m1;
            if (vert ? (areaOf[m1] > a * h || areaOf[m2] > bsz * h) : (areaOf[m1] > a * w || areaOf[m2] > bsz * w)) continue;
            if (vert ? (F(ti, a, h, m1) && F(ti, bsz, h, m2)) : (F(ti, w, a, m1) && F(ti, w, bsz, m2))) {
              res = true; if (wantLayout) choice[ti].set(key, { vert, a, m1 }); break outer;
            }
          }
        }
      }
    }
    memo[ti][key] = res ? 1 : 0; return res;
  }
  const sheet = types.map((t, ti) => { const arr = new Uint8Array(1 << n); for (let m = 1; m <= full; m++) arr[m] = F(ti, t.l - 2 * trim, t.w - 2 * trim, m) ? 1 : 0; return arr; });
  // global assignment: DP over (mask, usage)
  const prices = types.map(t => stockPrice(t, data.m3));
  const objs = { count: () => 1, area: ti => types[ti].l * types[ti].w, cost: ti => prices[ti] };
  const result = { feasible: false };
  for (const [name, f] of Object.entries(objs)) {
    if (name === 'cost' && prices.some((p, ti) => p === null && types[ti].qty > 0)) { result.cost = null; continue; }
    const memoG = new Map();
    const best = (mask, usage) => {
      if (mask === 0) return { v: 0, plan: [] };
      const key = mask + '|' + usage.join(',');
      if (memoG.has(key)) return memoG.get(key);
      const low = mask & -mask; let bestRes = null;
      const rest = mask ^ low;
      for (let sub = rest; ; sub = (sub - 1) & rest) {
        const take = sub | low;
        for (let ti = 0; ti < types.length; ti++) {
          if (usage[ti] >= types[ti].qty || !sheet[ti][take]) continue;
          const u2 = usage.slice(); u2[ti]++;
          const r = best(mask ^ take, u2);
          if (!r) continue;
          const v = r.v + f(ti);
          if (!bestRes || v < bestRes.v - 1e-9) bestRes = { v, plan: [{ ti, mask: take }, ...r.plan] };
        }
        if (sub === 0) break;
      }
      memoG.set(key, bestRes); return bestRes;
    };
    const r = best(full, types.map(() => 0));
    result[name] = r ? r.v : null;
    if (r) { result.feasible = true; if (wantLayout) result['plan_' + name] = r.plan; }
  }
  if (wantLayout) {
    result.types = types;
    result.layoutFor = (ti, mask) => { // reconstruct coordinates + an explicit cut tree for one sheet
      const T = types[ti], out = [], cuts = [], free = [];
      const cut = (axis, src, at, label) => {
        const vert = axis === 'vertical';
        cuts.push({ number: cuts.length + 1, axis, at, source: { ...src }, label,
          x1: vert ? at : src.x, y1: vert ? src.y : at, x2: vert ? at : src.x + src.w, y2: vert ? src.y + src.h : at });
      };
      (function rec(x, y, w, h, m) {
        if (!m) return;
        const key = ((w * (T.w - 2 * trim + 1) + h) << n) | m;
        const ch = choice[ti].get(key);
        const X = trim + x, Y = trim + y;
        if (ch.single) {
          const i = 31 - Math.clz32(m);
          out.push({ id: data.parts[i].id, x: X, y: Y, w: ch.a, h: ch.b, rotated: ch.rot });
          if (w > ch.a) { cut('vertical', { x: X, y: Y, w, h }, X + ch.a + k / 2, 'p'); if (w - ch.a - k > 0) free.push({ x: X + ch.a + k, y: Y, w: w - ch.a - k, h }); }
          if (h > ch.b) { cut('horizontal', { x: X, y: Y, w: ch.a, h }, Y + ch.b + k / 2, 'p'); if (h - ch.b - k > 0) free.push({ x: X, y: Y + ch.b + k, w: ch.a, h: h - ch.b - k }); }
          return;
        }
        const m2 = m ^ ch.m1;
        if (ch.vert) { cut('vertical', { x: X, y: Y, w, h }, X + ch.a + k / 2, 'p'); rec(x, y, ch.a, h, ch.m1); rec(x + ch.a + k, y, w - ch.a - k, h, m2); }
        else { cut('horizontal', { x: X, y: Y, w, h }, Y + ch.a + k / 2, 'p'); rec(x, y, w, ch.a, ch.m1); rec(x, y + ch.a + k, w, h - ch.a - k, m2); }
      })(0, 0, T.l - 2 * trim, T.w - 2 * trim, mask);
      return { placed: out, cuts, free };
    };
  }
  return result;
}

// ---------------------------------------------------------------- generators
function mkData(parts, stocks, kerf, trim) {
  return { parts, stocks, kerf, trim, m3: null };
}
function mkPart(i, l, w, o = {}) {
  return { id: 'p' + i, origin: 'p' + i, label: 'P' + i, l, w, t: o.t ?? null, category: 'panel', grain: o.grain || '', material: o.material || 'panel|mdf', rotate: o.rotate !== false, order: i };
}
function mkStock(i, l, w, qty, price, o = {}) {
  return { id: 's' + i, l, w, t: o.t ?? null, qty, price, category: 'panel', priceUnit: 'panel', grain: '', material: o.material || 'panel|mdf', order: i };
}

module.exports = { loadEngine, loadWorker, rng, verifyPlan, recognizeGuillotine, replayCuts, oracle, compat, orientations, stockPrice, mkData, mkPart, mkStock, norm, SRC };
