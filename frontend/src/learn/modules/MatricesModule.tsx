import { useMemo, useState } from 'react'
import { btnSecondary, fieldClass } from '../../ui'
import ModuleShell, { Card, Section } from '../components/ModuleShell'
import { ChoiceQuestion, NumberQuestion } from '../components/Questions'
import { fmt } from '../engines/derivatives'
import { apply, describe, det, eigen, inverse, matMul, mulTerms, PRESETS, trace, type Mat, type M2, type V2 } from '../engines/matrices'
import { moduleBySlug } from '../modules'

const meta = moduleBySlug('matrices')!
const S = 60, SIZE = 480, C0 = SIZE / 2, RANGE = 4

const toX = (u: number) => C0 + u * S
const toY = (v: number) => C0 - v * S

function Arrow({ from, to, cls, width = 3 }: { from: V2; to: V2; cls: string; width?: number }) {
  const [x1, y1, x2, y2] = [toX(from[0]), toY(from[1]), toX(to[0]), toY(to[1])]
  const len = Math.hypot(x2 - x1, y2 - y1)
  if (len < 2) return null
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len
  const hs = 11
  const head = `${x2},${y2} ${x2 - ux * hs - uy * hs * 0.5},${y2 - uy * hs + ux * hs * 0.5} ${x2 - ux * hs + uy * hs * 0.5},${y2 - uy * hs - ux * hs * 0.5}`
  return (
    <g className={cls}>
      <line x1={x1} y1={y1} x2={x2 - ux * 4} y2={y2 - uy * 4} strokeWidth={width} className="stroke-current" />
      <polygon points={head} className="fill-current" />
    </g>
  )
}

function Plane({ m, v, setV, showGrid, showEigen }: { m: M2; v: V2; setV: (v: V2) => void; showGrid: boolean; showEigen: boolean }) {
  const e = eigen(m)
  const img = (p: V2) => apply(m, p)
  const ks = Array.from({ length: 2 * RANGE + 1 }, (_, i) => i - RANGE)
  const drag = (ev: React.PointerEvent<SVGSVGElement>) => {
    if (!(ev.buttons & 1)) return
    const r = ev.currentTarget.getBoundingClientRect()
    const u = ((ev.clientX - r.left) / r.width) * SIZE
    const w = ((ev.clientY - r.top) / r.height) * SIZE
    const clamp = (z: number) => Math.max(-RANGE + 0.5, Math.min(RANGE - 0.5, Math.round(z * 10) / 10))
    setV([clamp((u - C0) / S), clamp(-(w - C0) / S)])
  }
  const square = [[0, 0], [1, 0], [1, 1], [0, 1]].map((p) => img(p as V2))
  const av = img(v)
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full touch-none rounded-md border border-line bg-paper" role="img" aria-label="The plane before and after the transformation"
      onPointerDown={(ev) => { ev.currentTarget.setPointerCapture(ev.pointerId); drag(ev) }} onPointerMove={drag}>
      <defs><clipPath id="plane-clip"><rect x="0" y="0" width={SIZE} height={SIZE} /></clipPath></defs>
      <g clipPath="url(#plane-clip)">
        {ks.map((k) => (
          <g key={k}>
            <line x1={toX(k)} y1={0} x2={toX(k)} y2={SIZE} className={k === 0 ? 'stroke-line-strong' : 'stroke-line'} strokeWidth={k === 0 ? 2 : 1} />
            <line x1={0} y1={toY(k)} x2={SIZE} y2={toY(k)} className={k === 0 ? 'stroke-line-strong' : 'stroke-line'} strokeWidth={k === 0 ? 2 : 1} />
          </g>
        ))}
        {showGrid && ks.map((k) => {
          const a1 = img([k, -12]), a2 = img([k, 12]), b1 = img([-12, k]), b2 = img([12, k])
          return (
            <g key={k} className="stroke-brand" opacity="0.4" strokeWidth="1.5">
              <line x1={toX(a1[0])} y1={toY(a1[1])} x2={toX(a2[0])} y2={toY(a2[1])} />
              <line x1={toX(b1[0])} y1={toY(b1[1])} x2={toX(b2[0])} y2={toY(b2[1])} />
            </g>
          )
        })}
        {showEigen && e.values.length > 0 && !e.everyVector && e.vectors.map((u, k) => (
          <line key={k} x1={toX(-12 * u[0])} y1={toY(-12 * u[1])} x2={toX(12 * u[0])} y2={toY(12 * u[1])} strokeWidth="2.5" strokeDasharray="8 6" className="stroke-warn" />
        ))}
        <rect x={toX(0)} y={toY(1)} width={S} height={S} fill="none" strokeDasharray="4 4" className="stroke-muted" />
        <polygon points={square.map((p) => `${toX(p[0])},${toY(p[1])}`).join(' ')} className="fill-brand-soft stroke-brand" opacity="0.8" strokeWidth="2" />
      </g>
      <Arrow from={[0, 0]} to={img([1, 0])} cls="text-danger" />
      <Arrow from={[0, 0]} to={img([0, 1])} cls="text-ok" />
      <Arrow from={[0, 0]} to={v} cls="text-muted" width={2.5} />
      <Arrow from={[0, 0]} to={av} cls="text-ink" width={3.5} />
      <circle cx={toX(v[0])} cy={toY(v[1])} r="9" className="cursor-grab fill-surface stroke-muted" strokeWidth="2.5" />
      <text x={toX(img([1, 0])[0]) + 6} y={toY(img([1, 0])[1]) - 6} className="fill-danger text-[13px] font-semibold">i→</text>
      <text x={toX(img([0, 1])[0]) + 6} y={toY(img([0, 1])[1]) - 6} className="fill-ok text-[13px] font-semibold">j→</text>
    </svg>
  )
}

