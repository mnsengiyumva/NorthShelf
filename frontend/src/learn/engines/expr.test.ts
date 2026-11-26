import { describe, expect, it } from 'vitest'
import { ExprError, parseExpr } from './expr'
import { makeCustomCase, makeCustomFn, numericDerivative } from './custom'

const ev = (s: string, x = 0) => parseExpr(s)(x)

describe('parseExpr', () => {
  it('does arithmetic with correct precedence', () => {
    expect(ev('1+2*3')).toBe(7)
    expect(ev('(1+2)*3')).toBe(9)
    expect(ev('2^3^2')).toBe(512)
    expect(ev('-x^2', 3)).toBe(-9)
    expect(ev('2^-1')).toBe(0.5)
    expect(ev('10-4-3')).toBe(3)
    expect(ev('8/4/2')).toBe(1)
  })
  it('supports implicit multiplication', () => {
    expect(ev('2x', 3)).toBe(6)
    expect(ev('3sin(x)', Math.PI / 2)).toBeCloseTo(3)
    expect(ev('(x+1)(x-1)', 3)).toBe(8)
    expect(ev('x sin(x)', Math.PI / 2)).toBeCloseTo(Math.PI / 2)
    expect(ev('2pi')).toBeCloseTo(2 * Math.PI)
    expect(ev('xsin(x)', Math.PI / 2)).toBeCloseTo(Math.PI / 2)
  })
  it('knows functions and constants', () => {
    expect(ev('exp(1)')).toBeCloseTo(Math.E)
    expect(ev('e^x', 2)).toBeCloseTo(Math.E ** 2)
    expect(ev('ln(e)')).toBeCloseTo(1)
    expect(ev('log(1000)')).toBeCloseTo(3)
    expect(ev('sqrt(16)')).toBe(4)
    expect(ev('abs(-3)')).toBe(3)
    expect(ev('2e3')).toBe(2000)
    expect(ev('2e')).toBeCloseTo(2 * Math.E)
    expect(ev('x**2', 4)).toBe(16)
  })
  it('turns undefined values into NaN', () => {
    expect(ev('ln(x)', -1)).toBeNaN()
    expect(ev('1/x', 0)).toBeNaN()
    expect(ev('sqrt(x)', -4)).toBeNaN()
  })
  it('gives friendly errors for bad input', () => {
    expect(() => parseExpr('')).toThrow(ExprError)
    expect(() => parseExpr('2*')).toThrow(/ends too early/)
    expect(() => parseExpr('(x+1')).toThrow(/closing bracket/)
    expect(() => parseExpr('x+1)')).toThrow(/without a matching/)
    expect(() => parseExpr('y+1')).toThrow(/Use x/)
    expect(() => parseExpr('sin x')).toThrow(/brackets/)
    expect(() => parseExpr('foo(x)')).toThrow(ExprError)
    expect(() => parseExpr('x $ 2')).toThrow(/Unexpected character/)
    expect(() => parseExpr('x'.repeat(201))).toThrow(/too long/)
    expect(() => parseExpr('('.repeat(60) + 'x' + ')'.repeat(60))).toThrow(/nested/)
  })
  it('cannot run code', () => {
    for (const bad of ['process.exit()', 'constructor', 'alert(1)', 'window', '__proto__', 'x;x', 'this', 'eval(1)', '[].map']) {
      expect(() => parseExpr(bad)).toThrow(ExprError)
    }
  })
})

describe('numeric derivative and custom cases', () => {
  it('matches known derivatives', () => {
    expect(numericDerivative((x) => x * x, 3)).toBeCloseTo(6, 4)
    expect(numericDerivative(Math.sin, 0)).toBeCloseTo(1, 5)
    expect(numericDerivative(parseExpr('x^3'), -2)).toBeCloseTo(12, 3)
  })
  it('refuses corners and undefined points', () => {
    expect(numericDerivative(Math.abs, 0)).toBeNull()
    expect(numericDerivative(parseExpr('1/x'), 0)).toBeNull()
    expect(numericDerivative(parseExpr('ln(x)'), -1)).toBeNull()
  })
  it('builds a custom Fn with sensible ranges', () => {
    const fn = makeCustomFn('x^2', -3, 3)
    expect(fn.yRange[0]).toBeLessThan(0.5)
    expect(fn.yRange[1]).toBeGreaterThan(8)
    expect(fn.df(2)).toBeCloseTo(4, 4)
    expect(fn.askAt.length).toBeGreaterThan(0)
  })
  it('rejects a range with no real values', () => {
    expect(() => makeCustomFn('ln(x)', -5, -1)).toThrow(/no real values/)
  })
  it('classifies custom limit cases', () => {
    expect(makeCustomCase('x^2', -2, 2, 1).kind).toBe('continuous')
    const hole = makeCustomCase('(x^2-1)/(x-1)', -1, 3, 1)
    expect(hole.kind).toBe('removable')
    expect(hole.limit).toBeCloseTo(2, 2)
    expect(makeCustomCase('abs(x)/x', -2, 2, 0).kind).toBe('jump')
    expect(makeCustomCase('1/x', -2, 2, 0).kind).toBe('infinite')
    expect(makeCustomCase('sin(1/x)', -1, 1, 0).kind).toBe('oscillating')
    expect(makeCustomCase('sin(x)/x', -10, 10, 0).limit).toBeCloseTo(1, 2)
  })
})
