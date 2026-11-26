// Cases for the limits and continuity explorer. Each case records what is true, and the tests
// check those claims numerically so the page cannot teach something false.
export type LimitKind = 'continuous' | 'removable' | 'jump' | 'infinite' | 'oscillating'

export interface LimitCase {
  id: string
  label: string
  f: (x: number) => number // NaN where undefined
  a: number
  domain: [number, number]
  yRange: [number, number]
  kind: LimitKind
  /** Two-sided limit L when it exists and is finite. */
  limit: number | null
  left: number | null
  right: number | null
  /** Value f(a), or null if undefined. */
  fa: number | null
  explanation: string
}

export const CASES: LimitCase[] = [
  {
    id: 'cont',
    label: 'f(x) = x³ − 2x + 1 as x → 1',
    f: (x) => x ** 3 - 2 * x + 1,
    a: 1,
    domain: [-1, 3],
    yRange: [-2, 8],
    kind: 'continuous',
    limit: 0,
    left: 0,
    right: 0,
    fa: 0,
    explanation: 'A polynomial: the limit equals the value, f(1) = 0. That is exactly what continuous means.',
  },
  {
    id: 'hole',
    label: 'f(x) = (x² − 1)/(x − 1) as x → 1',
    f: (x) => (x === 1 ? NaN : (x * x - 1) / (x - 1)),
    a: 1,
    domain: [-1, 3],
    yRange: [-1, 5],
    kind: 'removable',
    limit: 2,
    left: 2,
    right: 2,
    fa: null,
    explanation: 'For x ≠ 1 this equals x + 1, so the values approach 2. But f(1) is undefined: a hole. The limit exists; the function is not continuous there. This is a removable discontinuity.',
  },
  {
    id: 'sinc',
    label: 'f(x) = sin(x)/x as x → 0',
    f: (x) => (x === 0 ? NaN : Math.sin(x) / x),
    a: 0,
    domain: [-12, 12],
    yRange: [-0.5, 1.4],
    kind: 'removable',
    limit: 1,
    left: 1,
    right: 1,
    fa: null,
    explanation: 'Plugging in x = 0 gives 0/0, which says nothing. The values approach 1 from both sides, so the limit is 1 even though f(0) is undefined.',
  },
  {
    id: 'wrong',
    label: 'f(x) = x² for x ≠ 2, but f(2) = 7, as x → 2',
    f: (x) => (x === 2 ? 7 : x * x),
    a: 2,
    domain: [0, 4],
    yRange: [-1, 12],
    kind: 'removable',
    limit: 4,
    left: 4,
    right: 4,
    fa: 7,
    explanation: 'The limit only looks at nearby values, not at x = 2 itself. The limit is 4 even though f(2) = 7. The two disagree, so f is not continuous at 2.',
  },
  {
    id: 'jump',
    label: 'f(x) = |x|/x as x → 0',
    f: (x) => (x === 0 ? NaN : Math.abs(x) / x),
    a: 0,
    domain: [-3, 3],
    yRange: [-2, 2],
    kind: 'jump',
    limit: null,
    left: -1,
    right: 1,
    fa: null,
    explanation: 'From the left the values are −1, from the right they are +1. Both one-sided limits exist but differ, so the two-sided limit does not exist. A jump discontinuity.',
  },
  {
    id: 'pole',
    label: 'f(x) = 1/x as x → 0',
    f: (x) => (x === 0 ? NaN : 1 / x),
    a: 0,
    domain: [-3, 3],
    yRange: [-8, 8],
    kind: 'infinite',
    limit: null,
    left: null,
    right: null,
    fa: null,
    explanation: 'The values grow without bound (towards −∞ on the left and +∞ on the right). No finite number is approached, so the limit does not exist. A vertical asymptote.',
  },
  {
    id: 'osc',
    label: 'f(x) = sin(1/x) as x → 0',
    f: (x) => (x === 0 ? NaN : Math.sin(1 / x)),
    a: 0,
    domain: [-0.5, 0.5],
    yRange: [-1.5, 1.5],
    kind: 'oscillating',
    limit: null,
    left: null,
    right: null,
    fa: null,
    explanation: 'Near 0 the function swings between −1 and 1 infinitely often. It never settles on one value, so there is no limit, even though the values stay bounded.',
  },
  {
    id: 'squeeze',
    label: 'f(x) = x·sin(1/x) as x → 0',
    f: (x) => (x === 0 ? NaN : x * Math.sin(1 / x)),
    a: 0,
    domain: [-0.5, 0.5],
    yRange: [-0.6, 0.6],
    kind: 'removable',
    limit: 0,
    left: 0,
    right: 0,
    fa: null,
    explanation: 'Still oscillating, but squeezed between −|x| and |x|, which both go to 0. By the squeeze theorem the limit is 0.',
  },
]

export const KIND_LABEL: Record<LimitKind, string> = {
  continuous: 'The limit exists and equals f(a): continuous',
  removable: 'The limit exists, but f(a) is missing or different: removable discontinuity',
  jump: 'Left and right limits both exist but differ: jump discontinuity',
  infinite: 'The values grow without bound: infinite discontinuity',
  oscillating: 'The values oscillate and never settle: no limit',
}

export const KIND_ORDER: LimitKind[] = ['continuous', 'removable', 'jump', 'infinite', 'oscillating']

/** Does |f(x) − L| < eps hold for every sampled x within delta of a (x ≠ a)? */
export function deltaWorks(c: LimitCase, L: number, eps: number, delta: number, samples = 400): boolean {
  for (let i = 1; i <= samples; i++) {
    const d = (delta * i) / samples
    for (const x of [c.a - d, c.a + d]) {
      const y = c.f(x)
      if (!(Math.abs(y - L) < eps)) return false
    }
  }
  return true
}

/** Largest delta (up to maxDelta) that works for this epsilon, found by bisection. */
export function bestDelta(c: LimitCase, L: number, eps: number, maxDelta = 1): number {
  if (deltaWorks(c, L, eps, maxDelta)) return maxDelta
  let lo = 0
  let hi = maxDelta
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (deltaWorks(c, L, eps, mid)) lo = mid
    else hi = mid
  }
  return lo
}

export function approachTable(c: LimitCase, ks = [1, 2, 3, 4, 5]) {
  return ks.map((k) => {
    const d = 10 ** -k
    return { d, left: c.f(c.a - d), right: c.f(c.a + d) }
  })
}
