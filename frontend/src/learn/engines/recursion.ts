// Records every call and return of a recursive function so the page can replay it step by step.
export type RecAlgo = 'factorial' | 'fibonacci' | 'sumList' | 'gcd'
export type ReturnKind = 'base' | 'recursive' | 'memo'

export interface RecInput {
  n: number
  list: number[]
  a: number
  b: number
  memo: boolean
}

export interface RecNode {
  id: number
  parent: number | null
  depth: number
  label: string
  children: number[]
  value?: number
}

export type RecEvent =
  | { type: 'call'; id: number }
  | { type: 'return'; id: number; value: number; kind: ReturnKind }

export interface RecTrace {
  nodes: RecNode[]
  events: RecEvent[]
  result: number
  calls: number
  maxStack: number
}

export const DEFAULT_INPUT: RecInput = { n: 4, list: [3, 1, 4, 1, 5], a: 48, b: 18, memo: false }

const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.trunc(v) || 0))

export function trace(algo: RecAlgo, partial: Partial<RecInput> = {}): RecTrace {
  const input = { ...DEFAULT_INPUT, ...partial }
  const nodes: RecNode[] = []
  const events: RecEvent[] = []
  let maxStack = 0

  const enter = (label: string, parent: number | null): number => {
    const id = nodes.length
    const depth = parent === null ? 0 : nodes[parent].depth + 1
    nodes.push({ id, parent, depth, label, children: [] })
    if (parent !== null) nodes[parent].children.push(id)
    events.push({ type: 'call', id })
    maxStack = Math.max(maxStack, depth + 1)
    return id
  }
  const leave = (id: number, value: number, kind: ReturnKind): number => {
    nodes[id].value = value
    events.push({ type: 'return', id, value, kind })
    return value
  }

  let result = 0
  if (algo === 'factorial') {
    const fact = (n: number, parent: number | null): number => {
      const id = enter(`fact(${n})`, parent)
      if (n <= 1) return leave(id, 1, 'base')
      return leave(id, n * fact(n - 1, id), 'recursive')
    }
    result = fact(clampInt(input.n, 0, 10), null)
  } else if (algo === 'fibonacci') {
    const memo = new Map<number, number>()
    const fib = (n: number, parent: number | null): number => {
      const id = enter(`fib(${n})`, parent)
      if (n < 2) return leave(id, n, 'base')
      if (input.memo && memo.has(n)) return leave(id, memo.get(n)!, 'memo')
      const v = fib(n - 1, id) + fib(n - 2, id)
      if (input.memo) memo.set(n, v)
      return leave(id, v, 'recursive')
    }
    result = fib(clampInt(input.n, 0, 8), null)
  } else if (algo === 'sumList') {
    const list = input.list.slice(0, 8).map((v) => clampInt(v, -99, 99))
    const sum = (i: number, parent: number | null): number => {
      const id = enter(`i=${i}`, parent)
      if (i >= list.length) return leave(id, 0, 'base')
      return leave(id, list[i] + sum(i + 1, id), 'recursive')
    }
    result = sum(0, null)
  } else {
    const gcd = (a: number, b: number, parent: number | null): number => {
      const id = enter(`gcd(${a},${b})`, parent)
      if (b === 0) return leave(id, a, 'base')
      return leave(id, gcd(b, a % b, id), 'recursive')
    }
    result = gcd(clampInt(input.a, 0, 999), clampInt(input.b, 0, 999), null)
  }
  return { nodes, events, result, calls: nodes.length, maxStack }
}

/** Ids on the call stack (bottom first) after the first `k` events have happened. */
export function stackAt(events: RecEvent[], k: number): number[] {
  const stack: number[] = []
  for (let i = 0; i < k && i < events.length; i++) {
    const e = events[i]
    if (e.type === 'call') stack.push(e.id)
    else stack.pop()
  }
  return stack
}

/** Which nodes have been called, and which have returned, after `k` events. */
export function stateAt(events: RecEvent[], k: number) {
  const called = new Set<number>()
  const returned = new Map<number, { value: number; kind: ReturnKind }>()
  for (let i = 0; i < k && i < events.length; i++) {
    const e = events[i]
    if (e.type === 'call') called.add(e.id)
    else returned.set(e.id, { value: e.value, kind: e.kind })
  }
  return { called, returned }
}

/** Tidy tree layout: leaves get consecutive columns, parents sit above the middle of their children. */
export function layoutTree(nodes: RecNode[]) {
  const pos = new Map<number, { x: number; y: number }>()
  let next = 0
  const place = (id: number) => {
    const n = nodes[id]
    let x: number
    if (n.children.length === 0) x = next++
    else {
      n.children.forEach(place)
      x = (pos.get(n.children[0])!.x + pos.get(n.children[n.children.length - 1])!.x) / 2
    }
    pos.set(id, { x, y: n.depth })
  }
  if (nodes.length) place(0)
  return { pos, columns: Math.max(next, 1), rows: nodes.reduce((m, n) => Math.max(m, n.depth), 0) + 1 }
}

/** Number of calls fib(n) makes, without and with memoization. */
export function fibCallCounts(n: number): { plain: number; memo: number } {
  let a = 0
  let b = 1 // F(0), F(1)
  for (let i = 0; i < n + 1; i++) [a, b] = [b, a + b] // after the loop a = F(n+1)
  return { plain: 2 * a - 1, memo: n < 1 ? 1 : 2 * n - 1 }
}

export const SOURCES: Record<RecAlgo, { lines: string[]; call: number; base: number; recursive: number; memo?: number }> = {
  factorial: {
    lines: ['def fact(n):', '    if n <= 1:', '        return 1', '    return n * fact(n - 1)'],
    call: 0,
    base: 2,
    recursive: 3,
  },
  fibonacci: {
    lines: [
      'def fib(n):',
      '    if n < 2:',
      '        return n',
      '    if n in memo:',
      '        return memo[n]',
      '    memo[n] = fib(n - 1) + fib(n - 2)',
      '    return memo[n]',
    ],
    call: 0,
    base: 2,
    recursive: 5,
    memo: 4,
  },
  sumList: {
    lines: ['def total(xs, i):', '    if i == len(xs):', '        return 0', '    return xs[i] + total(xs, i + 1)'],
    call: 0,
    base: 2,
    recursive: 3,
  },
  gcd: {
    lines: ['def gcd(a, b):', '    if b == 0:', '        return a', '    return gcd(b, a % b)'],
    call: 0,
    base: 2,
    recursive: 3,
  },
}
