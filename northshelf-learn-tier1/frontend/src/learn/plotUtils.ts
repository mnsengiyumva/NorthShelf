/** "Nice" tick positions between lo and hi. */
export function niceTicks(lo: number, hi: number, target = 6): number[] {
  const raw = (hi - lo) / target
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  const step = (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) {
    out.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toFixed(10)))
  }
  return out
}

/**
 * SVG path for y = fn(x). The pen lifts wherever the function is undefined or off the chart,
 * so vertical asymptotes and holes are not joined by stray lines.
 */
export function curvePath(
  fn: (x: number) => number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  sx: (x: number) => number,
  sy: (y: number) => number,
  steps = 600,
): string {
  let d = ''
  let pen = false
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps
    const y = fn(x)
    if (!Number.isFinite(y) || y < y0 || y > y1) {
      pen = false
      continue
    }
    d += `${pen ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`
    pen = true
  }
  return d
}
