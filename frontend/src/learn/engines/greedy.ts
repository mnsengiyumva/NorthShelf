// Greedy algorithms, with independent exact solvers so the page can show when greedy is not optimal.
import { mulberry32 } from './sorting'

/* ---------- Coin change ---------- */
export interface CoinStep { coin: number; remainingBefore: number }

export function greedyCoins(coins: number[], amount: number) {
  const sorted = [...coins].sort((a, b) => b - a)
  const steps: CoinStep[] = []
  let rem = amount
  for (const c of sorted) {
    while (c > 0 && rem >= c) {
      steps.push({ coin: c, remainingBefore: rem })
      rem -= c
    }
  }
  return { steps, left: rem, count: steps.length, ok: rem === 0 }
}

/** Fewest coins (dynamic programming), or null if the amount cannot be made. */
export function optimalCoins(coins: number[], amount: number): number[] | null {
  const best: number[] = new Array(amount + 1).fill(Infinity)
  const from: number[] = new Array(amount + 1).fill(0)
  best[0] = 0
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a && best[a - c] + 1 < best[a]) {
        best[a] = best[a - c] + 1
        from[a] = c
      }
    }
  }
  if (!Number.isFinite(best[amount])) return null
  const out: number[] = []
  for (let a = amount; a > 0; a -= from[a]) out.push(from[a])
  return out.sort((x, y) => y - x)
}

/** Smallest amount where greedy is worse than optimal (or fails), or null if none up to the check range. */
export function firstCounterexample(coins: number[]): number | null {
  const max = Math.max(...coins)
  for (let a = 1; a <= 2 * max + 1; a++) {
    const opt = optimalCoins(coins, a)
    if (!opt) continue
    const g = greedyCoins(coins, a)
    if (!g.ok || g.count > opt.length) return a
  }
  return null
}

/* ---------- Interval scheduling ---------- */
export interface Interval { id: number; start: number; end: number }
export type Rule = 'earliestFinish' | 'earliestStart' | 'shortest'
export const RULE_LABEL: Record<Rule, string> = {
  earliestFinish: 'Earliest finish first',
  earliestStart: 'Earliest start first',
  shortest: 'Shortest first',
}
export const RULE_ORDER: Rule[] = ['earliestFinish', 'earliestStart', 'shortest']

export function orderBy(iv: Interval[], rule: Rule): Interval[] {
  const key: Record<Rule, (i: Interval) => number> = {
    earliestFinish: (i) => i.end,
    earliestStart: (i) => i.start,
    shortest: (i) => i.end - i.start,
  }
  return [...iv].sort((a, b) => key[rule](a) - key[rule](b) || a.start - b.start || a.id - b.id)
}

export interface Decision { interval: Interval; accepted: boolean; blockedBy?: Interval }

export function schedule(iv: Interval[], rule: Rule) {
  const decisions: Decision[] = []
  const chosen: Interval[] = []
  for (const it of orderBy(iv, rule)) {
    const clash = chosen.find((c) => it.start < c.end && c.start < it.end)
    if (clash) decisions.push({ interval: it, accepted: false, blockedBy: clash })
    else {
      chosen.push(it)
      decisions.push({ interval: it, accepted: true })
    }
  }
  return { decisions, chosen }
}

/** Maximum number of non-overlapping intervals, by dynamic programming (independent of the greedy rule). */
export function optimalCount(iv: Interval[]): number {
  const s = [...iv].sort((a, b) => a.end - b.end)
  const dp: number[] = new Array(s.length + 1).fill(0)
  for (let i = 1; i <= s.length; i++) {
    let p = i - 1
    while (p > 0 && s[p - 1].end > s[i - 1].start) p--
    dp[i] = Math.max(dp[i - 1], 1 + dp[p])
  }
  return dp[s.length]
}

export const PRESETS_INTERVALS: Record<string, { label: string; note: string; items: [number, number][] }> = {
  typical: { label: 'A typical day', note: 'Every rule does fine on some inputs…', items: [[0, 3], [2, 5], [4, 7], [6, 9], [1, 8], [8, 11], [10, 12]] },
  long: { label: 'One very long event', note: '…but “earliest start” grabs the long event first.', items: [[0, 10], [1, 3], [4, 6], [7, 9]] },
  short: { label: 'A short event in the middle', note: '…and “shortest first” is tricked by a short event that blocks two others.', items: [[0, 5], [4, 6], [5, 10]] },
}
export const toIntervals = (items: [number, number][]): Interval[] => items.map(([start, end], id) => ({ id, start, end }))

export function randomIntervals(seed: number, n = 8, horizon = 20): Interval[] {
  const r = mulberry32(seed)
  return Array.from({ length: n }, (_, id) => {
    const start = Math.floor(r() * (horizon - 2))
    const len = 1 + Math.floor(r() * 6)
    return { id, start, end: Math.min(horizon, start + len) }
  })
}

/* ---------- Knapsack ---------- */
export interface Item { name: string; weight: number; value: number }

const byRatio = (items: Item[]) => [...items].sort((a, b) => b.value / b.weight - a.value / a.weight)

/** Fractional knapsack: greedy by value per kilo is provably optimal. */
export function fractionalGreedy(items: Item[], cap: number) {
  let room = cap
  let value = 0
  const taken: { item: Item; fraction: number }[] = []
  for (const it of byRatio(items)) {
    if (room <= 0) break
    const f = Math.min(1, room / it.weight)
    taken.push({ item: it, fraction: f })
    value += f * it.value
    room -= f * it.weight
  }
  return { value, taken }
}

/** 0/1 knapsack with the same greedy idea (take whole items in ratio order while they fit). */
export function greedy01(items: Item[], cap: number) {
  let room = cap
  let value = 0
  const taken: Item[] = []
  for (const it of byRatio(items)) {
    if (it.weight <= room) {
      taken.push(it)
      value += it.value
      room -= it.weight
    }
  }
  return { value, taken }
}

/** Exact 0/1 knapsack by dynamic programming (integer weights). */
export function optimal01(items: Item[], cap: number) {
  const dp: number[][] = Array.from({ length: items.length + 1 }, () => new Array(cap + 1).fill(0))
  for (let i = 1; i <= items.length; i++) {
    const { weight, value } = items[i - 1]
    for (let w = 0; w <= cap; w++) {
      dp[i][w] = dp[i - 1][w]
      if (weight <= w) dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weight] + value)
    }
  }
  const taken: Item[] = []
  for (let i = items.length, w = cap; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      taken.push(items[i - 1])
      w -= items[i - 1].weight
    }
  }
  return { value: dp[items.length][cap], taken: taken.reverse() }
}

export const KNAPSACK_PRESETS: Record<string, { label: string; cap: number; items: Item[] }> = {
  classic: {
    label: 'Three items',
    cap: 50,
    items: [
      { name: 'A', weight: 10, value: 60 },
      { name: 'B', weight: 20, value: 100 },
      { name: 'C', weight: 30, value: 120 },
    ],
  },
  easy: {
    label: 'Greedy-friendly',
    cap: 15,
    items: [
      { name: 'A', weight: 5, value: 50 },
      { name: 'B', weight: 5, value: 40 },
      { name: 'C', weight: 5, value: 30 },
      { name: 'D', weight: 5, value: 5 },
    ],
  },
}
