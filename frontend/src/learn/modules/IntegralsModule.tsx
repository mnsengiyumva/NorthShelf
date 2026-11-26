import { useMemo, useState } from 'react'
import { btnSecondary } from '../../ui'
import ModuleShell, { Card, Section } from '../components/ModuleShell'
import { ChoiceQuestion, NumberQuestion } from '../components/Questions'
import FunctionInput from '../components/FunctionInput'
import Plot from '../components/Plot'
import { span } from '../engines/custom'
import { fmt } from '../engines/derivatives'
import { accumulate, errorTable, INT_FUNCTIONS, looksIntegrable, riemann, RULE_NAME, RULE_ORDER, simpson, slices, type Rule } from '../engines/integrals'
import { parseExpr } from '../engines/expr'
import { moduleBySlug } from '../modules'
import { curvePath } from '../plotUtils'

const meta = moduleBySlug('integrals')!

interface Cur { id: string; label: string; f: (x: number) => number; exact: (a: number, b: number) => number; exactIsReference: boolean; domain: [number, number]; yRange: [number, number]; note?: string }

const sig = (v: number) => (v === 0 ? '0' : Math.abs(v) < 1e-4 || Math.abs(v) >= 1e6 ? v.toExponential(2) : String(Number(v.toPrecision(4))))

