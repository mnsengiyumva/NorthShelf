import { describe, expect, it } from 'vitest'
import { adjacency, bfsDistances, bfsSnaps, components, dfsSnaps, GRAPH_PRESETS, treePath, type Graph } from './graphs'

const floyd = (g: Graph) => {
  const INF = 1e9
  const d: number[][] = Array.from({ length: g.n }, (_, i) => Array.from({ length: g.n }, (_, j) => (i === j ? 0 : INF)))
  for (const [a, b] of g.edges) d[a][b] = d[b][a] = 1
  for (let k = 0; k < g.n; k++) for (let i = 0; i < g.n; i++) for (let j = 0; j < g.n; j++) d[i][j] = Math.min(d[i][j], d[i][k] + d[k][j])
  return d.map((r) => r.map((v) => (v >= INF ? null : v)))
}

const randomGraph = (seed: number): Graph => {
  let s = seed
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296)
  const n = 4 + Math.floor(rnd() * 7)
  const edges: [number, number][] = []
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (rnd() < 0.25) edges.push([i, j])
  return { name: 'r', note: '', n, edges, pos: Array.from({ length: n }, () => ({ x: 0, y: 0 })) }
}

describe('BFS', () => {
  it('distances match Floyd–Warshall on presets and 100 random graphs', () => {
    const gs = [...Object.values(GRAPH_PRESETS), ...Array.from({ length: 100 }, (_, i) => randomGraph(i + 1))]
    for (const g of gs) {
      const fw = floyd(g)
      for (let s = 0; s < g.n; s++) expect(bfsDistances(g, s)).toEqual(fw[s])
    }
  })
  it('visits in non-decreasing distance and the queue never repeats a node', () => {
    for (const g of Object.values(GRAPH_PRESETS)) {
      const snaps = bfsSnaps(g, 0)
      const last = snaps.at(-1)!
      const lv = last.order.map((v) => last.level[v]!)
      expect([...lv].sort((a, b) => a - b)).toEqual(lv)
      expect(new Set(last.order).size).toBe(last.order.length)
      for (const s of snaps) expect(new Set(s.frontier).size).toBe(s.frontier.length)
    }
  })
  it('tree path length equals shortest distance', () => {
    const g = GRAPH_PRESETS.loops
    const last = bfsSnaps(g, 0).at(-1)!
    for (let t = 0; t < g.n; t++) expect(treePath(last.tree, 0, t)!.length - 1).toBe(floyd(g)[0][t])
  })
  it('the loops preset visits A..G in order from A', () => {
    expect(bfsSnaps(GRAPH_PRESETS.loops, 0).at(-1)!.order).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
})

describe('DFS', () => {
  it('visits exactly the reachable nodes; tree edges are real edges', () => {
    const gs = [...Object.values(GRAPH_PRESETS), ...Array.from({ length: 100 }, (_, i) => randomGraph(i + 500))]
    for (const g of gs) {
      const adj = adjacency(g)
      const last = dfsSnaps(g, 0).at(-1)!
      const reach = floyd(g)[0].map((d, i) => (d !== null ? i : -1)).filter((i) => i >= 0)
      expect([...last.order].sort((a, b) => a - b)).toEqual(reach)
      for (const [p, c] of last.tree) expect(adj[p]).toContain(c)
    }
  })
  it('discovery and finish times nest properly (parenthesis theorem)', () => {
    for (const g of [...Object.values(GRAPH_PRESETS), ...Array.from({ length: 50 }, (_, i) => randomGraph(i + 900))]) {
      const { disc, fin, order } = dfsSnaps(g, 0).at(-1)!
      for (const u of order) for (const v of order) {
        if (u === v) continue
        const nested = disc[u]! < disc[v]! && fin[v]! < fin[u]!
        const nestedR = disc[v]! < disc[u]! && fin[u]! < fin[v]!
        const disjoint = fin[u]! < disc[v]! || fin[v]! < disc[u]!
        expect(nested || nestedR || disjoint).toBe(true)
      }
    }
  })
  it('the stack grows on visit and shrinks on finish; loops preset order is A,B,D,C,E,G,F', () => {
    const snaps = dfsSnaps(GRAPH_PRESETS.loops, 0)
    expect(snaps.at(-1)!.order).toEqual([0, 1, 3, 2, 4, 6, 5])
    expect(snaps.at(-1)!.frontier).toEqual([])
    expect(Math.max(...snaps.map((s) => s.frontier.length))).toBeGreaterThan(3)
  })
  it('DFS can find a longer path than BFS', () => {
    const g = GRAPH_PRESETS.loops
    const bfsP = treePath(bfsSnaps(g, 0).at(-1)!.tree, 0, 5)!
    const dfsP = treePath(dfsSnaps(g, 0).at(-1)!.tree, 0, 5)!
    expect(dfsP.length).toBeGreaterThan(bfsP.length)
  })
})

describe('components', () => {
  it('splits the disconnected preset in two and matches random graphs', () => {
    expect(components(GRAPH_PRESETS.split)).toEqual([[0, 1, 2], [3, 4, 5]])
    for (let i = 1; i <= 60; i++) {
      const g = randomGraph(i)
      const fw = floyd(g)
      const comps = components(g)
      expect(comps.flat().length).toBe(g.n)
      for (const c of comps) for (const a of c) for (const b of c) expect(fw[a][b]).not.toBeNull()
    }
  })
})
