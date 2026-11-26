import { describe, expect, it } from 'vitest'
import { accumulate, errorTable, INT_FUNCTIONS, looksIntegrable, riemann, RULE_ORDER, simpson, slices } from './integrals'
import { parseExpr } from './expr'

describe('Riemann sums', () => {
  it('converge to the exact area for every preset function and rule', () => {
    for (const fn of INT_FUNCTIONS) {
      const exact = fn.F(fn.b) - fn.F(fn.a)
      for (const r of RULE_ORDER) expect(riemann(fn.f, fn.a, fn.b, 20000, r)).toBeCloseTo(exact, 1)
      expect(simpson(fn.f, fn.a, fn.b)).toBeCloseTo(exact, 8)
    }
  })
  it('midpoint and trapezoid are exact for straight lines; left/right are not', () => {
    const f = (x: number) => 3 * x + 1
    expect(riemann(f, 0, 2, 1, 'mid')).toBeCloseTo(8)
    expect(riemann(f, 0, 2, 1, 'trap')).toBeCloseTo(8)
    expect(riemann(f, 0, 2, 1, 'left')).not.toBeCloseTo(8)
  })
  it('left under-estimates increasing functions, right over-estimates, and vice versa for decreasing', () => {
    const exact = 9
    expect(riemann((x) => x * x, 0, 3, 6, 'left')).toBeLessThan(exact)
    expect(riemann((x) => x * x, 0, 3, 6, 'right')).toBeGreaterThan(exact)
    expect(riemann((x) => 1 / x, 1, 5, 6, 'left')).toBeGreaterThan(Math.log(5))
    expect(riemann((x) => 1 / x, 1, 5, 6, 'right')).toBeLessThan(Math.log(5))
  })
  it('slices add up to the same sum and cover [a, b]', () => {
    for (const r of RULE_ORDER) {
      const s = slices(Math.sin, 0.5, 2.5, 7, r)
      expect(s).toHaveLength(7)
      expect(s[0].x0).toBeCloseTo(0.5)
      expect(s[6].x1).toBeCloseTo(2.5)
      expect(s.reduce((t, k) => t + ((k.y0 + k.y1) / 2) * (k.x1 - k.x0), 0)).toBeCloseTo(riemann(Math.sin, 0.5, 2.5, 7, r))
    }
  })
  it('error scaling: left/right halve, midpoint/trapezoid quarter when n doubles', () => {
    const f = (x: number) => x * x
    const rows = errorTable(f, 0, 3, 9, [64, 128])
    expect(rows[0].errors.left / rows[1].errors.left).toBeCloseTo(2, 1)
    expect(rows[0].errors.right / rows[1].errors.right).toBeCloseTo(2, 1)
    expect(rows[0].errors.mid / rows[1].errors.mid).toBeCloseTo(4, 1)
    expect(rows[0].errors.trap / rows[1].errors.trap).toBeCloseTo(4, 1)
  })
  it('signed area: sin over [0, 2π] is 0, odd cubic over a symmetric interval is 0', () => {
    expect(simpson(Math.sin, 0, 2 * Math.PI)).toBeCloseTo(0, 8)
    expect(simpson((x) => x ** 3 - 3 * x, -2, 2)).toBeCloseTo(0, 8)
  })
  it('works with typed functions', () => {
    const f = parseExpr('x^2')
    expect(simpson(f, 0, 3)).toBeCloseTo(9, 8)
    expect(looksIntegrable(f, 0, 3)).toBe(true)
    expect(looksIntegrable(parseExpr('1/x'), -1, 1)).toBe(false)
    expect(looksIntegrable(parseExpr('ln(x)'), -1, 1)).toBe(false)
  })
})

describe('accumulation (fundamental theorem)', () => {
  it('matches F(x) − F(a) and its slope is f(x)', () => {
    for (const fn of INT_FUNCTIONS) {
      const xs = Array.from({ length: 50 }, (_, i) => fn.a + ((fn.domain[1] - fn.a) * i) / 49)
      const acc = accumulate(fn.f, fn.a, xs)
      xs.forEach((x, i) => expect(acc[i]).toBeCloseTo(fn.F(x) - fn.F(fn.a), 2))
      const x = (fn.a + fn.domain[1]) / 2
      const h = 1e-3
      const [lo, hi] = accumulate(fn.f, fn.a, [x - h, x + h], 400)
      expect((hi - lo) / (2 * h)).toBeCloseTo(fn.f(x), 2)
    }
  })
  it('numbers used in the page questions', () => {
    expect(riemann((x) => x, 0, 2, 2, 'left')).toBe(1)
    expect(riemann((x) => x * x, 0, 1, 1, 'right')).toBe(1)
    expect(simpson((x) => x * x, 0, 1)).toBeCloseTo(1 / 3, 8)
  })
})
