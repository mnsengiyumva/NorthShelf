import { describe, expect, it } from 'vitest'
import { fractionalGreedy, firstCounterexample, greedy01, greedyCoins, KNAPSACK_PRESETS, optimal01, optimalCoins, optimalCount, orderBy, PRESETS_INTERVALS, randomIntervals, RULE_ORDER, schedule, toIntervals } from './greedy'

describe('coin change', () => {
  it('greedy is optimal for Canadian-style coins', () => {
    const cad = [200, 100, 25, 10, 5]
    for (let a = 5; a <= 1000; a += 5) expect(greedyCoins(cad, a).count).toBe(optimalCoins(cad, a)!.length)
    expect(firstCounterexample(cad)).toBeNull()
  })
  it('greedy fails for {1,3,4} at 6', () => {
    expect(greedyCoins([1, 3, 4], 6).count).toBe(3)
    expect(optimalCoins([1, 3, 4], 6)).toEqual([3, 3])
    expect(firstCounterexample([1, 3, 4])).toBe(6)
  })
  it('finds the counterexample for {1,5,10,12}', () => {
    const a = firstCounterexample([1, 5, 10, 12])!
    expect(greedyCoins([1, 5, 10, 12], a).count).toBeGreaterThan(optimalCoins([1, 5, 10, 12], a)!.length)
  })
  it('counterexample finder agrees with brute force on random coin sets', () => {
    let seed = 7
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
    for (let t = 0; t < 60; t++) {
      const coins = [1, ...Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => 2 + Math.floor(rnd() * 30))]
      const uniq = [...new Set(coins)]
      let brute: number | null = null
      for (let a = 1; a <= 300 && brute === null; a++) if (greedyCoins(uniq, a).count > optimalCoins(uniq, a)!.length) brute = a
      expect(firstCounterexample(uniq) === null).toBe(brute === null)
    }
  })
  it('handles impossible amounts', () => {
    expect(optimalCoins([5, 10], 3)).toBeNull()
    expect(greedyCoins([5, 10], 3).ok).toBe(false)
  })
})

describe('interval scheduling', () => {
  const run = (key: string, rule: Parameters<typeof schedule>[1]) => schedule(toIntervals(PRESETS_INTERVALS[key].items), rule).chosen.length
  it('earliest finish is optimal on every preset', () => {
    for (const k of Object.keys(PRESETS_INTERVALS)) expect(run(k, 'earliestFinish')).toBe(optimalCount(toIntervals(PRESETS_INTERVALS[k].items)))
  })
  it('the other rules fail where the page says they do', () => {
    expect(run('long', 'earliestStart')).toBe(1)
    expect(run('long', 'earliestFinish')).toBe(3)
    expect(run('short', 'shortest')).toBe(1)
    expect(run('short', 'earliestFinish')).toBe(2)
  })
  it('earliest finish matches the DP optimum on 300 random instances; chosen sets never overlap', () => {
    for (let s = 1; s <= 300; s++) {
      const iv = randomIntervals(s, 9)
      for (const rule of RULE_ORDER) {
        const { chosen } = schedule(iv, rule)
        for (const a of chosen) for (const b of chosen) if (a !== b) expect(a.start < b.end && b.start < a.end).toBe(false)
        expect(chosen.length).toBeLessThanOrEqual(optimalCount(iv))
      }
      expect(schedule(iv, 'earliestFinish').chosen.length).toBe(optimalCount(iv))
    }
  })
  it('optimalCount equals a brute force over subsets', () => {
    for (let s = 1; s <= 40; s++) {
      const iv = randomIntervals(s, 8)
      let best = 0
      for (let m = 0; m < 1 << iv.length; m++) {
        const set = iv.filter((_, i) => m & (1 << i))
        if (set.every((a, i) => set.every((b, j) => i === j || !(a.start < b.end && b.start < a.end)))) best = Math.max(best, set.length)
      }
      expect(optimalCount(iv)).toBe(best)
    }
  })
  it('orders deterministically', () => {
    expect(orderBy(toIntervals([[3, 4], [0, 9]]), 'earliestStart')[0].start).toBe(0)
  })
})

describe('knapsack', () => {
  const { items, cap } = KNAPSACK_PRESETS.classic
  it('classic example: fractional 240, greedy 0/1 160, optimal 220', () => {
    expect(fractionalGreedy(items, cap).value).toBeCloseTo(240)
    expect(greedy01(items, cap).value).toBe(160)
    expect(optimal01(items, cap).value).toBe(220)
  })
  it('greedy-friendly preset: greedy equals optimal', () => {
    const p = KNAPSACK_PRESETS.easy
    expect(greedy01(p.items, p.cap).value).toBe(optimal01(p.items, p.cap).value)
  })
  it('optimal01 never beats fractional and never loses to greedy; taken items fit', () => {
    for (let s = 1; s <= 100; s++) {
      const n = 3 + (s % 4)
      const its = Array.from({ length: n }, (_, i) => ({ name: String(i), weight: 1 + ((s * (i + 3)) % 9), value: 1 + ((s * (i + 5)) % 20) }))
      const c = 5 + (s % 15)
      const o = optimal01(its, c)
      expect(o.value).toBeLessThanOrEqual(fractionalGreedy(its, c).value + 1e-9)
      expect(o.value).toBeGreaterThanOrEqual(greedy01(its, c).value)
      expect(o.taken.reduce((t, x) => t + x.weight, 0)).toBeLessThanOrEqual(c)
      expect(o.taken.reduce((t, x) => t + x.value, 0)).toBe(o.value)
    }
  })
})

describe('more coin sets used on the page', () => {
  it('safe and unsafe sets', () => {
    expect(firstCounterexample([1, 5, 10, 25])).toBeNull()
    expect(firstCounterexample([1, 2, 5, 10, 20, 50])).toBeNull()
    expect(firstCounterexample([1, 10, 15])).toBe(20)
  })
})