function TransformSection({ m, setM }: { m: M2; setM: (m: M2) => void }) {
  const [txt, setTxt] = useState<string[][]>(m.map((r) => r.map((x) => fmt(x, 3))))
  const [v, setV] = useState<V2>([1.5, 1])
  const [showGrid, setShowGrid] = useState(true)
  const [showEigen, setShowEigen] = useState(true)
  // keep the text boxes in step when the matrix is set from elsewhere (presets, "send to plane")
  const shown = txt.map((r, i) => r.map((s, j) => (Math.abs(Number(s) - m[i][j]) < 1e-9 || s === '-' || s === '' ? s : fmt(m[i][j], 3))))
  const edit = (i: number, j: number, s: string) => {
    const next = shown.map((r) => [...r])
    next[i][j] = s
    setTxt(next)
    const n = Number(s)
    if (s.trim() !== '' && Number.isFinite(n)) {
      const mm = m.map((r) => [...r]) as M2
      mm[i][j] = Math.max(-5, Math.min(5, n))
      setM(mm)
    }
  }
  const preset = (p: M2) => { setM(p); setTxt(p.map((r) => r.map((x) => fmt(x, 3)))) }

  const d = det(m)
  const e = eigen(m)
  const inv = inverse(m)
  const av = apply(m, v)

  return (
    <div id="plane">
      <p className="max-w-3xl text-soft">
        A 2 × 2 matrix is a rule that moves every point of the plane. Edit the four numbers, or pick a preset, and watch the grid. Drag the grey dot to try different input vectors: the black arrow shows where the matrix sends it.
      </p>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Presets">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" className={btnSecondary} onClick={() => preset(p.m)}>{p.label}</button>
        ))}
      </div>
      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,480px)_1fr]">
        <Plane m={m} v={v} setV={setV} showGrid={showGrid} showEigen={showEigen} />
        <div className="space-y-4 text-sm">
          <Card>
            <p className="font-medium text-ink">The matrix</p>
            <div className="mt-2 inline-grid grid-cols-2 gap-2 border-x-4 border-line-strong px-3 py-1" role="group" aria-label="Matrix entries">
              {[0, 1].flatMap((i) => [0, 1].map((j) => (
                <input key={`${i}${j}`} value={shown[i][j]} onChange={(e2) => edit(i, j, e2.target.value)} inputMode="decimal" aria-label={`Row ${i + 1}, column ${j + 1}`} className={`${fieldClass} w-20 text-center tabular-nums`} />
              )))}
            </div>
            <p className="mt-2 text-soft">
              <span className="font-semibold text-danger">Column 1</span> = ({fmt(m[0][0], 2)}, {fmt(m[1][0], 2)}) is where the arrow <strong className="text-ink">i</strong> = (1, 0) lands.{' '}
              <span className="font-semibold text-ok">Column 2</span> = ({fmt(m[0][1], 2)}, {fmt(m[1][1], 2)}) is where <strong className="text-ink">j</strong> = (0, 1) lands. Everything else follows from those two.
            </p>
            <p className="mt-2 text-ink">{describe(m)}</p>
          </Card>
          <Card>
            <p className="text-soft">Input vector v = ({fmt(v[0], 1)}, {fmt(v[1], 1)})  →  Av = (<strong className="tabular-nums text-ink">{fmt(av[0], 2)}</strong>, <strong className="tabular-nums text-ink">{fmt(av[1], 2)}</strong>)</p>
            <p className="mt-2 text-soft">Determinant: <strong className="tabular-nums text-ink">{fmt(d, 3)}</strong>. The unit square’s area is multiplied by <strong className="text-ink">{fmt(Math.abs(d), 3)}</strong>{d < -1e-9 ? ', and the picture is flipped (like a mirror)' : ''}{Math.abs(d) < 1e-9 ? ': it collapses onto a line, so the matrix cannot be undone' : ''}.</p>
            <p className="mt-1 text-soft">Trace: <strong className="tabular-nums text-ink">{fmt(trace(m), 3)}</strong>. Inverse: {inv ? <>exists, <span className="tabular-nums">[[{fmt(inv[0][0], 2)}, {fmt(inv[0][1], 2)}], [{fmt(inv[1][0], 2)}, {fmt(inv[1][1], 2)}]]</span></> : 'none (determinant is 0)'}.</p>
            <p className="mt-1 text-soft">
              Eigen-directions: {e.complex ? 'none: every direction gets turned, so there are no real eigenvectors.' : e.everyVector ? `every direction is only scaled, by ${fmt(e.values[0], 3)}.` : e.values.map((l, k) => `λ = ${fmt(l, 3)} along (${fmt(e.vectors[k][0], 2)}, ${fmt(e.vectors[k][1], 2)})`).join('; ') + '.'}
            </p>
          </Card>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-ink"><input type="checkbox" checked={showGrid} onChange={(e2) => setShowGrid(e2.target.checked)} /> Show the transformed grid</label>
            <label className="flex items-center gap-2 text-ink"><input type="checkbox" checked={showEigen} onChange={(e2) => setShowEigen(e2.target.checked)} /> Show eigen-directions (dashed amber)</label>
          </div>
          <p className="text-xs text-muted">Dashed square: the original unit square. Blue square: where it lands. An eigenvector is a direction that stays on its own line: the matrix only stretches or shrinks it (try “Stretch x by 2”, then “Rotate 45°”).</p>
        </div>
      </div>
    </div>
  )
}

