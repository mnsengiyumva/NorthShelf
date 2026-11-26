// Functions for the "derivative as slope" explorer. Each has an exact derivative to compare against.
export interface Fn {
  id: string
  label: string
  dLabel: string
  f: (x: number) => number
  /** Exact derivative, or null where it does not exist. */
  df: (x: number) => number | null
  domain: [number, number]
  yRange: [number, number]
  dRange: [number, number]
  start: number
  /** Nice x-values to ask about. */
  askAt: number[]
  note?: string
}

export const FUNCTIONS: Fn[] = [
  {
    id: 'square',
    label: 'f(x) = x²',
    dLabel: "f′(x) = 2x",
    f: (x) => x * x,
    df: (x) => 2 * x,
    domain: [-3, 3],
    yRange: [-1, 9],
    dRange: [-6, 6],
    start: 1,
    askAt: [1, 2, -1, 1.5],
  },
  {
    id: 'cubic',
    label: 'f(x) = x³ − 3x',
    dLabel: 'f′(x) = 3x² − 3',
    f: (x) => x ** 3 - 3 * x,
    df: (x) => 3 * x * x - 3,
    domain: [-3, 3],
    yRange: [-6, 6],
    dRange: [-4, 12],
    start: 0.5,
    askAt: [0, 1, 2, -2],
    note: 'The slope is 0 at the turning points x = −1 and x = 1.',
  },
  {
    id: 'sin',
    label: 'f(x) = sin x',
    dLabel: 'f′(x) = cos x',
    f: Math.sin,
    df: Math.cos,
    domain: [-2 * Math.PI, 2 * Math.PI],
    yRange: [-1.6, 1.6],
    dRange: [-1.6, 1.6],
    start: 1,
    askAt: [0, Math.PI / 2, Math.PI],
    note: 'The derivative of sine looks like sine shifted: it is cosine.',
  },
  {
    id: 'exp',
    label: 'f(x) = eˣ',
    dLabel: 'f′(x) = eˣ',
    f: Math.exp,
    df: Math.exp,
    domain: [-3, 2.2],
    yRange: [-1, 9],
    dRange: [-1, 9],
    start: 0.5,
    askAt: [0, 1, 2],
    note: 'The function and its derivative are the same curve.',
  },
  {
    id: 'ln',
    label: 'f(x) = ln x',
    dLabel: 'f′(x) = 1/x',
    f: (x) => (x > 0 ? Math.log(x) : NaN),
    df: (x) => (x > 0 ? 1 / x : null),
    domain: [0.05, 6],
    yRange: [-3, 2.5],
    dRange: [-1, 10],
    start: 1,
    askAt: [1, 2, 4, 0.5],
  },
  {
    id: 'abs',
    label: 'f(x) = |x|',
    dLabel: "f′(x) = −1 for x < 0, +1 for x > 0",
    f: Math.abs,
    df: (x) => (x === 0 ? null : Math.sign(x)),
    domain: [-3, 3],
    yRange: [-0.5, 3.5],
    dRange: [-2, 2],
    start: 1,
    askAt: [2, -2, 0.5],
    note: 'Move x to 0 and look at the slope from each side: they disagree, so f′(0) does not exist.',
  },
]

export const forwardSlope = (f: (x: number) => number, x: number, h: number) => (f(x + h) - f(x)) / h

/** Difference quotients for shrinking h, from the right or the left. */
export function convergence(fn: Fn, x: number, side: 1 | -1, hs = [1, 0.1, 0.01, 0.001, 0.0001, 0.00001]) {
  return hs.map((h) => ({ h: side * h, slope: forwardSlope(fn.f, x, side * h) }))
}

export const fmt = (v: number, digits = 3) => {
  if (!Number.isFinite(v)) return '—'
  const r = Math.abs(v) < 5e-10 ? 0 : v
  return String(Number(r.toFixed(digits)))
}
