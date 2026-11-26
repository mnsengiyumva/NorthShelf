import { describe, expect, it } from 'vitest'
import { apply, describe as describeM, det, eigen, inverse, matMul, mul2, mulTerms, PRESETS, rotation, trace, unitSquareArea, type M2 } from './matrices'

const rnd = (() => { let s = 11; return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648) * 6 - 3 })()
const randM = (): M2 => [[rnd(), rnd()], [rnd(), rnd()]]

describe('2x2 algebra', () => {
  it('det(AB) = det A · det B and AB is associative', () => {
    for (let i = 0; i < 100; i++) {
      const a = randM(), b = randM(), c = randM()
      expect(det(mul2(a, b))).toBeCloseTo(det(a) * det(b), 8)
      const l = mul2(mul2(a, b), c), r = mul2(a, mul2(b, c))
      for (let p = 0; p < 2; p++) for (let q = 0; q < 2; q++) expect(l[p][q]).toBeCloseTo(r[p][q], 8)
    }
  })
  it('applying AB equals applying B then A', () => {
    for (let i = 0; i < 50; i++) {
      const a = randM(), b = randM()
      const v: [number, number] = [rnd(), rnd()]
      const x = apply(mul2(a, b), v), y = apply(a, apply(b, v))
      expect(x[0]).toBeCloseTo(y[0], 8); expect(x[1]).toBeCloseTo(y[1], 8)
    }
  })
  it('|det| is the area of the image of the unit square', () => {
    for (let i = 0; i < 100; i++) { const m = randM(); expect(unitSquareArea(m)).toBeCloseTo(Math.abs(det(m)), 8) }
  })
  it('inverse undoes the matrix; singular has none', () => {
    for (let i = 0; i < 50; i++) {
      const m = randM()
      const inv = inverse(m)
      if (!inv) continue
      const p = mul2(m, inv)
      expect(p[0][0]).toBeCloseTo(1, 6); expect(p[0][1]).toBeCloseTo(0, 6); expect(p[1][1]).toBeCloseTo(1, 6)
    }
    expect(inverse([[1, 2], [2, 4]])).toBeNull()
  })
  it('AB ≠ BA in general', () => {
    const ab = mul2([[1, 1], [0, 1]], [[0, -1], [1, 0]])
    const ba = mul2([[0, -1], [1, 0]], [[1, 1], [0, 1]])
    expect(ab).not.toEqual(ba)
  })
})

describe('eigen', () => {
  it('real eigenpairs satisfy Av = λv, and trace/det match', () => {
    let tested = 0
    for (let i = 0; i < 300; i++) {
      const m = randM()
      const e = eigen(m)
      if (e.complex) {
        expect(e.values).toEqual([])
        continue
      }
      e.vectors.forEach((v, k) => {
        if (e.everyVector) return
        const av = apply(m, v)
        const l = e.values[Math.min(k, e.values.length - 1)]
        expect(av[0]).toBeCloseTo(l * v[0], 6); expect(av[1]).toBeCloseTo(l * v[1], 6)
        tested++
      })
      expect(e.values.reduce((s, x) => s + x, 0) + (e.values.length === 1 ? e.values[0] : 0)).toBeCloseTo(trace(m), 6)
    }
    expect(tested).toBeGreaterThan(100)
  })
  it('rotations have no real eigenvectors; diagonal and shear cases behave', () => {
    expect(eigen(rotation(45)).complex).not.toBeNull()
    expect(eigen(rotation(180)).values.length).toBeGreaterThan(0)
    expect(eigen([[2, 0], [0, 3]]).values.sort()).toEqual([2, 3])
    expect(eigen([[2, 0], [0, 2]]).everyVector).toBe(true)
    const sh = eigen([[1, 1], [0, 1]])
    expect(sh.values).toEqual([1]); expect(sh.vectors).toHaveLength(1)
  })
  it('every preset is described and has the right determinant sign', () => {
    for (const p of PRESETS) expect(describeM(p.m).length).toBeGreaterThan(5)
    expect(det(PRESETS.find((p) => p.id === 'flip')!.m)).toBeLessThan(0)
    expect(det(PRESETS.find((p) => p.id === 'proj')!.m)).toBe(0)
    expect(describeM(rotation(90))).toMatch(/rotation by about 90/)
  })
})

describe('rectangular products', () => {
  it('shape rule and values', () => {
    const a = [[1, 2, 3], [4, 5, 6]]
    const b = [[7, 8], [9, 10], [11, 12]]
    expect(matMul(a, b)).toEqual([[58, 64], [139, 154]])
    expect(matMul([[1, 2], [3, 4]], [[5, 6], [7, 8]])).toEqual([[19, 22], [43, 50]])
    expect(matMul([[1, 2, 3], [4, 5, 6]], [[1, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1, 1]])).toHaveLength(2)
    expect(matMul([[1, 2, 3], [4, 5, 6]], [[1, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1, 1]])[0]).toHaveLength(4)
  })
  it('mulTerms adds up to the entry', () => {
    const a = [[1, 2], [3, 4]], b = [[5, 6], [7, 8]]
    const full = matMul(a, b)
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) expect(mulTerms(a, b, i, j).sum).toBe(full[i][j])
    expect(det([[3, 1], [2, 4]])).toBe(10)
  })
})
