import { describe, expect, it } from 'vitest'
import { convergence, FUNCTIONS, forwardSlope } from './derivatives'

describe('derivative explorer', () => {
  it('the difference quotient converges to the exact derivative wherever it exists', () => {
    for (const fn of FUNCTIONS) {
      for (const x of fn.askAt) {
        const exact = fn.df(x)
        if (exact === null) continue
        for (const side of [1, -1] as const) {
          const last = convergence(fn, x, side).at(-1)!
          expect(Math.abs(last.slope - exact), `${fn.id} at ${x}`).toBeLessThan(1e-3 * (1 + Math.abs(exact)))
        }
      }
    }
  })

  it('|x| has different slopes from each side at 0 and no derivative there', () => {
    const abs = FUNCTIONS.find((f) => f.id === 'abs')!
    expect(abs.df(0)).toBeNull()
    expect(forwardSlope(abs.f, 0, 1e-5)).toBeCloseTo(1, 6)
    expect(forwardSlope(abs.f, 0, -1e-5)).toBeCloseTo(-1, 6)
  })

  it('the derivative claims shown on the page are right at known points', () => {
    const by = (id: string) => FUNCTIONS.find((f) => f.id === id)!
    expect(by('square').df(3)).toBe(6)
    expect(by('cubic').df(1)).toBe(0)
    expect(by('cubic').df(-1)).toBe(0)
    expect(by('sin').df(0)).toBe(1)
    expect(by('exp').df(0)).toBe(1)
    expect(by('ln').df(4)).toBe(0.25)
    expect(by('ln').df(-1)).toBeNull()
  })
})
