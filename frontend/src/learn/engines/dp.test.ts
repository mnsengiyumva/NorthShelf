import { describe, expect, it } from 'vitest'
import { coinTable, coinTrace, KNAPSACK_DP_PRESETS, knapsackGrid, knapsackTrace, lcsGrid, lcsTrace, naiveCalls } from './dp'
import { greedyCoins, optimal01, optimalCoins } from './greedy'

describe('coin table', () => {
  it('matches the independent solver and traces a valid answer', () => {
    for (const coins of [[1, 3, 4], [1, 5, 10, 12], [2, 5], [5, 10]]) {
      const t = coinTable(coins, 40)
      for (let a = 0; a <= 40; a++) {
        const o = a === 0 ? [] : optimalCoins(coins, a)
        expect(t[a].value).toBe(o ? o.length : Infinity)
        const tr = coinTrace(t, a)
        if (o) {
          expect(tr!.reduce((s, c) => s + c, 0)).toBe(a)
          expect(tr!.length).toBe(o.length)
        } else expect(tr).toBeNull()
      }
    }
  })
  it('{1,3,4} at 6 is 2 where greedy needs 3', () => {
    expect(coinTable([1, 3, 4], 6)[6].value).toBe(2)
    expect(greedyCoins([1, 3, 4], 6).count).toBe(3)
  })
  it('candidates list every usable coin', () => {
    const c = coinTable([1, 3, 4], 6)[6].candidates
    expect(c.map((x) => x.from).sort()).toEqual([2, 3, 5])
  })
  it('naiveCalls equals a real recursive count', () => {
    const count = (coins: number[], a: number): number => {
      let n = 1
      for (const c of coins) if (c <= a) n += count(coins, a - c)
      return n
    }
    for (const a of [0, 1, 5, 10, 14]) expect(naiveCalls([1, 3, 4], a)).toBe(count([1, 3, 4], a))
    expect(naiveCalls([1, 3, 4], 30)).toBeGreaterThan(1e6)
  })
})

describe('knapsack grid', () => {
  it('agrees with the 1-D solver and with brute force', () => {
    for (const p of Object.values(KNAPSACK_DP_PRESETS)) {
      for (let cap = 0; cap <= 12; cap++) {
        const g = knapsackGrid(p.items, cap)
        const best = g[p.items.length][cap].value
        expect(best).toBe(optimal01(p.items, cap).value)
        let brute = 0
        for (let m = 0; m < 1 << p.items.length; m++) {
          const sub = p.items.filter((_, i) => m & (1 << i))
          if (sub.reduce((s, x) => s + x.weight, 0) <= cap) brute = Math.max(brute, sub.reduce((s, x) => s + x.value, 0))
        }
        expect(best).toBe(brute)
        const { chosen } = knapsackTrace(g, p.items)
        expect(chosen.reduce((s, x) => s + x.weight, 0)).toBeLessThanOrEqual(cap)
        expect(chosen.reduce((s, x) => s + x.value, 0)).toBe(best)
      }
    }
  })
  it('the greedy-trap preset is 22', () => {
    const p = KNAPSACK_DP_PRESETS.trap
    expect(knapsackGrid(p.items, p.cap)[3][p.cap].value).toBe(22)
  })
})

describe('LCS grid', () => {
  const isSubseq = (s: string, t: string) => {
    let k = 0
    for (const ch of t) if (k < s.length && s[k] === ch) k++
    return k === s.length
  }
  const brute = (a: string, b: string) => {
    let best = 0
    for (let m = 0; m < 1 << a.length; m++) {
      let s = ''
      for (let i = 0; i < a.length; i++) if (m & (1 << i)) s += a[i]
      if (s.length > best && isSubseq(s, b)) best = s.length
    }
    return best
  }
  it('classic example', () => {
    const g = lcsGrid('AGGTAB', 'GXTXAYB')
    expect(g[6][7].value).toBe(4)
    expect(lcsTrace(g, 'AGGTAB').text).toBe('GTAB')
  })
  it('matches brute force and traces a real common subsequence', () => {
    const pairs = [['ABCBDAB', 'BDCABA'], ['HELLO', 'YELLOW'], ['', 'ABC'], ['AAAA', 'AA'], ['XYZ', 'ABC'], ['KITTEN', 'SITTING'], ['ABCDEF', 'FBDAMN']]
    for (const [a, b] of pairs) {
      const g = lcsGrid(a, b)
      const v = g[a.length][b.length].value
      expect(v).toBe(brute(a, b))
      const { text } = lcsTrace(g, a)
      expect(text.length).toBe(v)
      expect(isSubseq(text, a) && isSubseq(text, b)).toBe(true)
    }
  })
})

describe('numbers used in page questions', () => {
  it('has the expected answers', () => {
    expect(coinTable([1, 3, 4], 10)[10].value).toBe(3)
    expect(lcsGrid('ABCDE', 'ACE')[5][3].value).toBe(3)
    expect(coinTable([2, 5], 11)[1].value).toBe(Infinity)
    expect(coinTable([2, 5], 11)[11].value).toBe(4)
  })
})
