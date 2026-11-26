// 2×2 transformations and general matrix products.
export type M2 = [[number, number], [number, number]]
export type V2 = [number, number]
export type Mat = number[][]

export const apply = (m: M2, v: V2): V2 => [m[0][0] * v[0] + m[0][1] * v[1], m[1][0] * v[0] + m[1][1] * v[1]]
export const det = (m: M2) => m[0][0] * m[1][1] - m[0][1] * m[1][0]
export const trace = (m: M2) => m[0][0] + m[1][1]
export const mul2 = (a: M2, b: M2): M2 => [
  [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],
  [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]],
]
export function inverse(m: M2): M2 | null {
  const d = det(m)
  if (Math.abs(d) < 1e-9) return null
  return [[m[1][1] / d, -m[0][1] / d], [-m[1][0] / d, m[0][0] / d]]
}

export interface Eigen {
  /** Real eigenvalues (one or two), or empty when they are complex. */
  values: number[]
  vectors: V2[]
  complex: { re: number; im: number } | null
  /** Every vector is an eigenvector (a scalar matrix). */
  everyVector: boolean
}

export function eigen(m: M2): Eigen {
  const [[a, b], [c, d]] = m
  const tr = a + d
  const dt = det(m)
  const disc = tr * tr - 4 * dt
  if (disc < -1e-12) return { values: [], vectors: [], complex: { re: tr / 2, im: Math.sqrt(-disc) / 2 }, everyVector: false }
  const s = Math.sqrt(Math.max(0, disc))
  const l1 = (tr + s) / 2
  const l2 = (tr - s) / 2
  const norm = (v: V2): V2 => { const n = Math.hypot(v[0], v[1]); return [v[0] / n, v[1] / n] }
  const vecFor = (l: number): V2 => {
    const cands: V2[] = [[b, l - a], [l - d, c]]
    for (const v of cands) if (Math.hypot(v[0], v[1]) > 1e-9) return norm(v)
    return Math.abs(a - l) <= Math.abs(d - l) ? [1, 0] : [0, 1]
  }
  if (s < 1e-9) {
    if (Math.abs(b) < 1e-12 && Math.abs(c) < 1e-12) return { values: [l1], vectors: [[1, 0], [0, 1]], complex: null, everyVector: true }
    return { values: [l1], vectors: [vecFor(l1)], complex: null, everyVector: false }
  }
  return { values: [l1, l2], vectors: [vecFor(l1), vecFor(l2)], complex: null, everyVector: false }
}

export const rotation = (deg: number): M2 => {
  const t = (deg * Math.PI) / 180
  return [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]]
}

export interface Preset { id: string; label: string; m: M2 }
export const PRESETS: Preset[] = [
  { id: 'id', label: 'Identity', m: [[1, 0], [0, 1]] },
  { id: 'stretch', label: 'Stretch x by 2', m: [[2, 0], [0, 1]] },
  { id: 'rot45', label: 'Rotate 45°', m: rotation(45) },
  { id: 'shear', label: 'Shear', m: [[1, 1], [0, 1]] },
  { id: 'flip', label: 'Reflect in the x-axis', m: [[1, 0], [0, -1]] },
  { id: 'proj', label: 'Squash onto the x-axis', m: [[1, 0], [0, 0]] },
  { id: 'swap', label: 'Swap x and y', m: [[0, 1], [1, 0]] },
]

export function describe(m: M2): string {
  const d = det(m)
  const near = (x: number, y: number) => Math.abs(x - y) < 1e-6
  const [[a, b], [c, e]] = m
  if (near(a, 1) && near(e, 1) && near(b, 0) && near(c, 0)) return 'The identity: nothing moves.'
  if (Math.abs(d) < 1e-9) return 'Singular: the whole plane is squashed onto a line (or a point), so information is lost and there is no inverse.'
  const orth = near(a * a + c * c, 1) && near(b * b + e * e, 1) && near(a * b + c * e, 0)
  if (orth && d > 0) return `A rotation by about ${((Math.atan2(c, a) * 180) / Math.PI).toFixed(0)}°: lengths and areas are kept.`
  if (orth && d < 0) return 'A reflection: lengths are kept, but left and right swap.'
  if (near(b, 0) && near(c, 0)) return 'A scaling along the axes.'
  if (near(a, e) && near(c, 0) && !near(b, 0)) return 'A shear: slides each row sideways in proportion to its height.'
  return d > 0 ? 'A general linear map: stretches and turns, keeping orientation.' : 'A general linear map that also flips orientation.'
}

/* ---------- Rectangular products ---------- */
export function matMul(a: Mat, b: Mat): Mat {
  return a.map((row) => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)))
}
export function mulTerms(a: Mat, b: Mat, i: number, j: number) {
  const terms = a[i].map((v, k) => ({ left: v, right: b[k][j] }))
  return { terms, sum: terms.reduce((s, t) => s + t.left * t.right, 0) }
}

/** Area of the image of the unit square (shoelace), to check against |det|. */
export function unitSquareArea(m: M2): number {
  const pts = [[0, 0], [1, 0], [1, 1], [0, 1]].map((p) => apply(m, p as V2))
  let s = 0
  for (let i = 0; i < 4; i++) { const [x1, y1] = pts[i]; const [x2, y2] = pts[(i + 1) % 4]; s += x1 * y2 - x2 * y1 }
  return Math.abs(s) / 2
}
