# Four- and five-threshold Pareto skyline research (21 Nov 2026)

**Research-only PR [#35](https://github.com/Beytullah-dot/Beytullah-/pull/35)** merged as `dd64707462b5e4ea96adc30221defc7a636800c2`. Experimental harness: `tests/motor-fourplus-pareto-experiment.cjs`; GitHub Actions profile `44940951812` **SUCCESS**. No 4+/5-threshold logic is imported by the shipped certificate.

## Necessary resources and exact dominance

A finite integer stock-multiset must provide total usable board area **and** enough kerf-expanded square slots for each selected part-minimum-edge threshold. A state `A` can discard state `B` only if `A.cost<=B.cost` **AND every one** of its area and threshold capacities is at least `B`'s. All comparisons are coordinatewise; a weighted sum of area, capacity, cost would be unsafe and is NOT used. Stored capacities are capped at demands, preserving the dominance relation. Exact full multiset cover is still a *relaxation*, never a physical pattern. Incomplete time/state sweeps return `unknown-limit` and a null lower bound.

The simple research prototype performs pairwise frontier scanning, exposing worst-case quadratic dominance comparisons. It deliberately serves as a correctness/performance reference, **not** a proposed production algorithm.

## Independent full-multiset exact oracle

18 unrelated deterministic small workloads x (four or five thresholds) x (cost, gross area, count) = **108/108** completed and matching; **0 unsafe overbounds; 0 UNKNOWN** in small cases. The independent exhaustive enumerator examined **26,244** bounded integer stock combinations. This validates that small reference class only.

## Legacy 44/305 stress with positive kerf

The old workloads have five distinct piece minimum-edge thresholds. Both have all entered stock types singleton-compatible (44: 8/8, 305: 17/17), so the geometry prefilter removes none.

| Case, target | 4 thresholds | 5 thresholds | Interpretation |
|---|---:|---:|---|
| 44, cost LB | 220 TL | 220 TL | completed but weaker than production expanded-area LB 255 |
| 44, area LB | 71,544 mm² | 71,544 mm² | completed but weaker than production LB 78,399 |
| 305, cost LB | 409 TL | 409 TL | completed but weaker than production expanded-area LB 485 |
| 305, area LB | UNKNOWN | UNKNOWN | four/five-dimensional frontier exceeds proof budgets |

With the largest research budget (2,000 post-pruning states and 900 ms), the old 305-item AREA objective reached **2,001 frontier states** before cutoff for both threshold counts. The raw expanded candidate count was **15,588 / 15,606**, dominance comparisons **72,878,613 / 72,957,648**, and elapsed research solver time **426.49 / 545.31 ms** for four/five thresholds. A smaller 600-state run also returned UNKNOWN after **1,363,424** coordinatewise comparisons. These results demonstrate a state-management bottleneck; they do not imply the true physical optimum was searched or disproved.

The whole Linux research test process eventually reached **102,532 KiB peak RSS** (roughly 100.13 MiB); the recorded peak is cumulative for the process, not per-solver incremental allocation. JavaScript heap at the end was **26,605,280 bytes**. These timings and memory values are specific to the GitHub runner, scripts and budgets. No universal performance guarantee follows.

## Recommendation / further work

**Do not promote the 4+/5-threshold pairwise skyline into production certification.** On these stress sets it provides no tighter finished bound than the shipped three-threshold and expanded-area approaches; the large AREA case repeatedly returns UNKNOWN. Continue independently audited exact pattern-generation research with complete full-edge guillotine trees, controlled state indexing, proof-safe dominance, and objective-specific comparison. A branch-and-price/MILP/CP-SAT implementation must define permitted kerf, trim, stock class, grain/rotation and an independently checked feasible pattern before claiming physical certificates.

Related literature: [two-dimensional guillotine cutting-stock with leftovers, pattern-based diving](https://www.sciencedirect.com/science/article/pii/S2192440621001180); [exact 2D guillotine MILP and symmetry reductions](https://link.springer.com/article/10.1007/s12532-022-00222-4); [enhanced dynamic programming for 2D guillotine cutting](https://www.sciencedirect.com/science/article/pii/S0305054823003544). The published formulations are conceptual starting points, not yet implemented or demonstrated equivalent to Beythaus Cut's exact stock/grain/kerf model.
