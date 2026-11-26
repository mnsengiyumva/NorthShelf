// Graph search with a snapshot after every step, so the page can replay BFS and DFS exactly.
export interface Graph { name: string; note: string; n: number; edges: [number, number][]; pos: { x: number; y: number }[] }
export const labelOf = (i: number) => String.fromCharCode(65 + i)

export function adjacency(g: Graph): number[][] {
  const adj: number[][] = Array.from({ length: g.n }, () => [])
  for (const [a, b] of g.edges) { adj[a].push(b); adj[b].push(a) }
  return adj.map((l) => [...new Set(l)].sort((x, y) => x - y))
}

export interface Snap {
  current: number | null
  /** BFS: the queue (front first). DFS: the call stack (bottom first). */
  frontier: number[]
  order: number[]
  discovered: number[]
  tree: [number, number][]
  /** BFS distance from the start for discovered nodes. */
  level: (number | null)[]
  /** DFS discovery and finish times. */
  disc: (number | null)[]
  fin: (number | null)[]
  note: string
}

const blank = (n: number): Snap => ({ current: null, frontier: [], order: [], discovered: [], tree: [], level: new Array(n).fill(null), disc: new Array(n).fill(null), fin: new Array(n).fill(null), note: '' })
const copy = (s: Snap): Snap => ({ ...s, frontier: [...s.frontier], order: [...s.order], discovered: [...s.discovered], tree: s.tree.map((e) => [...e] as [number, number]), level: [...s.level], disc: [...s.disc], fin: [...s.fin] })

export function bfsSnaps(g: Graph, start: number): Snap[] {
  const adj = adjacency(g)
  const s = blank(g.n)
  s.discovered = [start]
  s.level[start] = 0
  s.frontier = [start]
  s.note = `Start: put ${labelOf(start)} in the queue.`
  const out = [copy(s)]
  while (s.frontier.length) {
    const u = s.frontier.shift()!
    s.current = u
    s.order.push(u)
    const added: number[] = []
    for (const v of adj[u]) {
      if (!s.discovered.includes(v)) {
        s.discovered.push(v)
        s.level[v] = s.level[u]! + 1
        s.tree.push([u, v])
        s.frontier.push(v)
        added.push(v)
      }
    }
    s.note = `Take ${labelOf(u)} from the front of the queue and visit it. ` + (added.length ? `Add its new neighbours to the back: ${added.map(labelOf).join(', ')}.` : 'It has no new neighbours.')
    out.push(copy(s))
  }
  s.current = null
  s.note = 'The queue is empty: every node reachable from the start has been visited.'
  out.push(copy(s))
  return out
}

export function dfsSnaps(g: Graph, start: number): Snap[] {
  const adj = adjacency(g)
  const s = blank(g.n)
  const out: Snap[] = []
  let clock = 0
  const visit = (u: number, parent: number | null) => {
    s.discovered.push(u)
    s.order.push(u)
    s.disc[u] = ++clock
    s.frontier.push(u)
    s.current = u
    if (parent !== null) s.tree.push([parent, u])
    const fresh = adj[u].filter((v) => !s.discovered.includes(v))
    s.note = `Visit ${labelOf(u)}` + (parent !== null ? ` (from ${labelOf(parent)})` : ' (the start)') + '. ' + (fresh.length ? `Go deeper into the first unvisited neighbour.` : 'No unvisited neighbours.')
    out.push(copy(s))
    for (const v of adj[u]) {
      if (!s.discovered.includes(v)) visit(v, u)
    }
    s.fin[u] = ++clock
    s.frontier.pop()
    s.current = s.frontier.length ? s.frontier[s.frontier.length - 1] : null
    s.note = `${labelOf(u)} is finished: all its neighbours are visited. ` + (s.current !== null ? `Backtrack to ${labelOf(s.current)}.` : 'The stack is empty, so the search is done.')
    out.push(copy(s))
  }
  s.note = `Start the search at ${labelOf(start)}.`
  out.push(copy(s))
  visit(start, null)
  return out
}

/** Fewest edges from start to every node (null if unreachable), by BFS. */
export function bfsDistances(g: Graph, start: number): (number | null)[] {
  const last = bfsSnaps(g, start).at(-1)!
  return last.level
}

export function components(g: Graph): number[][] {
  const adj = adjacency(g)
  const seen = new Array(g.n).fill(false)
  const out: number[][] = []
  for (let s = 0; s < g.n; s++) {
    if (seen[s]) continue
    const comp: number[] = []
    const stack = [s]
    seen[s] = true
    while (stack.length) {
      const u = stack.pop()!
      comp.push(u)
      for (const v of adj[u]) if (!seen[v]) { seen[v] = true; stack.push(v) }
    }
    out.push(comp.sort((a, b) => a - b))
  }
  return out
}

/** Path from start to target following tree edges (parent → child), or null. */
export function treePath(tree: [number, number][], start: number, target: number): number[] | null {
  const parent = new Map<number, number>(tree.map(([p, c]) => [c, p]))
  const path = [target]
  while (path[0] !== start) {
    const p = parent.get(path[0])
    if (p === undefined) return null
    path.unshift(p)
  }
  return path
}

const P = (x: number, y: number) => ({ x, y })
export const GRAPH_PRESETS: Record<string, Graph> = {
  tree: {
    name: 'A tree', note: 'No loops: every node has exactly one path from the top.', n: 7,
    pos: [P(0.5, 0.1), P(0.25, 0.42), P(0.75, 0.42), P(0.12, 0.8), P(0.38, 0.8), P(0.62, 0.8), P(0.88, 0.8)],
    edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]],
  },
  loops: {
    name: 'With loops', note: 'Several routes between nodes, so the search must avoid going round in circles.', n: 7,
    pos: [P(0.08, 0.5), P(0.3, 0.15), P(0.3, 0.85), P(0.55, 0.5), P(0.78, 0.15), P(0.78, 0.85), P(0.94, 0.5)],
    edges: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6]],
  },
  grid: {
    name: 'A 3 × 3 grid', note: 'Like a map of city blocks or a game board.', n: 9,
    pos: Array.from({ length: 9 }, (_, i) => P(0.15 + 0.35 * (i % 3), 0.15 + 0.35 * Math.floor(i / 3))),
    edges: [[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8], [0, 3], [3, 6], [1, 4], [4, 7], [2, 5], [5, 8]],
  },
  split: {
    name: 'Two separate groups', note: 'Not connected: a search from one group never reaches the other.', n: 6,
    pos: [P(0.12, 0.3), P(0.35, 0.12), P(0.35, 0.6), P(0.62, 0.3), P(0.8, 0.12), P(0.88, 0.7)],
    edges: [[0, 1], [1, 2], [0, 2], [3, 4], [4, 5]],
  },
}
