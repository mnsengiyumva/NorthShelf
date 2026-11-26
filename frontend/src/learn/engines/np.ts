// Subset sum and the travelling salesman problem: tiny verifiers, brute-force solvers, and heuristics.
import { mulberry32 } from './sorting'

/* ---------- Subset sum ---------- */
export const sumOfPicked = (nums: number[], picked: boolean[]) => nums.reduce((s, v, i) => s + (picked[i] ? v : 0), 0)

export const MAX_SUBSET_N = 20

/** Try every subset until one hits the target. `checked` counts subsets examined. */
export function solveSubsetSum(nums: number[], target: number): { mask: number | null; checked: number } {
  const n = nums.length
  if (n > MAX_SUBSET_N) throw new Error(`Brute force is limited to ${MAX_SUBSET_N} numbers here.`)
  const sums = new Int32Array(1 << n)
  let checked = 0
  for (let m = 1; m < 1 << n; m++) {
    const low = m & -m
    sums[m] = sums[m ^ low] + nums[31 - Math.clz32(low)]
    checked++
    if (sums[m] === target) return { mask: m, checked }
  }
  return { mask: null, checked }
}

export const maskToPicked = (mask: number, n: number) => Array.from({ length: n }, (_, i) => (mask & (1 << i)) !== 0)

export interface SubsetInstance { nums: number[]; target: number; solvable: boolean }

export function makeSubsetInstance(n: number, seed: number, solvable: boolean): SubsetInstance {
  const r = mulberry32(seed)
  if (solvable) {
    const nums = Array.from({ length: n }, () => 5 + Math.floor(r() * 56))
    let target = 0
    let count = 0
    for (let i = 0; i < n; i++) if (r() < 0.5) { target += nums[i]; count++ }
    if (count < 2) target = nums[0] + nums[n - 1]
    return { nums, target, solvable: true }
  }
  // All numbers even and the target odd: no subset can work, but brute force has to try them all to find out.
  const nums = Array.from({ length: n }, () => 2 * (3 + Math.floor(r() * 28)))
  const total = nums.reduce((a, b) => a + b, 0)
  return { nums, target: 2 * Math.floor(total / 4) + 1, solvable: false }
}

/* ---------- Growth ---------- */
export function humanTime(seconds: number): string {
  if (seconds < 1e-3) return 'under a millisecond'
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} seconds`
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`
  const days = seconds / 86400
  if (days < 365) return `${Math.round(days)} days`
  const years = days / 365
  if (years < 1e6) return `${Math.round(years).toLocaleString('en-CA')} years`
  if (years > 1.38e10) return 'longer than the age of the universe'
  return `${years.toExponential(1).replace('e+', ' × 10^')} years`
}

export const OPS_PER_SECOND = 1e9

/* ---------- Travelling salesman ---------- */
export interface Pt { x: number; y: number }
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

export function tourLength(pts: Pt[], order: number[]): number {
  let t = 0
  for (let i = 0; i < order.length; i++) t += dist(pts[order[i]], pts[order[(i + 1) % order.length]])
  return t
}

export function randomCities(n: number, seed: number): Pt[] {
  const r = mulberry32(seed)
  return Array.from({ length: n }, () => ({ x: 0.06 + r() * 0.88, y: 0.06 + r() * 0.88 }))
}

export function nearestNeighbor(pts: Pt[], start = 0): number[] {
  const left = new Set(pts.keys())
  left.delete(start)
  const order = [start]
  while (left.size) {
    const here = pts[order[order.length - 1]]
    let best = -1
    let bd = Infinity
    for (const j of left) {
      const d = dist(here, pts[j])
      if (d < bd) { bd = d; best = j }
    }
    order.push(best)
    left.delete(best)
  }
  return order
}

/** Examine every tour (city 0 fixed, mirror images counted once). `checked` = (n − 1)! / 2. */
export function bruteForceTSP(pts: Pt[]): { order: number[]; length: number; checked: number } {
  const n = pts.length
  let best: number[] = [...pts.keys()]
  let bestLen = Infinity
  let checked = 0
  const cur = [0]
  const used = new Array(n).fill(false)
  used[0] = true
  const rec = () => {
    if (cur.length === n) {
      if (n > 2 && cur[1] > cur[n - 1]) return // mirror image of a tour already counted
      checked++
      const len = tourLength(pts, cur)
      if (len < bestLen - 1e-12) { bestLen = len; best = [...cur] }
      return
    }
    for (let c = 1; c < n; c++) {
      if (used[c]) continue
      used[c] = true
      cur.push(c)
      rec()
      cur.pop()
      used[c] = false
    }
  }
  rec()
  return { order: best, length: bestLen, checked }
}

/** Exact answer by dynamic programming (Held–Karp). Used to cross-check the brute force. */
export function heldKarp(pts: Pt[]): number {
  const n = pts.length
  if (n < 2) return 0
  const full = 1 << (n - 1)
  const dp: number[][] = Array.from({ length: full }, () => new Array(n - 1).fill(Infinity))
  for (let j = 0; j < n - 1; j++) dp[1 << j][j] = dist(pts[0], pts[j + 1])
  for (let m = 1; m < full; m++) {
    for (let j = 0; j < n - 1; j++) {
      if (!(m & (1 << j)) || dp[m][j] === Infinity) continue
      for (let k = 0; k < n - 1; k++) {
        if (m & (1 << k)) continue
        const nm = m | (1 << k)
        const v = dp[m][j] + dist(pts[j + 1], pts[k + 1])
        if (v < dp[nm][k]) dp[nm][k] = v
      }
    }
  }
  let best = Infinity
  for (let j = 0; j < n - 1; j++) best = Math.min(best, dp[full - 1][j] + dist(pts[j + 1], pts[0]))
  return best
}

export const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1))
export const tourCount = (n: number) => (n < 3 ? 1 : factorial(n - 1) / 2)

/** How much longer is the nearest-neighbour tour than the best tour, over many random maps? */
export function heuristicStats(n: number, trials: number, seed0 = 1000) {
  let sum = 0
  let worst = 1
  let optimalCount = 0
  for (let t = 0; t < trials; t++) {
    const pts = randomCities(n, seed0 + t)
    const nn = tourLength(pts, nearestNeighbor(pts))
    const opt = bruteForceTSP(pts).length
    const ratio = nn / opt
    sum += ratio
    worst = Math.max(worst, ratio)
    if (ratio < 1 + 1e-9) optimalCount++
  }
  return { average: sum / trials, worst, optimalCount, trials }
}
