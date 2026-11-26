// Turn a user's expression into the Fn / LimitCase shapes the modules already understand.
// Everything derived here is a numerical estimate, and the pages say so.
import type { Fn } from './derivatives'
import type { LimitCase, LimitKind } from './limits'
import { parseExpr } from './expr'

/** Central-difference derivative. null at corners, jumps, undefined points or blow-ups. */
export function numericDerivative(f: (x: number) => number, x: number): number | null {
  const h = 1e-6 * Math.max(1, Math.abs(x))
  const y = f(x), a = f(x - h), b = f(x + h)
  if (![y, a, b].every(Number.isFinite)) return null
  const left = (y - a) / h
  const right = (b - y) / h
  const mid = (b - a) / (2 * h)
  if (Math.abs(mid) > 1e6) return null
  if (Math.abs(left - right) > 1e-3 * (1 + Math.abs(mid))) return null
  return mid
}

export function span(values: number[], pad = 0.12, minSpan = 1): [number, number] {
  const v = values.filter(Number.isFinite).sort((p, q) => p - q)
  if (v.length < 2) return [-1, 1]
  let lo = v[Math.floor(v.length * 0.02)]
  let hi = v[Math.ceil(v.length * 0.98) - 1]
  if (hi - lo < minSpan) { const m = (hi + lo) / 2; lo = m - minSpan / 2; hi = m + minSpan / 2 }
  const d = (hi - lo) * pad
  return [lo - d, hi + d]
}

export function makeCustomFn(text: string, xmin: number, xmax: number): Fn {
  const f = parseExpr(text)
  const xs = Array.from({ length: 300 }, (_, i) => xmin + ((xmax - xmin) * i) / 299)
  const ys = xs.map(f)
  if (!ys.some(Number.isFinite)) throw new Error('This function has no real values on that range. Try a different range.')
  const ds = xs.map((x) => numericDerivative(f, x) ?? NaN)
  const mid = Math.round(((xmin + xmax) / 2) * 4) / 4
  const askable = [0.25, 0.5, 0.75].map((t) => Math.round((xmin + (xmax - xmin) * t) * 4) / 4)
  const start = Number.isFinite(f(mid)) ? mid : xs[ys.findIndex(Number.isFinite)]
  return {
    id: 'custom',
    label: `f(x) = ${text.trim()}`,
    dLabel: 'f′(x) estimated numerically',
    f,
    df: (x) => numericDerivative(f, x),
    domain: [xmin, xmax],
    yRange: span(ys),
    dRange: span(ds),
    start,
    askAt: [start, ...askable].filter((x) => numericDerivative(f, x) !== null).concat([start]).slice(0, 4),
    note: 'For your own function the “exact” slope is a numerical estimate, accurate to several decimal places.',
  }
}

const near = (u: number, v: number) => Math.abs(u - v) <= 2e-3 * (1 + Math.max(Math.abs(u), Math.abs(v)))

export function makeCustomCase(text: string, xmin: number, xmax: number, a: number): LimitCase {
  const f = parseExpr(text)
  const ds = [1e-3, 1e-4, 1e-5, 1e-6]
  const side = (s: 1 | -1) => ds.map((d) => f(a + s * d))
  const L = side(-1), R = side(1)
  const settles = (v: number[]) => v.every(Number.isFinite) && near(v[2], v[3]) && near(v[1], v[2]) || (v.every(Number.isFinite) && near(v[3], v[2]) && Math.abs(v[3] - v[2]) < Math.abs(v[1] - v[0]) + 1e-9 && near(v[3], v[2]))
  const blows = (v: number[]) => v.every(Number.isFinite) && Math.abs(v[3]) > 1e3 && Math.abs(v[3]) > 2 * Math.abs(v[1])
  const lOk = settles(L), rOk = settles(R)
  const fa = f(a)
  const faVal = Number.isFinite(fa) ? fa : null
  let kind: LimitKind
  let limit: number | null = null
  let left: number | null = lOk ? L[3] : null
  let right: number | null = rOk ? R[3] : null
  let explanation: string
  if (lOk && rOk && near(L[3], R[3])) {
    limit = (L[3] + R[3]) / 2
    if (faVal !== null && near(faVal, limit)) {
      kind = 'continuous'
      explanation = 'Numerically, both sides approach the same value and f(a) matches it, so this looks continuous at a.'
    } else {
      kind = 'removable'
      explanation = faVal === null
        ? 'Both sides approach the same value, but f(a) is undefined. This looks like a hole (removable discontinuity).'
        : 'Both sides approach the same value, but f(a) is a different number. This looks like a removable discontinuity.'
    }
  } else if (lOk && rOk) {
    kind = 'jump'
    explanation = 'The two sides settle on different values, so the two-sided limit does not exist: a jump.'
  } else if (blows(L) || blows(R)) {
    kind = 'infinite'
    explanation = 'The values grow without bound near a: there is no finite limit.'
  } else {
    kind = 'oscillating'
    explanation = 'The values do not settle on one number from at least one side, so no limit appears to exist.'
  }
  const xs = Array.from({ length: 400 }, (_, i) => xmin + ((xmax - xmin) * i) / 399)
  return {
    id: 'custom',
    label: `f(x) = ${text.trim()} as x → ${a}`,
    f,
    a,
    domain: [xmin, xmax],
    yRange: span(xs.map(f), 0.15, 2),
    kind,
    limit,
    left,
    right,
    fa: faVal,
    explanation: `${explanation} (This is a numerical estimate, not a proof.)`,
  }
}
