// Dynamic-programming tables that record, for every cell, which earlier cells it used.
import type { Item } from './greedy'

/* ---------- Coin change (1-D table) ---------- */
export interface Candidate { coin: number; from: number; total: number }
export interface CoinCell { amount: number; value: number; via: number | null; candidates: Candidate[] }

export function coinTable(coins: number[], amount: number): CoinCell[] {
  const sorted = [...coins].sort((a, b) => b - a)
  const cells: CoinCell[] = [{ amount: 0, value: 0, via: null, candidates: [] }]
  for (let a = 1; a <= amount; a++) {
    const candidates: Candidate[] = sorted
      .filter((c) => c <= a && Number.isFinite(cells[a - c].value))
      .map((c) => ({ coin: c, from: a - c, total: cells[a - c].value + 1 }))
    let best: Candidate | null = null
    for (const c of candidates) if (!best || c.total < best.total) best = c
    cells.push({ amount: a, value: best ? best.total : Infinity, via: best ? best.coin : null, candidates })
  }
  return cells
}

export function coinTrace(cells: CoinCell[], amount: number): number[] | null {
  if (!Number.isFinite(cells[amount].value)) return null
  const out: number[] = []
  for (let a = amount; a > 0; a -= cells[a].via!) out.push(cells[a].via!)
  return out
}

/** How many calls a plain recursive minCoins(a) = 1 + min(minCoins(a − c)) makes, with no remembering. */
export function naiveCalls(coins: number[], amount: number): number {
  const calls: number[] = [1]
  for (let a = 1; a <= amount; a++) {
    let t = 1
    for (const c of coins) if (c <= a) t += calls[a - c]
    calls.push(t)
  }
  return calls[amount]
}

/* ---------- 0/1 knapsack (2-D table) ---------- */
export interface KCell { i: number; w: number; value: number; take: boolean }

export function knapsackGrid(items: Item[], cap: number): KCell[][] {
  const g: KCell[][] = [Array.from({ length: cap + 1 }, (_, w) => ({ i: 0, w, value: 0, take: false }))]
  for (let i = 1; i <= items.length; i++) {
    const { weight, value } = items[i - 1]
    g.push(
      Array.from({ length: cap + 1 }, (_, w) => {
        const skip = g[i - 1][w].value
        const takeVal = w >= weight ? g[i - 1][w - weight].value + value : -Infinity
        return takeVal > skip ? { i, w, value: takeVal, take: true } : { i, w, value: skip, take: false }
      }),
    )
  }
  return g
}

export function knapsackTrace(g: KCell[][], items: Item[]) {
  const chosen: Item[] = []
  const path: [number, number][] = []
  let w = g[0].length - 1
  for (let i = items.length; i >= 0; i--) {
    path.push([i, w])
    if (i > 0 && g[i][w].take) {
      chosen.push(items[i - 1])
      w -= items[i - 1].weight
    }
  }
  return { chosen: chosen.reverse(), path }
}

export const KNAPSACK_DP_PRESETS: Record<string, { label: string; cap: number; items: Item[] }> = {
  small: {
    label: 'Four items',
    cap: 8,
    items: [
      { name: 'A', weight: 2, value: 3 },
      { name: 'B', weight: 3, value: 4 },
      { name: 'C', weight: 4, value: 5 },
      { name: 'D', weight: 5, value: 6 },
    ],
  },
  trap: {
    label: 'The greedy trap',
    cap: 5,
    items: [
      { name: 'A', weight: 1, value: 6 },
      { name: 'B', weight: 2, value: 10 },
      { name: 'C', weight: 3, value: 12 },
    ],
  },
}

/* ---------- Longest common subsequence (2-D table) ---------- */
export interface LCell { i: number; j: number; value: number; move: 'start' | 'match' | 'up' | 'left' }

export function lcsGrid(a: string, b: string): LCell[][] {
  const g: LCell[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => ({ i, j, value: 0, move: 'start' as LCell['move'] })),
  )
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) g[i][j] = { i, j, value: g[i - 1][j - 1].value + 1, move: 'match' }
      else if (g[i - 1][j].value >= g[i][j - 1].value) g[i][j] = { i, j, value: g[i - 1][j].value, move: 'up' }
      else g[i][j] = { i, j, value: g[i][j - 1].value, move: 'left' }
    }
  }
  return g
}

export function lcsTrace(g: LCell[][], a: string) {
  let i = g.length - 1
  let j = g[0].length - 1
  const path: [number, number][] = [[i, j]]
  let text = ''
  while (i > 0 && j > 0) {
    const m = g[i][j].move
    if (m === 'match') { text = a[i - 1] + text; i--; j-- }
    else if (m === 'up') i--
    else j--
    path.push([i, j])
  }
  return { text, path }
}
