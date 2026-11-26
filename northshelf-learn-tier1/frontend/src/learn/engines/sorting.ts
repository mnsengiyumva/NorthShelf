// Sorting algorithms that report every comparison and write, so they can be replayed or just counted.
export type SortAlgo = 'bubble' | 'insertion' | 'selection' | 'merge' | 'quick'
export type InputKind = 'random' | 'sorted' | 'reversed' | 'nearly'

export const ALGO_ORDER: SortAlgo[] = ['bubble', 'insertion', 'selection', 'merge', 'quick']

export const ALGO_INFO: Record<
  SortAlgo,
  { name: string; best: string; average: string; worst: string; space: string; stable: string; idea: string }
> = {
  bubble: {
    name: 'Bubble sort',
    best: 'O(n)',
    average: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: 'Yes',
    idea: 'Swap neighbours that are out of order. After each pass the largest remaining value has "bubbled" to the end. Stops early if a pass makes no swaps.',
  },
  insertion: {
    name: 'Insertion sort',
    best: 'O(n)',
    average: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: 'Yes',
    idea: 'Grow a sorted prefix. Take the next value and slide it left until it sits in the right place.',
  },
  selection: {
    name: 'Selection sort',
    best: 'O(n²)',
    average: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: 'No',
    idea: 'Find the smallest remaining value and swap it into the next position. Always scans everything left, even if the data is already sorted.',
  },
  merge: {
    name: 'Merge sort',
    best: 'O(n log n)',
    average: 'O(n log n)',
    worst: 'O(n log n)',
    space: 'O(n)',
    stable: 'Yes',
    idea: 'Split in half, sort each half recursively, then merge the two sorted halves using a buffer.',
  },
  quick: {
    name: 'Quick sort',
    best: 'O(n log n)',
    average: 'O(n log n)',
    worst: 'O(n²)',
    space: 'O(log n) typical',
    stable: 'No',
    idea: 'Pick a pivot (here: the last element), move smaller values left of it, larger right, then sort each side recursively. A bad pivot choice on sorted data is the classic worst case.',
  },
}

export interface Snapshot {
  arr: number[]
  aux: (number | null)[] | null
  compare: number[]
  auxCompare: number[]
  written: number[]
  pivot: number | null
  range: [number, number] | null
  done: boolean
  note: string
  comparisons: number
  writes: number
}

export interface SortRun {
  sorted: number[]
  comparisons: number
  writes: number
  snapshots: Snapshot[]
}

interface Ctx {
  a: number[]
  aux: (number | null)[] | null
  comparisons: number
  writes: number
  snaps: Snapshot[] | null
}

function snap(c: Ctx, extra: Partial<Snapshot>) {
  if (!c.snaps) return
  c.snaps.push({
    arr: c.a.slice(),
    aux: c.aux ? c.aux.slice() : null,
    compare: [],
    auxCompare: [],
    written: [],
    pivot: null,
    range: null,
    done: false,
    note: '',
    comparisons: c.comparisons,
    writes: c.writes,
    ...extra,
  })
}

/** Is a[i] < a[j]? Counts one comparison. */
function lt(c: Ctx, i: number, j: number, pivot: number | null = null): boolean {
  c.comparisons++
  const r = c.a[i] < c.a[j]
  snap(c, { compare: [i, j], pivot, note: `Is ${c.a[i]} < ${c.a[j]}? ${r ? 'Yes' : 'No'}.` })
  return r
}

function swap(c: Ctx, i: number, j: number, pivot: number | null = null) {
  if (i === j) return
  const x = c.a[i]
  c.a[i] = c.a[j]
  c.a[j] = x
  c.writes += 2
  snap(c, { written: [i, j], pivot, note: `Swap ${c.a[j]} and ${c.a[i]}.` })
}

function bubble(c: Ctx) {
  const n = c.a.length
  for (let pass = 0; pass < n - 1; pass++) {
    let swapped = false
    for (let i = 0; i < n - 1 - pass; i++) {
      if (lt(c, i + 1, i)) {
        swap(c, i, i + 1)
        swapped = true
      }
    }
    if (!swapped) break
  }
}

function insertion(c: Ctx) {
  for (let i = 1; i < c.a.length; i++) {
    for (let j = i; j > 0; j--) {
      if (!lt(c, j, j - 1)) break
      swap(c, j - 1, j)
    }
  }
}

