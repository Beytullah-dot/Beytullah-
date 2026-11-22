# Beythaus Cut — Commercial Tight-Stock Proof and Feasibility Stress

Research PR [#57](https://github.com/Beytullah-dot/Beytullah-/pull/57). Verified Linux Node 22 GitHub [Optimizer CI SUCCESS #44973670179](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44973670179) on test SHA \`ca1553ae593a822398cd84832bc0b6e75841edff\`. Same-head Geometry and Uncapped Scale SUCCESS. Master merge/Pages checks are separate.

## Purpose and honest scope

Unlike the prior generous-stock capacity matrix in \`tests/MOTOR-CAPACITY-MATRIX-RESULTS.md\` (105/105 production baseline complete, 60/105 selected-objective certificates), this set deliberately holds inventory to the **exact planted board multiset**, or independently removes enough available board capacity to make even total piece area too large. Synthetic deterministic, **NOT** customer job sample, not a global motor success statistic and not a user input size cap.

- N = 10 / 25 / 50 / 100 / 200 physical parts; 4 classes (tight panel, tight panel/masif + mandatory grain rotation, scarce panel, scarce mixed); 3 independent objectives (count, gross area, recorded acquisition cost) = **60 objective-runs**.
- Kerf = 3 mm, trim = 2 mm, multiple dimensional board motifs and materials. In each **30/60 area-feasible cases**, a preconstructed independent 4-cut full-edge guillotine tree is verified by both shipped production and independent \`optimization-oracle.cjs\` replay. It is a **feasibility witness**, not necessarily the globally optimal objective arrangement.
- In the other **30/60 cases**, total usable stock area is below total required piece area. That proves these *specific* jobs physically impossible, regardless of cut ordering; a heuristic incomplete result alone would NOT prove impossibility.
- All candidate full/partial layouts are separately physically replayed. Only fully placed, two-audit-accepted plans can be production ready or have a global objective-specific certificate. The shipped bounded constructive Worker can return UNKNOWN rather than FALSE infeasibility.

## Verified outcomes (read the denominators)

**Planted 30 known-feasible objective-runs**:
- Main baseline \`optimize(data,false,false,...)\`: **7/30** complete, dual-audited.
- Actual enhanced/UI first pass \`optimize(data,true,false,...)\`: **15/30** complete, dual-audited.
- Bounded constructive Worker: **3/30** complete.
- Enhanced/UI plus constructive Worker (combined, not additive): **15/30** complete.
- Among enhanced/UI completions: **15/15** selected-objective global certificates. There are **15** provably feasible objective-runs that the currently measured production paths could **NOT complete**.
- Independently known planted alternative was strictly better than a complete enhanced plan in **0** of these cases; this is **not** evidence that all accepted plans are high-quality in unseen fixtures. If no complete candidate exists, plan quality is not scoreable.

**Independently area-infeasible 30 objective-runs**: **0/30** erroneously accepted full plans. This is a separate negative test, not part of the successful feasible-plan denominator. Neither a failed heuristic nor resource exhaustion should be mislabeled global infeasibility without mathematical evidence.

### Feasible fixtures by physical quantity

| N | Unenhanced complete | Enhanced/UI complete | Bounded Worker complete | Enhanced/UI global proof |
|---:|---:|---:|---:|---:|
| 10 | 6/6 | 6/6 | 3/6 | 6/6 |
| 25 | 1/6 | 6/6 | 0/6 | 6/6 |
| 50 | 0/6 | 3/6 | 0/6 | 3/6 |
| 100 | 0/6 | 0/6 | 0/6 | 0/6 |
| 200 | 0/6 | 0/6 | 0/6 | 0/6 |

### Families (15 objective-runs per class including impossible cases)

| Family | Unenhanced complete | Enhanced/UI complete | Worker complete | Enhanced/UI global proof |
|---|---:|---:|---:|---:|
| panel-tight | 3/15 | 6/15 | 3/15 | 6/15 |
| mixed-grain-tight | 4/15 | 9/15 | 0/15 | 9/15 |
| panel-scarce | 0/15 | 0/15 | 0/15 | 0/15 |
| mixed-grain-scarce | 0/15 | 0/15 | 0/15 | 0/15 |

## Independent objective oracle and price safety

A separate exact enumerator over 6 registered stock-quantity combinations establishes **different** global optima for the same tiny two-part job:
- min stock **1 sheet**
- min gross stock area **5,808 mm²**
- min recorded cost **80 synthetic currency units**.
The cheapest physical plan uses two smaller sheets while the one-sheet, smallest-gross-area plan costs more. Both cut trees undergo two independent physical audits. The certifier is tested to **reject OPTIMAL on a worse yet valid plan** for each goal and to return \`unknown-price\` when an eligible alternative stock has no recorded price. No cross-objective proof promotion.

## Performance and limits

- Actual enhanced first-pass median **206.7 ms**, p95 **1435.2 ms**, maximum **1570.4 ms** in isolated Linux Node processes.
- Peak process RSS observed **117.4 MiB** (120264 KiB), includes Node runtime, two audits and VM; **not measured on iPhone Safari**. Main-thread UI-block risk remains open.
- Unenhanced baseline p50 60.2 ms / p95 243.4 ms. Enhanced computation is a larger workload and MUST be reported separately.
- The fully known physical witness exists for every 30 feasible objective-run. A failed algorithm is therefore a **missed known-feasible plan**, not an impossible input. Resource policy/heuristic choices, not N alone, govern UNKNOWN.
- Configured limits in this research (fixtures, watchdog, worker/node budget) are test budgets, not permanent user ceilings.

## Technical interpretation and next intervention

**Primary new blocker for motor-development acceptance:** insufficient placement completion on tight, planted four-level cuts, especially N=100/200. Research first on quality/fidelity of guillotine constructive repair and stock-multiset assignment with limited quantities, while retaining two independent physical audits and complete-only publication. Do NOT widen exact search merely to move a single maximum N statistic.

Potential safely bounded direction: use independently validated *alternative full cut plans* from nested/block-repair and compare count/area/cost explicitly before adoption; never import the hidden planted witness into the production algorithm. Add varied random planted cut geometries and board inventory, truly independent small exact-oracle holdouts, and economic regret comparisons where global optimum is independently known. The 15/30 is a specifically hard sample, not measured customer success.

**Motor development 100% acceptance:** NO. **Product v1 estimate**: 70%, +0 percentage points. **Open risks**: 15/30 known-feasible incomplete, long synchronous main-thread work, commercial quality not representative, real iPhone Safari/PDF/UAT unverified, live server physical guard migration not applied, two-user atomic stock and RLS tests. Do not touch live Supabase data/migration.

Machine-readable per-case evidence is \`motor-commercial-stress.json\` on the successful Optimizer Actions artifact; code at \`tests/motor-commercial-tight-stock.cjs\`.
