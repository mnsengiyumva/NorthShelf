import { useMemo, useState } from 'react'
import { btnSecondary } from '../../ui'
import ModuleShell, { Card, Section } from '../components/ModuleShell'
import { ChoiceQuestion, NumberQuestion } from '../components/Questions'
import Plot from '../components/Plot'
import { convergence, FUNCTIONS, fmt, forwardSlope } from '../engines/derivatives'
import { moduleBySlug } from '../modules'
import { curvePath } from '../plotUtils'

const meta = moduleBySlug('derivatives')!
const H_STEPS = [2, 1, 0.5, 0.25, 0.1, 0.05, 0.01, 0.001]

export default function DerivativesModule() {
  const [fnId, setFnId] = useState(FUNCTIONS[0].id)
  const fn = FUNCTIONS.find((f) => f.id === fnId)!
  const [x0, setX0] = useState(FUNCTIONS[0].start)
  const [hIdx, setHIdx] = useState(0)
  const [side, setSide] = useState<1 | -1>(1)
  const [askIdx, setAskIdx] = useState(0)
  const [guess, setGuess] = useState('')
  const [shown, setShown] = useState<'idle' | 'right' | 'wrong' | 'revealed'>('idle')

  const [lo, hi] = fn.domain
  const x = Math.min(hi, Math.max(lo, x0))
  const h = side * H_STEPS[hIdx]
  const y = fn.f(x)
  const m = forwardSlope(fn.f, x, h)
  const exact = fn.df(x)
  const x2 = x + h

  const pick = (id: string) => {
    const f = FUNCTIONS.find((k) => k.id === id)!
    setFnId(id)
    setX0(f.start)
    setAskIdx(0)
    setGuess('')
    setShown('idle')
  }

  const askX = fn.askAt[askIdx % fn.askAt.length]
  const askAnswer = fn.df(askX)
  const table = useMemo(() => convergence(fn, x, side), [fn, x, side])
  const leftS = convergence(fn, x, -1).at(-1)!.slope
  const rightS = convergence(fn, x, 1).at(-1)!.slope
  const kink = exact === null && Math.abs(leftS - rightS) > 0.5 && fn.id === 'abs'

  const checkGuess = () => {
    if (askAnswer === null) return
    setShown(Math.abs(Number(guess) - askAnswer) <= 0.06 && guess.trim() !== '' ? 'right' : 'wrong')
  }

  return (
    <ModuleShell meta={meta}>
      <Section title="Choose a function, then drag the point">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Function">
          {FUNCTIONS.map((f) => (
            <button key={f.id} type="button" onClick={() => pick(f.id)} aria-pressed={f.id === fnId} className={`${btnSecondary} ${f.id === fnId ? '!border-brand !bg-brand-soft' : ''}`}>
              {f.label.replace('f(x) = ', '')}
            </button>
          ))}
        </div>
        <p className="mt-3 text-soft">
          <strong className="text-ink">{fn.label}</strong> · derivative: <strong className="text-ink">{fn.dLabel}</strong>
          {fn.note ? <> · {fn.note}</> : null}
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
          <label className="text-sm text-soft">
            Point x = <strong className="text-ink">{fmt(x, 2)}</strong>
            <input type="range" min={lo} max={hi} step={(hi - lo) / 400} value={x} onChange={(e) => setX0(Number(e.target.value))} className="mt-1 block w-56 accent-[var(--brand)]" />
          </label>
          <label className="text-sm text-soft">
            Step size h = <strong className="text-ink">{fmt(h, 3)}</strong>
            <input type="range" min={0} max={H_STEPS.length - 1} value={hIdx} onChange={(e) => setHIdx(Number(e.target.value))} className="mt-1 block w-56 accent-[var(--brand)]" />
          </label>
          <div role="group" aria-label="Direction" className="flex gap-2">
            <button type="button" className={`${btnSecondary} ${side === 1 ? '!border-brand !bg-brand-soft' : ''}`} aria-pressed={side === 1} onClick={() => setSide(1)}>
              h from the right
            </button>
            <button type="button" className={`${btnSecondary} ${side === -1 ? '!border-brand !bg-brand-soft' : ''}`} aria-pressed={side === -1} onClick={() => setSide(-1)}>
              h from the left
            </button>
          </div>
        </div>
      </Section>

      <Section title="Secant line to tangent line">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="mb-2 text-sm font-semibold text-ink">The function and its secant</h3>
            <Plot xDomain={fn.domain} yDomain={fn.yRange} label={`Graph of ${fn.label} with a secant line`} onDrag={(v) => setX0(v)}>
              {({ sx, sy, x0: a, x1: b, y0, y1 }) => (
                <>
                  <path d={curvePath(fn.f, a, b, y0, y1, sx, sy)} fill="none" strokeWidth="2.5" className="stroke-brand" />
                  {exact !== null && (
                    <line x1={sx(a)} y1={sy(y + exact * (a - x))} x2={sx(b)} y2={sy(y + exact * (b - x))} strokeWidth="1.5" strokeDasharray="6 4" className="stroke-ok" />
                  )}
                  {Number.isFinite(m) && (
                    <line x1={sx(a)} y1={sy(y + m * (a - x))} x2={sx(b)} y2={sy(y + m * (b - x))} strokeWidth="2" className="stroke-warn" />
                  )}
                  {Number.isFinite(fn.f(x2)) && <circle cx={sx(x2)} cy={sy(fn.f(x2))} r="5" className="fill-surface stroke-warn" strokeWidth="2" />}
                  <circle cx={sx(x)} cy={sy(y)} r="6" className="fill-brand stroke-surface" strokeWidth="2" />
                </>
              )}
            </Plot>
            <p className="mt-2 text-xs text-muted">
              Solid amber: secant through (x, f(x)) and (x + h, f(x + h)). Dashed green: the tangent line. Drag on the graph or use the slider.
            </p>
          </Card>
          <Card>
            <h3 className="mb-2 text-sm font-semibold text-ink">The derivative f′, drawn as you move</h3>
            <Plot xDomain={fn.domain} yDomain={fn.dRange} label={`Graph of the derivative of ${fn.label}`} onDrag={(v) => setX0(v)}>
              {({ sx, sy, x0: a, x1: b, y0, y1 }) => (
                <>
                  <path d={curvePath((t) => fn.df(t) ?? NaN, a, b, y0, y1, sx, sy)} fill="none" strokeWidth="2.5" className="stroke-ok" />
                  {exact !== null && <circle cx={sx(x)} cy={sy(exact)} r="6" className="fill-ok stroke-surface" strokeWidth="2" />}
                  {Number.isFinite(m) && <circle cx={sx(x)} cy={sy(m)} r="5" className="fill-surface stroke-warn" strokeWidth="2" />}
                </>
              )}
            </Plot>
            <p className="mt-2 text-xs text-muted">
              Green dot: the exact slope f′(x). Open amber dot: the secant slope for the current h. Shrink h and watch the amber dot land on the green one.
            </p>
          </Card>
        </div>

        <Card className="mt-4">
          <p className="text-ink" aria-live="polite">
            Secant slope = (f(x + h) − f(x)) / h = <strong>{fmt(m, 4)}</strong>
            {exact !== null ? (
              <>
                {' '}· exact slope f′({fmt(x, 2)}) = <strong>{fmt(exact, 4)}</strong> · difference <strong>{fmt(Math.abs(m - exact), 4)}</strong>
              </>
            ) : (
              <> · f′({fmt(x, 2)}) does not exist</>
            )}
          </p>
          {kink && (
            <p className="mt-2 text-sm text-warn">
              At x = 0 the slope from the right tends to {fmt(rightS, 2)} and from the left to {fmt(leftS, 2)}. The two one-sided limits disagree, so the limit that defines f′(0) does not exist: |x| has a corner there.
            </p>
          )}
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-[22rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line-strong text-left text-ink">
                  <th className="py-1.5 pr-6">h</th>
                  <th className="py-1.5">(f(x + h) − f(x)) / h</th>
                </tr>
              </thead>
              <tbody>
                {table.map((r) => (
                  <tr key={r.h} className="border-b border-line text-soft">
                    <td className="py-1.5 pr-6 tabular-nums">{fmt(r.h, 5)}</td>
                    <td className="py-1.5 tabular-nums">{fmt(r.slope, 5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      <Section title="Predict, then check">
        <Card>
          <p className="font-medium text-ink">
            What is the slope of <code>{fn.label.replace('f(x) = ', '')}</code> at x = <strong>{fmt(askX, 3)}</strong>? (Within 0.05.)
          </p>
          {askAnswer === null ? (
            <p className="mt-2 text-sm text-soft">The derivative does not exist at this point. Use “Next point”.</p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                inputMode="decimal"
                value={guess}
                onChange={(e) => {
                  setGuess(e.target.value)
                  setShown('idle')
                }}
                onKeyDown={(e) => e.key === 'Enter' && checkGuess()}
                className="w-28 rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                aria-label="Your slope estimate"
              />
              <button type="button" className={btnSecondary} onClick={checkGuess}>
                Check
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  setX0(askX)
                  setHIdx(H_STEPS.length - 1)
                  setShown('revealed')
                }}
              >
                Show me on the graph
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  setAskIdx(askIdx + 1)
                  setGuess('')
                  setShown('idle')
                }}
              >
                Next point
              </button>
            </div>
          )}
          <div aria-live="polite" className="mt-2 text-sm">
            {shown === 'right' && <p className="text-ok">Correct: f′({fmt(askX, 3)}) = {fmt(askAnswer ?? 0, 4)}.</p>}
            {shown === 'wrong' && <p className="text-warn">Not quite. Move the point to x = {fmt(askX, 3)}, shrink h, and read the slope. Or use “Show me on the graph”.</p>}
            {shown === 'revealed' && askAnswer !== null && <p className="text-soft">The point is now at x = {fmt(askX, 3)} with a tiny h. The exact slope is {fmt(askAnswer, 4)}.</p>}
          </div>
        </Card>
      </Section>

      <Section title="Check your understanding">
        <div className="space-y-4">
          <ChoiceQuestion
            number={1}
            prompt="As h gets closer to 0, what happens to the secant line through (x, f(x)) and (x + h, f(x + h))?"
            options={['It gets steeper and steeper', 'It approaches the tangent line at x', 'It becomes horizontal', 'It stops existing']}
            answer={1}
            hint="Watch the amber line as you shrink h. What does it get closer to?"
            explain={<>The secant slopes converge to a single number, the slope of the tangent line. That number is the definition of f′(x) = lim<sub>h→0</sub> (f(x + h) − f(x)) / h.</>}
          />
          <NumberQuestion
            number={2}
            prompt={<>What is the slope of <code>f(x) = x²</code> at x = 3?</>}
            answer={6}
            tolerance={0.05}
            hint="The derivative of x² is 2x. Or use the explorer and a very small h."
            explain={<>f′(x) = 2x, so f′(3) = 6. Pick x² above, move to x = 3, and the secant slope with h = 0.001 reads {fmt(forwardSlope((t) => t * t, 3, 0.001), 3)}.</>}
          />
          <ChoiceQuestion
            number={3}
            prompt={<>Where does <code>f(x) = x³ − 3x</code> have a horizontal tangent?</>}
            options={['x = 0 only', 'x = −1 and x = 1', 'x = 3', 'Nowhere']}
            answer={1}
            hint="A horizontal tangent means f′(x) = 0. Solve 3x² − 3 = 0, or look for where the green dot on the derivative graph crosses zero."
            explain={<>f′(x) = 3x² − 3 = 0 gives x = ±1. Those are the local maximum and minimum of the curve.</>}
          />
          <ChoiceQuestion
            number={4}
            prompt={<>Is <code>f(x) = |x|</code> differentiable at x = 0?</>}
            options={['Yes, f′(0) = 0', 'Yes, f′(0) = 1', 'No: the slopes from the left (−1) and right (+1) disagree', 'No: |x| is not continuous at 0']}
            answer={2}
            hint="Pick |x| above, put the point at 0 and compare “h from the right” and “h from the left”."
            explain={<>|x| is continuous at 0, but it has a corner there. A function can be continuous and still not differentiable.</>}
          />
        </div>
      </Section>
    </ModuleShell>
  )
}
