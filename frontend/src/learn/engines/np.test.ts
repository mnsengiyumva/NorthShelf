import { describe, expect, it } from 'vitest'
import { bruteForceTSP, factorial, heldKarp, heuristicStats, humanTime, makeSubsetInstance, maskToPicked, nearestNeighbor, randomCities, solveSubsetSum, sumOfPicked, tourCount, tourLength } from './np'

describe('subset sum', () => {
  it('finds a valid subset when one exists', () => {
    const r = solveSubsetSum([3, 34, 4, 12, 5, 2], 9)
    expect(r.mask).not.toBeNull()
    expect(sumOfPicked([3, 34, 4, 12, 5, 2], maskToPicked(r.mask!, 6))).toBe(9)
  })
  it('examines all 2^n - 1 non-empty subsets when there is no solution', () => {
    const r = solveSubsetSum([2, 4, 6, 8], 7)
    expect(r.mask).toBeNull()
    expect(r.checked).toBe(15)
  })
  it('instances behave as labelled', () => {
    for (let s = 1; s <= 40; s++) {
      const n = 4 + (s % 9)
      const yes = makeSubsetInstance(n, s, true)
      const got = solveSubsetSum(yes.nums, yes.target)
      expect(got.mask).not.toBeNull()
      expect(sumOfPicked(yes.nums, maskToPicked(got.mask!, n))).toBe(yes.target)
      const no = makeSubsetInstance(n, s, false)
      expect(solveSubsetSum(no.nums, no.target).mask).toBeNull()
      expect(no.target).toBeGreaterThan(0)
    }
  })
  it('refuses sizes that would hang the browser', () => {
    expect(() => solveSubsetSum(new Array(21).fill(1), 5)).toThrow()
  })
  it('agrees with a reference on random small cases', () => {
    for (let s = 1; s <= 60; s++) {
      const nums = Array.from({ length: 6 }, (_, i) => 1 + ((s * (i + 7)) % 13))
      const target = 1 + (s % 40)
      let ref = false
      for (let m = 1; m < 64; m++) if (sumOfPicked(nums, maskToPicked(m, 6)) === target) ref = true
      expect(solveSubsetSum(nums, target).mask !== null).toBe(ref)
    }
  })
})

describe('humanTime', () => {
  it('reads sensibly', () => {
    expect(humanTime(1e-9)).toBe('under a millisecond')
    expect(humanTime(0.25)).toBe('250 ms')
    expect(humanTime(5)).toBe('5.0 seconds')
    expect(humanTime(120)).toBe('2 minutes')
    expect(humanTime(7200)).toBe('2 hours')
    expect(humanTime(86400 * 10)).toBe('10 days')
    expect(humanTime(2 ** 60 / 1e9)).toMatch(/years/)
    expect(humanTime(2 ** 100 / 1e9)).toBe('longer than the age of the universe')
  })
})

describe('travelling salesman', () => {
  it('brute force equals Held–Karp on many random maps', () => {
    for (let n = 3; n <= 8; n++) {
      for (let s = 1; s <= 6; s++) {
        const pts = randomCities(n, s * 31 + n)
        const bf = bruteForceTSP(pts)
        expect(bf.length).toBeCloseTo(heldKarp(pts), 9)
        expect(bf.length).toBeCloseTo(tourLength(pts, bf.order), 9)
        expect([...bf.order].sort((a, b) => a - b)).toEqual([...pts.keys()])
        expect(bf.checked).toBe(tourCount(n))
      }
    }
  })
  it('nearest neighbour gives a valid tour that is never shorter than optimal', () => {
    for (let s = 1; s <= 40; s++) {
      const pts = randomCities(7, s)
      const nn = nearestNeighbor(pts)
      expect([...nn].sort((a, b) => a - b)).toEqual([...pts.keys()])
      expect(tourLength(pts, nn)).toBeGreaterThanOrEqual(bruteForceTSP(pts).length - 1e-9)
    }
  })
  it('counts tours', () => {
    expect(tourCount(5)).toBe(12)
    expect(tourCount(7)).toBe(360)
    expect(factorial(5)).toBe(120)
  })
  it('heuristic statistics are consistent', () => {
    const st = heuristicStats(7, 20)
    expect(st.average).toBeGreaterThanOrEqual(1)
    expect(st.worst).toBeGreaterThanOrEqual(st.average)
    expect(st.optimalCount).toBeLessThanOrEqual(20)
  })
  it('is deterministic for a seed', () => {
    expect(randomCities(5, 3)).toEqual(randomCities(5, 3))
  })
})
