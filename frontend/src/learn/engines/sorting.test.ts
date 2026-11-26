import { describe, expect, it } from 'vitest'
import { ALGO_ORDER, doublingFactor, makeInput, measure, runSort, type InputKind } from './sorting'

const KINDS: InputKind[] = ['random', 'sorted', 'reversed', 'nearly']

describe('sorting engines', () => {
  it('every algorithm sorts every kind of input at several sizes', () => {
    for (const algo of ALGO_ORDER)
      for (const kind of KINDS)
        for (const n of [1, 2, 3, 7, 16, 33, 100]) {
          const input = makeInput(kind, n, 3)
          const run = runSort(algo, input)
          expect(run.sorted, `${algo} ${kind} ${n}`).toEqual(input.slice().sort((a, b) => a - b))
        }
  })

  it('handles an empty list and duplicates', () => {
    for (const algo of ALGO_ORDER) {
      expect(runSort(algo, []).sorted).toEqual([])
      expect(runSort(algo, [3, 1, 3, 2, 1, 3]).sorted).toEqual([1, 1, 2, 3, 3, 3])
    }
  })

  it('makeInput is deterministic and always a permutation of 1..n', () => {
    expect(makeInput('random', 20, 5)).toEqual(makeInput('random', 20, 5))
    expect(makeInput('random', 20, 5)).not.toEqual(makeInput('random', 20, 6))
    for (const kind of KINDS) expect(makeInput(kind, 25, 2).slice().sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1))
  })

  it('counts comparisons exactly as the textbook says', () => {
    const n = 16
    const sorted = makeInput('sorted', n)
    const reversed = makeInput('reversed', n)
    const pairs = (n * (n - 1)) / 2
    expect(runSort('insertion', sorted).comparisons).toBe(n - 1)
    expect(runSort('bubble', sorted).comparisons).toBe(n - 1) // early exit
    expect(runSort('selection', sorted).comparisons).toBe(pairs)
    expect(runSort('selection', reversed).comparisons).toBe(pairs)
    expect(runSort('insertion', reversed).comparisons).toBe(pairs)
    expect(runSort('bubble', reversed).comparisons).toBe(pairs)
    expect(runSort('quick', sorted).comparisons).toBe(pairs) // last-element pivot: worst case
    expect(runSort('merge', sorted).comparisons).toBe((n / 2) * Math.log2(n)) // 32
  })

  it('merge sort never exceeds n·log2(n) comparisons', () => {
    for (const n of [8, 31, 64, 200, 1000]) {
      const r = runSort('merge', makeInput('random', n, 9))
      expect(r.comparisons).toBeLessThanOrEqual(Math.ceil(n * Math.log2(n)))
    }
  })

  it('records snapshots whose counters match the final totals and end sorted', () => {
    for (const algo of ALGO_ORDER) {
      const run = runSort(algo, makeInput('random', 12, 4), true)
      const last = run.snapshots[run.snapshots.length - 1]
      expect(last.done).toBe(true)
      expect(last.comparisons).toBe(run.comparisons)
      expect(last.writes).toBe(run.writes)
      expect(last.arr).toEqual(run.sorted)
      // Outside merge sort the array is a permutation at every step (merge overwrites while it merges).
      if (algo !== 'merge') for (const s of run.snapshots) expect(s.arr.slice().sort((x, y) => x - y)).toEqual(run.sorted)
    }
  })

  it('growth: doubling n multiplies comparisons by about 4 for quadratic sorts and about 2 for merge sort', () => {
    expect(doublingFactor(measure('bubble', 'random'))).toBeGreaterThan(3.6)
    expect(doublingFactor(measure('bubble', 'random'))).toBeLessThan(4.4)
    expect(doublingFactor(measure('selection', 'random'))).toBeCloseTo(4, 1)
    expect(doublingFactor(measure('merge', 'random'))).toBeGreaterThan(1.9)
    expect(doublingFactor(measure('merge', 'random'))).toBeLessThan(2.5)
    expect(doublingFactor(measure('quick', 'sorted'))).toBeGreaterThan(3.8) // degenerates on sorted input
    expect(doublingFactor(measure('quick', 'random'))).toBeLessThan(2.6)
  })
})