function selection(c: Ctx) {
  const n = c.a.length
  for (let i = 0; i < n - 1; i++) {
    let min = i
    for (let j = i + 1; j < n; j++) if (lt(c, j, min)) min = j
    swap(c, i, min)
  }
}

function merge(c: Ctx) {
  const n = c.a.length
  const buf = new Array<number>(n)
  const sort = (lo: number, hi: number) => {
    if (hi <= lo) return
    const mid = (lo + hi) >> 1
    sort(lo, mid)
    sort(mid + 1, hi)
    for (let k = lo; k <= hi; k++) {
      buf[k] = c.a[k]
      if (c.aux) c.aux[k] = c.a[k]
    }
    snap(c, { range: [lo, hi], note: `Merge the sorted halves ${lo}–${mid} and ${mid + 1}–${hi} (copied to the buffer).` })
    let i = lo
    let j = mid + 1
    for (let k = lo; k <= hi; k++) {
      let takeRight: boolean
      if (i > mid) takeRight = true
      else if (j > hi) takeRight = false
      else {
        c.comparisons++
        takeRight = buf[j] < buf[i]
        snap(c, {
          auxCompare: [i, j],
          range: [lo, hi],
          note: `Compare ${buf[i]} (left) with ${buf[j]} (right): take the ${takeRight ? 'right' : 'left'} one.`,
        })
      }
      c.a[k] = takeRight ? buf[j++] : buf[i++]
      c.writes++
      snap(c, { written: [k], range: [lo, hi], note: `Place ${c.a[k]} at position ${k}.` })
    }
    if (c.aux) for (let k = lo; k <= hi; k++) c.aux[k] = null
  }
  sort(0, n - 1)
}

function quick(c: Ctx) {
  const sort = (lo: number, hi: number) => {
    if (lo >= hi) return
    snap(c, { range: [lo, hi], pivot: hi, note: `Partition positions ${lo}–${hi} around the pivot ${c.a[hi]}.` })
    let i = lo
    for (let j = lo; j < hi; j++) {
      if (lt(c, j, hi, hi)) {
        swap(c, i, j, hi)
        i++
      }
    }
    swap(c, i, hi)
    snap(c, { written: [i], note: `Pivot ${c.a[i]} is now in its final position ${i}.` })
    sort(lo, i - 1)
    sort(i + 1, hi)
  }
  sort(0, c.a.length - 1)
}

const IMPLS: Record<SortAlgo, (c: Ctx) => void> = { bubble, insertion, selection, merge, quick }

export function runSort(algo: SortAlgo, input: number[], record = false): SortRun {
  const c: Ctx = {
    a: input.slice(),
    aux: record ? new Array<number | null>(input.length).fill(null) : null,
    comparisons: 0,
    writes: 0,
    snaps: record ? [] : null,
  }
  snap(c, { note: 'Start. Press Next to step through.' })
  IMPLS[algo](c)
  snap(c, { done: true, note: 'Sorted.' })
  return { sorted: c.a, comparisons: c.comparisons, writes: c.writes, snapshots: c.snaps ?? [] }
}

export function mulberry32(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A permutation of 1..n of the given shape. Same seed, same list. */
export function makeInput(kind: InputKind, n: number, seed = 1): number[] {
  const base = Array.from({ length: n }, (_, i) => i + 1)
  if (n < 2 || kind === 'sorted') return base
  if (kind === 'reversed') return base.reverse()
  const rnd = mulberry32(seed)
  if (kind === 'nearly') {
    for (let k = 0; k < Math.max(1, Math.floor(n / 8)); k++) {
      const i = Math.floor(rnd() * (n - 1))
      ;[base[i], base[i + 1]] = [base[i + 1], base[i]]
    }
    return base
  }
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[base[i], base[j]] = [base[j], base[i]]
  }
  return base
}

export const SIZES = [8, 16, 32, 64, 128, 256, 512, 1024]

export interface Measurement {
  n: number
  comparisons: number
  writes: number
}

export function measure(algo: SortAlgo, kind: InputKind, sizes = SIZES, seed = 1): Measurement[] {
  return sizes.map((n) => {
    const r = runSort(algo, makeInput(kind, n, seed))
    return { n, comparisons: r.comparisons, writes: r.writes }
  })
}

/** Average factor by which the work grows each time n doubles (over the last three doublings). */
export function doublingFactor(ms: Measurement[]): number {
  const last = ms.slice(-4)
  const ratios = last.slice(1).map((m, i) => m.comparisons / Math.max(1, last[i].comparisons))
  return ratios.reduce((a, b) => a + b, 0) / ratios.length
}