const SHAPES: [number, number, number][] = [[2, 2, 2], [2, 3, 2], [3, 3, 3], [2, 3, 4]]
const seedMat = (r: number, c: number, off: number): string[][] => Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => String(((i * 2 + j * 3 + off) % 5) - 1)))
const numMat = (t: string[][]): Mat => t.map((r) => r.map((s) => (Number.isFinite(Number(s)) && s.trim() !== '' ? Number(s) : 0)))

function MatrixInputs({ label, m, onChange, hiRow, hiCol }: { label: string; m: string[][]; onChange: (i: number, j: number, s: string) => void; hiRow?: number; hiCol?: number }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-ink">{label} ({m.length} × {m[0].length})</p>
      <div className="inline-block border-x-4 border-line-strong px-2 py-1">
        {m.map((row, i) => (
          <div key={i} className="flex gap-1.5 py-0.5">
            {row.map((s, j) => (
              <input key={j} value={s} onChange={(e) => onChange(i, j, e.target.value)} inputMode="numeric" aria-label={`${label} row ${i + 1} column ${j + 1}`}
                className={`${fieldClass} w-14 text-center tabular-nums ${i === hiRow || j === hiCol ? '!border-brand !bg-brand-soft' : ''}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function MultiplySection({ sendToPlane }: { sendToPlane: (m: M2) => void }) {
  const [shapeIdx, setShapeIdx] = useState(0)
  const [m, n, p] = SHAPES[shapeIdx]
  const [A, setA] = useState(() => seedMat(m, n, 1))
  const [B, setB] = useState(() => seedMat(n, p, 3))
  const [sel, setSel] = useState<[number, number]>([0, 0])

  const shape = (k: number) => { setShapeIdx(k); const [mm, nn, pp] = SHAPES[k]; setA(seedMat(mm, nn, 1)); setB(seedMat(nn, pp, 3)); setSel([0, 0]) }
  const nA = numMat(A), nB = numMat(B)
  const C = useMemo(() => matMul(nA, nB), [A, B]) // eslint-disable-line react-hooks/exhaustive-deps
  const terms = mulTerms(nA, nB, sel[0], sel[1])
  const baDefined = p === m
  const BA = baDefined ? matMul(nB, nA) : null
  const same = BA && BA.length === C.length && BA.every((r, i) => r.every((v, j) => v === C[i][j]))
  const edit = (set: (f: (t: string[][]) => string[][]) => void) => (i: number, j: number, s: string) => set((t) => t.map((r, a) => r.map((v, b) => (a === i && b === j ? s : v))))

  return (
    <div>
      <p className="max-w-3xl text-soft">
        Entry (i, j) of AB is <strong className="text-ink">row i of A dotted with column j of B</strong>: multiply matching entries and add. For two matrices to multiply, the number of <em>columns</em> of A must equal the number of <em>rows</em> of B.
      </p>
      <Card className="mt-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Shapes">
          {SHAPES.map(([a, b, c], k) => (
            <button key={k} type="button" aria-pressed={k === shapeIdx} className={`${btnSecondary} ${k === shapeIdx ? '!border-brand !bg-brand-soft' : ''}`} onClick={() => shape(k)}>{a}×{b} · {b}×{c}</button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4">
          <MatrixInputs label="A" m={A} onChange={edit(setA)} hiRow={sel[0]} />
          <span className="text-2xl text-muted" aria-hidden="true">×</span>
          <MatrixInputs label="B" m={B} onChange={edit(setB)} hiCol={sel[1]} />
          <span className="text-2xl text-muted" aria-hidden="true">=</span>
          <div>
            <p className="mb-1 text-xs font-medium text-ink">AB ({m} × {p}): click an entry</p>
            <div className="inline-block border-x-4 border-line-strong px-2 py-1">
              {C.map((row, i) => (
                <div key={i} className="flex gap-1.5 py-0.5">
                  {row.map((v, j) => (
                    <button key={j} type="button" aria-pressed={sel[0] === i && sel[1] === j} onClick={() => setSel([i, j])}
                      className={`h-10 w-14 rounded-md border text-sm font-semibold tabular-nums ${sel[0] === i && sel[1] === j ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface text-ink hover:border-brand'}`}>{v}</button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-ink" aria-live="polite">
          Entry ({sel[0] + 1}, {sel[1] + 1}) = row {sel[0] + 1} of A · column {sel[1] + 1} of B ={' '}
          <span className="tabular-nums">{terms.terms.map((t) => `${t.left}×${t.right}`).join(' + ')} = <strong>{terms.sum}</strong></span>
        </p>
        <p className="mt-1 text-xs text-muted">The shapes work because A has {n} columns and B has {n} rows. The result has A’s {m} rows and B’s {p} columns.</p>

        <div className="mt-4 border-t border-line pt-3 text-sm">
          <p className="font-medium text-ink">Does the order matter?</p>
          {BA ? (
            <>
              <p className="mt-1 text-soft">BA exists too, with shape {BA.length} × {BA[0].length}: <span className="tabular-nums">{BA.map((r) => `[${r.join(', ')}]`).join(' ')}</span>.</p>
              <p className={`mt-1 font-semibold ${same ? 'text-ok' : 'text-warn'}`}>{same ? 'Here AB = BA, which is a coincidence. It is the exception, not the rule.' : BA.length === C.length ? '✗ AB ≠ BA. Matrix multiplication is not commutative.' : `✗ AB is ${C.length}×${C[0].length} and BA is ${BA.length}×${BA[0].length}: they are not even the same size.`}</p>
            </>
          ) : <p className="mt-1 text-soft">BA is not even defined here: B has {p} columns but A has {m} rows. Order matters a great deal.</p>}
          {m === 2 && p === 2 && (
            <div className="mt-3">
              <button type="button" className={btnSecondary} onClick={() => { sendToPlane([[C[0][0], C[0][1]], [C[1][0], C[1][1]]]); document.getElementById('plane')?.scrollIntoView({ behavior: 'smooth' }) }}>Show AB on the plane</button>
              <p className="mt-1 text-xs text-muted">AB means “apply B first, then A”. That is why the order matters: turning then stretching is not the same as stretching then turning.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default function MatricesModule() {
  const [m, setM] = useState<M2>([[2, 0], [0, 1]])
  return (
    <ModuleShell meta={meta}>
      <Section title="1. A matrix moves the plane">
        <TransformSection m={m} setM={setM} />
      </Section>
      <Section title="2. Multiplying matrices">
        <MultiplySection sendToPlane={setM} />
      </Section>
      <Section title="Check your understanding">
        <div className="space-y-4">
          <NumberQuestion number={1} prompt={<>What is the determinant of the matrix with rows (3, 1) and (2, 4)?</>} answer={10} tolerance={0} hint="For a 2 × 2 matrix [[a, b], [c, d]] it is ad − bc." explain={<>3 × 4 − 1 × 2 = 10. So the unit square’s area is multiplied by 10, and orientation is kept because 10 is positive.</>} />
          <ChoiceQuestion number={2} prompt="In a 2 × 2 matrix, what do the two columns tell you?" options={['The two eigenvalues', 'Where the arrows i = (1, 0) and j = (0, 1) are sent', 'The determinant and the trace', 'The inverse']} answer={1} hint="Edit one number and see which arrow moves." explain={<>Column 1 is the image of (1, 0) and column 2 is the image of (0, 1). Since every vector is a combination of those two, the columns determine the whole transformation.</>} />
          <NumberQuestion number={3} prompt={<>Let A have rows (1, 2) and (3, 4), and B have rows (5, 6) and (7, 8). What is the entry in row 1, column 2 of AB?</>} answer={22} tolerance={0} hint="Row 1 of A is (1, 2). Column 2 of B is (6, 8)." explain={<>1 × 6 + 2 × 8 = 22. (The full product has rows (19, 22) and (43, 50).)</>} />
          <ChoiceQuestion number={4} prompt="A is 2 × 3 and B is 3 × 4. What happens when you compute AB?" options={['It is not defined', 'It is a 2 × 4 matrix', 'It is a 3 × 3 matrix', 'It is a 4 × 2 matrix']} answer={1} hint="The inner numbers must match; the outer numbers give the shape." explain={<>The inner sizes (3 and 3) match, so AB exists. The result keeps the outer sizes: 2 rows from A and 4 columns from B.</>} />
          <ChoiceQuestion number={5} prompt="A matrix has determinant 0. What does it do to the plane?" options={['Leaves it unchanged', 'Rotates it', 'Squashes it onto a line or a point, so it cannot be undone', 'Doubles every length']} answer={2} hint="Try “Squash onto the x-axis”. What area does the unit square have afterwards?" explain={<>Determinant 0 means areas become 0: the plane collapses. Different points land on the same spot, so there is no way to go back, and no inverse.</>} />
          <ChoiceQuestion number={6} prompt="For two 2 × 2 matrices A and B, is AB always equal to BA?" options={['Yes, always', 'No: in general the order matters', 'Only when the determinant is 1', 'Only for rotations']} answer={1} hint="Use the “Does the order matter?” panel and edit some numbers." explain={<>Matrix multiplication is generally not commutative. Doing B first and then A is a different action from A first and then B. (Special pairs, such as two rotations about the same point, do commute.)</>} />
          <ChoiceQuestion number={7} prompt="What is an eigenvector of a matrix A?" options={['A vector that A sends to the zero vector', 'A vector whose direction stays on the same line: A only stretches or shrinks it', 'A vector of length 1', 'A column of A']} answer={1} hint="Look at the dashed amber lines for “Stretch x by 2”." explain={<>If Av = λv, then A only scales v by the eigenvalue λ. On the plane, these are the lines that the transformation maps onto themselves.</>} />
        </div>
      </Section>
    </ModuleShell>
  )
}
