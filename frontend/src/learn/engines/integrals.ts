// Riemann sums, error behaviour, and accumulated area.
export type Rule = 'left' | 'right' | 'mid' | 'trap'
export const RULE_NAME: Record<Rule, string> = { left: 'Left endpoints', right: 'Right endpoints', mid: 'Midpoints', trap: 'Trapezoids' }
export const RULE_ORDER: Rule[] = ['left', 'right', 'mid', 'trap']
type F = (x: number) => number

export interface Slice { x0: number; x1: number; y0: number; y1: number }

/** The shapes whose areas are added up. For rectangles y0 = y1 (the height). */
export function slices(f: F, a: number, b: number, n: number, rule: Rule): Slice[] {
  const dx = (b - a) / n
  return Array.from({ length: n }, (_, i) => {
    const x0 = a + i * dx
    const x1 = x0 + dx
    if (rule === 'trap') return { x0, x1, y0: f(x0), y1: f(x1) }
    const h = rule === 'left' ? f(x0) : rule === 'right' ? f(x1) : f((x0 + x1) / 2)
    return { x0, x1, y0: h, y1: h }
  })
}

export function riemann(f: F, a: number, b: number, n: number, rule: Rule): number {
  return slices(f, a, b, n, rule).reduce((s, sl) => s + ((sl.y0 + sl.y1) / 2) * (sl.x1 - sl.x0), 0)
}

/** A very accurate reference value (composite Simpson). */
export function simpson(f: F, a: number, b: number, n = 4000): number {
  const m = n % 2 ? n + 1 : n
  const h = (b - a) / m
  let s = f(a) + f(b)
  for (let i = 1; i < m; i++) s += f(a + i * h) * (i % 2 ? 4 : 2)
  return (s * h) / 3
}

/** Running area ∫ₐˣ f at each x in xs (xs ascending, xs[0] ≥ a), by fine trapezoids. */
export function accumulate(f: F, a: number, xs: number[], steps = 60): number[] {
  const out: number[] = []
  let x = a
  let total = 0
  for (const target of xs) {
    const n = Math.max(1, Math.ceil(((target - x) / (xs.at(-1)! - a || 1)) * steps * 4))
    const dx = (target - x) / n
    for (let i = 0; i < n; i++) total += ((f(x + i * dx) + f(x + (i + 1) * dx)) / 2) * dx
    x = target
    out.push(total)
  }
  return out
}

export interface IntFn {
  id: string
  label: string
  f: F
  /** Exact antiderivative, so the exact area is F(b) − F(a). */
  F: (x: number) => number
  domain: [number, number]
  yRange: [number, number]
  a: number
  b: number
  note?: string
}

export const INT_FUNCTIONS: IntFn[] = [
  { id: 'square', label: 'x²', f: (x) => x * x, F: (x) => x ** 3 / 3, domain: [0, 4], yRange: [-1, 17], a: 0, b: 3 },
  { id: 'line', label: 'x', f: (x) => x, F: (x) => (x * x) / 2, domain: [0, 4], yRange: [-0.5, 4.5], a: 0, b: 4, note: 'A triangle: the exact area is easy to check by hand.' },
  { id: 'sin', label: 'sin x', f: Math.sin, F: (x) => -Math.cos(x), domain: [0, 2 * Math.PI], yRange: [-1.3, 1.3], a: 0, b: Math.PI, note: 'Move b past π: the area below the axis counts as negative.' },
  { id: 'exp', label: 'eˣ', f: Math.exp, F: Math.exp, domain: [0, 3], yRange: [-1, 21], a: 0, b: 2 },
  { id: 'recip', label: '1/x', f: (x) => 1 / x, F: Math.log, domain: [0.5, 6], yRange: [-0.3, 2.3], a: 1, b: 5 },
  { id: 'cubic', label: 'x³ − 3x', f: (x) => x ** 3 - 3 * x, F: (x) => x ** 4 / 4 - (3 * x * x) / 2, domain: [-2.5, 2.5], yRange: [-4, 4], a: -2, b: 2, note: 'Odd function over a symmetric interval: positive and negative areas cancel.' },
]

export interface ErrRow { n: number; values: Record<Rule, number>; errors: Record<Rule, number> }
export function errorTable(f: F, a: number, b: number, exact: number, ns = [1, 2, 4, 8, 16, 32, 64]): ErrRow[] {
  return ns.map((n) => {
    const values = {} as Record<Rule, number>
    const errors = {} as Record<Rule, number>
    for (const r of RULE_ORDER) {
      values[r] = riemann(f, a, b, n, r)
      errors[r] = Math.abs(values[r] - exact)
    }
    return { n, values, errors }
  })
}

/** Does f look finite and tame on [a, b]? Used to warn about typed functions. */
export function looksIntegrable(f: F, a: number, b: number): boolean {
  for (let i = 0; i <= 400; i++) {
    const v = f(a + ((b - a) * i) / 400)
    if (!Number.isFinite(v) || Math.abs(v) > 1e6) return false
  }
  return true
}
