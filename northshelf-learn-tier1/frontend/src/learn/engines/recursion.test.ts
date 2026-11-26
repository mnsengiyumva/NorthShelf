import { describe, expect, it } from 'vitest'
import { fibCallCounts, layoutTree, stackAt, stateAt, trace } from './recursion'

const fibRef = (n: number): number => (n < 2 ? n : fibRef(n - 1) + fibRef(n - 2))
const gcdRef = (a: number, b: number): number => (b === 0 ? a : gcdRef(b, a % b))

describe('recursion traces', () => {
  it('computes factorial and keeps the stack as deep as n', () => {
    for (let n = 0; n <= 10; n++) {
      const t = trace('factorial', { n })
      expect(t.result).toBe([1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800][n])
      expect(t.calls).toBe(Math.max(n, 1))
      expect(t.maxStack).toBe(Math.max(n, 1))
    }
  })

  it('computes Fibonacci and the exact number of calls, with and without memoization', () => {
    for (let n = 0; n <= 8; n++) {
      const plain = trace('fibonacci', { n })
      const memo = trace('fibonacci', { n, memo: true })
      expect(plain.result).toBe(fibRef(n))
      expect(memo.result).toBe(fibRef(n))
      expect(plain.calls).toBe(fibCallCounts(n).plain)
      expect(memo.calls).toBe(fibCallCounts(n).memo)
    }
    expect(fibCallCounts(5)).toEqual({ plain: 15, memo: 9 })
    expect(fibCallCounts(30).plain).toBe(2692537)
  })

  it('marks memo hits as returns that make no further calls', () => {
    const t = trace('fibonacci', { n: 6, memo: true })
    const hits = t.events.filter((e) => e.type === 'return' && e.kind === 'memo')
    expect(hits.length).toBeGreaterThan(0)
    for (const e of hits) if (e.type === 'return') expect(t.nodes[e.id].children).toEqual([])
  })

  it('sums a list and runs Euclid correctly', () => {
    expect(trace('sumList', { list: [3, 1, 4, 1, 5] }).result).toBe(14)
    expect(trace('sumList', { list: [] }).result).toBe(0)
    for (const [a, b] of [[48, 18], [17, 5], [100, 75], [7, 0], [0, 9]]) {
      expect(trace('gcd', { a, b }).result).toBe(gcdRef(a, b))
    }
  })

  it('every call has exactly one return, in last-in first-out order', () => {
    for (const algo of ['factorial', 'fibonacci', 'sumList', 'gcd'] as const) {
      const t = trace(algo, { n: 6 })
      const stack: number[] = []
      for (const e of t.events) {
        if (e.type === 'call') stack.push(e.id)
        else expect(stack.pop()).toBe(e.id)
      }
      expect(stack).toEqual([])
      expect(t.events.length).toBe(2 * t.calls)
    }
  })

  it('replays the stack and node states at any step', () => {
    const t = trace('factorial', { n: 3 })
    expect(stackAt(t.events, 0)).toEqual([])
    expect(stackAt(t.events, 3)).toEqual([0, 1, 2])
    expect(stackAt(t.events, 4)).toEqual([0, 1]) // fact(1) returned
    const s = stateAt(t.events, 4)
    expect(s.called.size).toBe(3)
    expect(s.returned.get(2)).toEqual({ value: 1, kind: 'base' })
  })

  it('lays out a tree with unique leaf columns and parents above their children', () => {
    const t = trace('fibonacci', { n: 5 })
    const { pos, columns } = layoutTree(t.nodes)
    const leaves = t.nodes.filter((n) => n.children.length === 0)
    expect(new Set(leaves.map((n) => pos.get(n.id)!.x)).size).toBe(leaves.length)
    expect(columns).toBe(leaves.length)
    for (const n of t.nodes) for (const c of n.children) expect(pos.get(c)!.y).toBe(pos.get(n.id)!.y + 1)
  })
})