export default function IntegralsModule() {
  const first = INT_FUNCTIONS[0]
  const [fnId, setFnId] = useState(first.id)
  const [custom, setCustom] = useState<Cur | null>(null)
  const [a, setA] = useState(first.a)
  const [b, setB] = useState(first.b)
  const [n, setN] = useState(4)
  const [rule, setRule] = useState<Rule>('left')
  const [x, setX] = useState(first.a + 1)

  const preset = INT_FUNCTIONS.find((k) => k.id === fnId)
  const cur: Cur = (fnId === 'custom' && custom) || (preset ? { id: preset.id, label: preset.label, f: preset.f, exact: (p, q) => preset.F(q) - preset.F(p), exactIsReference: false, domain: preset.domain, yRange: preset.yRange, note: preset.note } : custom!)
  const [dlo, dhi] = cur.domain
  const minSpan = (dhi - dlo) / 20
  const aa = Math.min(Math.max(a, dlo), dhi - minSpan)
  const bb = Math.max(Math.min(b, dhi), aa + minSpan)
  const xx = Math.min(Math.max(x, aa), dhi)

  const pick = (id: string) => {
    const p = INT_FUNCTIONS.find((k) => k.id === id)!
    setFnId(id); setA(p.a); setB(p.b); setX(p.a + (p.b - p.a) / 2)
  }

  const exact = cur.exact(aa, bb)
  const sum = riemann(cur.f, aa, bb, n, rule)
  const err = sum - exact
  const ok = Number.isFinite(sum) && looksIntegrable(cur.f, aa, bb)
  const sl = useMemo(() => slices(cur.f, aa, bb, n, rule), [cur, aa, bb, n, rule])
  const table = useMemo(() => (ok ? errorTable(cur.f, aa, bb, exact) : []), [cur, aa, bb, exact, ok])
  const ratio = (r: Rule) => {
    const t = table.at(-2), u = table.at(-1)
    if (!t || !u || u.errors[r] < 1e-13 || t.errors[r] < 1e-13) return '—'
    return (t.errors[r] / u.errors[r]).toFixed(1)
  }

  const [guess, setGuess] = useState<null | 'over' | 'under' | 'close'>(null)
  const truth: 'over' | 'under' | 'close' = Math.abs(err) <= 0.005 * Math.max(Math.abs(exact), 1e-9) ? 'close' : err > 0 ? 'over' : 'under'

  // accumulation
  const xs = useMemo(() => Array.from({ length: 160 }, (_, i) => aa + ((dhi - aa) * i) / 159), [aa, dhi])
  const acc = useMemo(() => accumulate(cur.f, aa, xs), [cur, aa, xs])
  const accRange = span(acc, 0.12, 1)
  const Ax = accumulate(cur.f, aa, [xx])[0]
  const h = (dhi - aa) / 400
  const [aLo, aHi] = accumulate(cur.f, aa, [Math.max(aa, xx - h), Math.min(dhi, xx + h)], 400)
  const slopeA = (aHi - aLo) / (Math.min(dhi, xx + h) - Math.max(aa, xx - h))

  const key = `${fnId}-${custom?.label ?? ''}-${aa.toFixed(3)}-${bb.toFixed(3)}-${n}-${rule}`

  return (
    <ModuleShell meta={meta}>
      <Section title="1. Slice the area">
        <p className="max-w-3xl text-soft">
          The integral of f from a to b is the area between the curve and the x-axis, with area below the axis counted as negative. To find it, cut the region into n thin slices, find each slice’s area, and add. More slices means a better answer.
        </p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Function">
          {INT_FUNCTIONS.map((k) => (
            <button key={k.id} type="button" aria-pressed={fnId === k.id} className={`${btnSecondary} ${fnId === k.id ? '!border-brand !bg-brand-soft' : ''}`} onClick={() => pick(k.id)}>{k.label}</button>
          ))}
        </div>
        <div className="mt-3">
          <FunctionInput
            examples={['x^2 - 2x', 'sqrt(x)', 'cos(x) + 1', 'e^(-x^2)', '1/(1+x^2)']}
            initial={{ text: 'e^(-x^2)', xmin: -2, xmax: 2, a: 0 }}
            onApply={(v) => {
              const f = parseExpr(v.text)
              const ys = Array.from({ length: 300 }, (_, i) => f(v.xmin + ((v.xmax - v.xmin) * i) / 299))
              if (!ys.some(Number.isFinite)) throw new Error('This function has no real values on that range. Try a different range.')
              setCustom({ id: 'custom', label: v.text.trim(), f, exact: (p, q) => simpson(f, p, q), exactIsReference: true, domain: [v.xmin, v.xmax], yRange: span([...ys, 0], 0.12, 1), note: 'For your own function the “exact” value is a very accurate numerical reference.' })
              setFnId('custom')
              const r = v.xmax - v.xmin
              setA(v.xmin + 0.1 * r); setB(v.xmax - 0.1 * r); setX(v.xmin + 0.5 * r)
            }}
          />
        </div>

        <Card className="mt-4">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <label className="text-sm text-soft">a = <strong className="text-ink">{fmt(aa, 2)}</strong>
              <input type="range" min={dlo} max={dhi - minSpan} step={(dhi - dlo) / 200} value={aa} onChange={(e) => setA(Number(e.target.value))} className="mt-1 block w-40 accent-[var(--brand)]" /></label>
            <label className="text-sm text-soft">b = <strong className="text-ink">{fmt(bb, 2)}</strong>
              <input type="range" min={dlo + minSpan} max={dhi} step={(dhi - dlo) / 200} value={bb} onChange={(e) => setB(Number(e.target.value))} className="mt-1 block w-40 accent-[var(--brand)]" /></label>
            <label className="text-sm text-soft">Slices n = <strong className="text-ink">{n}</strong>
              <input type="range" min={1} max={100} value={n} onChange={(e) => setN(Number(e.target.value))} className="mt-1 block w-40 accent-[var(--brand)]" /></label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Slice rule">
            {RULE_ORDER.map((r) => (
              <button key={r} type="button" aria-pressed={rule === r} className={`${btnSecondary} ${rule === r ? '!border-brand !bg-brand-soft' : ''}`} onClick={() => setRule(r)}>{RULE_NAME[r]}</button>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">{rule === 'left' ? 'Each slice’s height is the curve’s height at its left edge.' : rule === 'right' ? 'Each slice’s height is the curve’s height at its right edge.' : rule === 'mid' ? 'Each slice’s height is the curve’s height at its middle.' : 'Each slice is a trapezoid joining the curve’s heights at both edges.'}</p>

          <div className="mt-3">
            <Plot xDomain={cur.domain} yDomain={cur.yRange} label={`Graph of ${cur.label} with ${n} slices`}>
              {({ sx, sy, x0, x1, y0, y1 }) => (
                <>
                  {ok && sl.map((s, i) => {
                    const neg = (s.y0 + s.y1) / 2 < 0
                    return <polygon key={i} points={`${sx(s.x0)},${sy(0)} ${sx(s.x0)},${sy(s.y0)} ${sx(s.x1)},${sy(s.y1)} ${sx(s.x1)},${sy(0)}`} className={neg ? 'fill-warn-soft stroke-warn' : 'fill-brand-soft stroke-brand'} opacity="0.85" strokeWidth={n > 50 ? 0.4 : 1.2} />
                  })}
                  <line x1={sx(aa)} x2={sx(aa)} y1={sy(y1)} y2={sy(y0)} strokeDasharray="4 4" className="stroke-muted" />
                  <line x1={sx(bb)} x2={sx(bb)} y1={sy(y1)} y2={sy(y0)} strokeDasharray="4 4" className="stroke-muted" />
                  <path d={curvePath(cur.f, x0, x1, y0, y1, sx, sy, 600)} fill="none" strokeWidth="2.5" className="stroke-ink" />
                </>
              )}
            </Plot>
          </div>

          {!ok ? (
            <p role="alert" className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">This function is undefined or blows up somewhere between a and b, so the area is not a finite number you can trust here. Move a and b to avoid the problem.</p>
          ) : (
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3" aria-live="polite">
              <p className="text-soft">Sum of slices: <strong className="text-lg tabular-nums text-ink">{sig(sum)}</strong></p>
              <p className="text-soft">{cur.exactIsReference ? 'Accurate value' : 'Exact area'}: <strong className="text-lg tabular-nums text-ink">{sig(exact)}</strong></p>
              <p className="text-soft">Error: <strong className={`text-lg tabular-nums ${Math.abs(err) < 0.005 * Math.max(1e-9, Math.abs(exact)) ? 'text-ok' : 'text-warn'}`}>{err > 0 ? '+' : ''}{sig(err)}</strong></p>
            </div>
          )}
          {cur.note && <p className="mt-1 text-xs text-muted">{cur.note}</p>}
        </Card>

        {ok && (
          <Card className="mt-4">
            <p className="font-medium text-ink">Predict first: is this sum an over-estimate, an under-estimate, or about right?</p>
            <div key={key} className="mt-2 flex flex-wrap gap-2">
              {([['over', 'Too big'], ['under', 'Too small'], ['close', 'About right (within 0.5%)']] as const).map(([k, label]) => (
                <button key={k} type="button" className={`${btnSecondary} ${guess === k ? '!border-brand !bg-brand-soft' : ''}`} onClick={() => setGuess(k)} aria-pressed={guess === k}>{label}</button>
              ))}
            </div>
            {guess && (
              <p className="mt-2 text-sm" aria-live="polite">
                {guess === truth ? <span className="font-semibold text-ok">✓ Right. </span> : <span className="font-semibold text-warn">✗ Not quite: it is {truth === 'over' ? 'too big' : truth === 'under' ? 'too small' : 'about right'}. </span>}
                <span className="text-soft">Change the rule, slices or function and predict again. Hint: for an increasing curve, which edge of each slice is higher?</span>
              </p>
            )}
          </Card>
        )}
      </Section>

      {ok && (
        <Section title="2. How fast does the error shrink?">
          <Card>
            <p className="text-sm text-soft">Error = |sum − exact| for the function and interval above, as the number of slices doubles each time.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-96 border-collapse text-sm">
                <thead><tr className="border-b border-line-strong text-left text-ink"><th className="py-1.5 pr-4">n</th>{RULE_ORDER.map((r) => <th key={r} className="py-1.5 pr-4">{RULE_NAME[r]}</th>)}</tr></thead>
                <tbody>
                  {table.map((row) => (
                    <tr key={row.n} className="border-b border-line text-soft tabular-nums">
                      <td className="py-1.5 pr-4 font-medium text-ink">{row.n}</td>
                      {RULE_ORDER.map((r) => <td key={r} className="py-1.5 pr-4">{sig(row.errors[r])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-ink">When n doubles from 32 to 64, the error is divided by about: {RULE_ORDER.map((r) => `${RULE_NAME[r].toLowerCase()} ${ratio(r)}`).join(' · ')}.</p>
            <p className="mt-1 text-sm text-soft">Left and right errors typically halve, and midpoint and trapezoid errors typically fall to a quarter. Same effort, much faster improvement. (If a ratio looks odd, your function may have a corner or a jump, where these rules lose their advantage.)</p>
          </Card>
        </Section>
      )}

      <Section title="3. Area so far, and why integrals and derivatives are opposites">
        <Card>
          <p className="text-sm text-soft">Let A(x) be the area from a up to x. Drag x: the right graph plots A(x) as it grows. Look at how steeply A is rising at each x, and compare with the height of f.</p>
          <label className="mt-3 block text-sm text-soft">x = <strong className="text-ink">{fmt(xx, 2)}</strong>
            <input type="range" min={aa} max={dhi} step={(dhi - aa) / 300} value={xx} onChange={(e) => setX(Number(e.target.value))} className="mt-1 block w-64 accent-[var(--brand)]" /></label>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-ink">f(x) with the area from a to x shaded</p>
              <Plot xDomain={[aa, dhi]} yDomain={cur.yRange} label="Area under f from a to x">
                {({ sx, sy, x0, x1, y0, y1 }) => {
                  const pts = Array.from({ length: 80 }, (_, i) => aa + ((xx - aa) * i) / 79).map((t) => [t, cur.f(t)] as const).filter(([, v]) => Number.isFinite(v))
                  return (
                    <>
                      {pts.length > 1 && <polygon points={`${sx(aa)},${sy(0)} ${pts.map(([t, v]) => `${sx(t)},${sy(v)}`).join(' ')} ${sx(pts.at(-1)![0])},${sy(0)}`} className="fill-brand-soft stroke-brand" opacity="0.85" />}
                      <path d={curvePath(cur.f, x0, x1, y0, y1, sx, sy, 400)} fill="none" strokeWidth="2.5" className="stroke-ink" />
                      <line x1={sx(xx)} x2={sx(xx)} y1={sy(0)} y2={sy(cur.f(xx))} strokeWidth="3" className="stroke-warn" />
                    </>
                  )
                }}
              </Plot>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-ink">A(x), the area so far</p>
              <Plot xDomain={[aa, dhi]} yDomain={accRange} label="Accumulated area A(x)">
                {({ sx, sy }) => (
                  <>
                    <polyline points={xs.map((t, i) => `${sx(t)},${sy(acc[i])}`).join(' ')} fill="none" strokeWidth="2.5" className="stroke-ok" />
                    <circle cx={sx(xx)} cy={sy(Ax)} r="5.5" className="fill-ok stroke-surface" strokeWidth="2" />
                  </>
                )}
              </Plot>
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3" aria-live="polite">
            <p className="text-soft">Area so far A(x): <strong className="tabular-nums text-ink">{fmt(Ax, 3)}</strong></p>
            <p className="text-soft">Height of f at x: <strong className="tabular-nums text-ink">{fmt(cur.f(xx), 3)}</strong></p>
            <p className="text-soft">Steepness of A at x: <strong className="tabular-nums text-ink">{fmt(slopeA, 3)}</strong></p>
          </div>
          <p className="mt-2 text-sm text-soft">The steepness of A matches the height of f. Where f is positive, A climbs. Where f is negative, A falls. Where f is zero, A is flat. This is the Fundamental Theorem of Calculus: the derivative of the area-so-far function is f itself.</p>
        </Card>
      </Section>

      <Section title="Check your understanding">
        <div className="space-y-4">
          <NumberQuestion number={1} prompt={<>Use a left Riemann sum with n = 2 slices for f(x) = x on [0, 2]. What is the sum?</>} answer={1} tolerance={0} hint="Each slice has width 1. The heights are f(0) and f(1)." explain={<>Width 1 × (f(0) + f(1)) = 1 × (0 + 1) = 1. The exact area is 2, so the left sum is an under-estimate for this increasing function.</>} />
          <NumberQuestion number={2} prompt={<>What is the exact area under f(x) = x² from 0 to 1? Give a decimal to 2 places.</>} answer={0.33} tolerance={0.01} hint="Try the x² function with a = 0, b = 1 and many slices." explain={<>The area is 1/3 ≈ 0.333. A single right-endpoint slice would give 1, which is three times too big, showing why more slices matter.</>} />
          <ChoiceQuestion number={3} prompt="f is increasing on [a, b]. A left-endpoint Riemann sum is…" options={['Always an under-estimate', 'Always an over-estimate', 'Always exact', 'Sometimes over and sometimes under, with no pattern']} answer={0} hint="On each slice, the left edge is where the curve is lowest." explain={<>On every slice the left edge has the smallest height, so each rectangle is too short. For a decreasing function the reverse holds.</>} />
          <ChoiceQuestion number={4} prompt="You double the number of slices for the midpoint rule on a smooth function. Roughly how does the error change?" options={['It stays the same', 'It halves', 'It drops to about a quarter', 'It doubles']} answer={2} hint="Look at the ratio line in the error table." explain={<>Midpoint and trapezoid errors scale like 1/n², so doubling n divides the error by about 4. Left and right errors scale like 1/n and only halve.</>} />
          <ChoiceQuestion number={5} prompt="Why is the integral of sin x from 0 to 2π equal to 0?" options={['sin x is zero at both ends', 'The area above the axis and the area below it are equal, and the area below counts as negative', 'Integrals of periodic functions are always 0', 'Because the slices are too thin']} answer={1} hint="Move b past π with the sin x function and watch the colours." explain={<>The hump above the axis has area 2 and the hump below has area −2, so they cancel. (Not every periodic function does this: sin x + 1 does not.)</>} />
          <ChoiceQuestion number={6} prompt="A(x) is the area under f from a to x. What is the derivative A′(x)?" options={['A(x)', 'f(x)', 'f′(x)', '0']} answer={1} hint="Compare “steepness of A” and “height of f” in the last section." explain={<>The rate at which the accumulated area grows at x is the height of the curve there, so A′(x) = f(x).</>} />
        </div>
      </Section>
    </ModuleShell>
  )
}
