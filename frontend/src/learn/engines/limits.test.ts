import { describe, expect, it } from 'vitest'
import { approachTable, bestDelta, CASES, deltaWorks } from './limits'

const near = (a: number, b: number, tol = 1e-3) => Math.abs(a - b) < tol

describe('limit cases tell the truth', () => {
  for (const c of CASES) {
    it(`${c.id}: numbers near ${c.a} agree with the stated kind`, () => {
      const l = c.f(c.a - 1e-7)
      const r = c.f(c.a + 1e-7)
      if (c.kind === 'continuous' || c.kind === 'removable') {
        expect(near(l, c.limit!)).toBe(true)
        expect(near(r, c.limit!)).toBe(true)
      } else if (c.kind === 'jump') {
        expect(near(l, c.left!)).toBe(true)
        expect(near(r, c.right!)).toBe(true)
        expect(c.limit).toBeNull()
      } else if (c.kind === 'infinite') {
        expect(Math.abs(l)).toBeGreaterThan(1e5)
        expect(Math.abs(r)).toBeGreaterThan(1e5)
      } else {
        const ys = Array.from({ length: 2000 }, (_, i) => c.f(1e-3 + i * 1e-6))
        expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(1.5)
      }
    })

    it(`${c.id}: f(a) matches the stated value`, () => {
      const fa = c.f(c.a)
      if (c.fa === null) expect(Number.isNaN(fa)).toBe(true)
      else expect(fa).toBe(c.fa)
      if (c.kind === 'continuous') expect(c.fa).toBe(c.limit)
      if (c.id === 'wrong') expect(c.fa).not.toBe(c.limit)
    })
  }

  it('epsilon-delta: the best delta really is the boundary', () => {
    const sinc = CASES.find((c) => c.id === 'sinc')!
    const hole = CASES.find((c) => c.id === 'hole')!
    const squeeze = CASES.find((c) => c.id === 'squeeze')!
    expect(bestDelta(hole, 2, 0.1)).toBeCloseTo(0.1, 2) // |x + 1 − 2| < 0.1 ⇔ |x − 1| < 0.1
    expect(bestDelta(squeeze, 0, 0.05)).toBeGreaterThanOrEqual(0.05 - 1e-3)
    for (const [c, L, eps] of [[hole, 2, 0.1], [sinc, 1, 0.01], [squeeze, 0, 0.02]] as const) {
      const d = bestDelta(c, L, eps)
      expect(deltaWorks(c, L, eps, d * 0.99)).toBe(true)
      expect(d === 1 || !deltaWorks(c, L, eps, d * 1.2 + 1e-9)).toBe(true)
    }
  })

  it('the approach table moves toward the limit', () => {
    const rows = approachTable(CASES.find((c) => c.id === 'hole')!)
    expect(Math.abs(rows[4].left - 2)).toBeLessThan(Math.abs(rows[0].left - 2))
    expect(near(rows[4].right, 2, 1e-4)).toBe(true)
  })
})
