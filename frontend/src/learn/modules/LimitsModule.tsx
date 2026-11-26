import { useMemo, useState } from 'react'
import { btnSecondary } from '../../ui'
import ModuleShell, { Card, Section } from '../components/ModuleShell'
import { ChoiceQuestion } from '../components/Questions'
import Plot from '../components/Plot'
import FunctionInput from '../components/FunctionInput'
import { makeCustomCase } from '../engines/custom'
import type { LimitCase } from '../engines/limits'
import { approachTable, bestDelta, CASES, deltaWorks, KIND_LABEL, KIND_ORDER } from '../engines/limits'
import { fmt } from '../engines/derivatives'
import { moduleBySlug } from '../modules'
import { curvePath } from '../plotUtils'

const meta = moduleBySlug('limits')!

export default function LimitsModule() {
  const [caseId, setCaseId] = useState(CASES[1].id)
  const [custom, setCustom] = useState<LimitCase | null>(null)
  const c = (caseId === 'custom' && custom) || CASES.find((k) => k.id === caseId) || CASES[0]
  const [epsT, setEpsT] = useState(0.6)
  const [deltaT, setDeltaT] = useState(0.6)
  const [cand, setCand] = useState<number | null>(null)

  const [dlo, dhi] = c.domain
  const dMax = Math.min(1, (dhi - dlo) / 2)
  const eps = 10 ** (-2 * (1 - epsT)) // 0.01 .. 1
  const delta = dMax * 10 ** (-3 * (1 - deltaT)) // dMax/1000 .. dMax
  const L = cand ?? c.limit ?? 0
  const works = deltaWorks(c, L, eps, delta)
  const best = useMemo(() => bestDelta(c, L, eps, dMax), [c, L, eps, dMax])
  const table = useMemo(() => approachTable(c), [c])
  const trueLimit = c.limit

  const pick = (id: string) => {
    setCaseId(id)
    setCand(null)
  }

  const [ylo, yhi] = c.yRange
  const lMin = ylo
  const lMax = yhi

  return (
    <ModuleShell meta={meta}>
      <Section title="Choose a function">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Function">
          {CASES.map((k) => (
            <button key={k.id} type="button" onClick={() => pick(k.id)} aria-pressed={k.id === caseId} className={`${btnSecondary} ${k.id === caseId ? '!border-brand !bg-brand-soft' : ''}`}>
              {k.label.replace('f(x) = ', '').split(' as ')[0]} at {c.id === k.id ? c.a : k.a}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <FunctionInput
            showPoint
            examples={['sin(x)/x', '(x^2-4)/(x-2)', 'abs(x)/x', '1/x^2', 'x*sin(1/x)', 'sin(1/x)']}
            initial={{ text: '(x^2-4)/(x-2)', xmin: -4, xmax: 4, a: 2 }}
            onApply={(v) => {
              setCustom(makeCustomCase(v.text, v.xmin, v.xmax, v.a))
              setCaseId('custom')
              setCand(null)
            }}
          />
        </div>
        <p className="mt-3 font-medium text-ink">{c.label}</p>
      </Section>

      <Section title="Look first">
        <Card>
          <Plot xDomain={c.domain} yDomain={c.yRange} label={`Graph of ${c.label}`}>
            {({ sx, sy, x0, x1, y0, y1 }) => (
              <>
                <rect x={sx(x0)} y={sy(Math.min(y1, L + eps))} width={sx(x1) - sx(x0)} height={Math.max(0, sy(Math.max(y0, L - eps)) - sy(Math.min(y1, L + eps)))} className="fill-warn-soft" opacity="0.8" />
                <rect x={sx(c.a - delta)} y={sy(y1)} width={Math.max(1, sx(c.a + delta) - sx(c.a - delta))} height={sy(y0) - sy(y1)} className="fill-brand-soft" opacity="0.7" />
                <line x1={sx(c.a)} x2={sx(c.a)} y1={sy(y1)} y2={sy(y0)} strokeDasharray="4 4" className="stroke-muted" />
                <line x1={sx(x0)} x2={sx(x1)} y1={sy(L)} y2={sy(L)} strokeDasharray="4 4" className="stroke-warn" />
                <path d={curvePath(c.f, x0, c.a - 1e-9, y0, y1, sx, sy, 900)} fill="none" strokeWidth="2.5" className="stroke-brand" />
                <path d={curvePath(c.f, c.a + 1e-9, x1, y0, y1, sx, sy, 900)} fill="none" strokeWidth="2.5" className="stroke-brand" />
                {c.fa !== null && <circle cx={sx(c.a)} cy={sy(c.fa)} r="5.5" className="fill-brand stroke-surface" strokeWidth="2" />}
                {c.kind === 'jump' && (
                  <>
                    <circle cx={sx(c.a)} cy={sy(c.left!)} r="5" className="fill-surface stroke-brand" strokeWidth="2" />
                    <circle cx={sx(c.a)} cy={sy(c.right!)} r="5" className="fill-surface stroke-brand" strokeWidth="2" />
                  </>
                )}
                {(c.kind === 'removable' || c.kind === 'continuous') && c.limit !== null && c.fa !== c.limit && (
                  <circle cx={sx(c.a)} cy={sy(c.limit)} r="5" className="fill-surface stroke-brand" strokeWidth="2" />
                )}
              </>
            )}
          </Plot>
          <p className="mt-2 text-xs text-muted">
            Solid dot: the actual value f(a). Open dot: a value the curve approaches but does not reach. Amber band: L ± ε. Blue band: a ± δ.
          </p>
        </Card>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="mb-2 text-sm font-semibold text-ink">What happens as x → {c.a}</h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line-strong text-left text-ink">
                  <th className="py-1.5 pr-4">distance</th>
                  <th className="py-1.5 pr-4">f(a − d)</th>
                  <th className="py-1.5">f(a + d)</th>
                </tr>
              </thead>
              <tbody>
                {table.map((r) => (
                  <tr key={r.d} className="border-b border-line text-soft">
                    <td className="py-1.5 pr-4 tabular-nums">{r.d}</td>
                    <td className="py-1.5 pr-4 tabular-nums">{fmt(r.left, 5)}</td>
                    <td className="py-1.5 tabular-nums">{fmt(r.right, 5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card>
            <h3 className="mb-2 text-sm font-semibold text-ink">Continuity checklist at x = {c.a}</h3>
            <ul className="space-y-1.5 text-sm">
              {[
                ['f(a) is defined', c.fa !== null],
                ['The limit exists (a finite number)', c.limit !== null],
                ['The limit equals f(a)', c.fa !== null && c.limit !== null && c.fa === c.limit],
              ].map(([label, ok]) => (
                <li key={String(label)} className="flex items-center gap-2 text-ink">
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${ok ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`} aria-hidden="true">
                    {ok ? '✓' : '✗'}
                  </span>
                  <span>
                    {label}
                    <span className="sr-only">: {ok ? 'yes' : 'no'}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-soft">Continuous at a means all three are true.</p>
          </Card>
        </div>
      </Section>

      <Section title="The ε–δ game">
        <p className="max-w-3xl text-soft">
          The limit is L when you can make f(x) as close to L as you like (within <em>ε</em>) by keeping x close enough to a (within <em>δ</em>). Choose a candidate L and an ε, then try to find a δ so that the graph stays inside the amber band for every x in the blue window (except x = a itself).
        </p>
        <Card className="mt-3">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <label className="text-sm text-soft">
              Candidate L = <strong className="text-ink">{fmt(L, 2)}</strong>
              <input type="range" min={lMin} max={lMax} step={0.01} value={L} onChange={(e) => setCand(Number(e.target.value))} className="mt-1 block w-56 accent-[var(--brand)]" />
            </label>
            <label className="text-sm text-soft">
              ε = <strong className="text-ink">{fmt(eps, 3)}</strong>
              <input type="range" min={0} max={1} step={0.01} value={epsT} onChange={(e) => setEpsT(Number(e.target.value))} className="mt-1 block w-56 accent-[var(--brand)]" />
            </label>
            <label className="text-sm text-soft">
              δ = <strong className="text-ink">{fmt(delta, 4)}</strong>
              <input type="range" min={0} max={1} step={0.01} value={deltaT} onChange={(e) => setDeltaT(Number(e.target.value))} className="mt-1 block w-56 accent-[var(--brand)]" />
            </label>
            {trueLimit !== null && (
              <button type="button" className={btnSecondary} onClick={() => setCand(trueLimit)}>
                Set L to the true limit
              </button>
            )}
          </div>
          <p className="mt-4 text-ink" aria-live="polite">
            {works ? (
              <span className="font-semibold text-ok">✓ This δ works: every sampled x within δ of a lands inside the band.</span>
            ) : (
              <span className="font-semibold text-warn">✗ This δ fails: some x within δ of a lands outside the band.</span>
            )}
          </p>
          <p className="mt-2 text-sm text-soft">
            {best < 1e-6 ? (
              <>For L = {fmt(L, 2)} and ε = {fmt(eps, 3)}, <strong className="text-ink">no δ works</strong>, however small. So L = {fmt(L, 2)} is not the limit.</>
            ) : (
              <>For L = {fmt(L, 2)} and ε = {fmt(eps, 3)}, the largest δ that works is about <strong className="text-ink">{fmt(best, 4)}</strong>.</>
            )}
          </p>
          <p className="mt-2 text-sm text-muted">
            Try shrinking ε and see δ shrink with it. Only the true limit has a working δ for every ε. {trueLimit === null && 'Here no value of L works for small ε, so the limit does not exist.'}
          </p>
        </Card>
      </Section>

      <Section title="Classify it">
        <ChoiceQuestion
          key={c.id === 'custom' ? c.label : c.id}
          number={1}
          prompt={<>Which statement describes <code>{c.label.split(' as ')[0].replace('f(x) = ', '')}</code> at x = {c.a}?</>}
          options={KIND_ORDER.map((k) => KIND_LABEL[k])}
          answer={KIND_ORDER.indexOf(c.kind)}
          hint="Use the table and the graph: do both sides approach the same finite number? Is f(a) defined, and does it match?"
          explain={c.explanation}
        />
        <p className="mt-3 text-sm text-muted">Switch functions above to get a new one to classify.</p>
      </Section>

      <Section title="Check your understanding">
        <div className="space-y-4">
          <ChoiceQuestion
            number={2}
            prompt={<>If <code>f(2)</code> is undefined, can <code>lim<sub>x→2</sub> f(x)</code> still exist?</>}
            options={['No: the limit needs f(2)', 'Yes: the limit only depends on values near 2', 'Only if f(2) = 0', 'Only if f is a polynomial']}
            answer={1}
            hint="Look at (x² − 1)/(x − 1) at x = 1 above."
            explain={<>The limit describes what happens near a, not at a. The function (x² − 1)/(x − 1) is undefined at 1 yet its limit there is 2.</>}
          />
          <ChoiceQuestion
            number={3}
            prompt="The left-hand limit is −1 and the right-hand limit is +1. What can you say about the two-sided limit?"
            options={['It is 0, the average', 'It is 1', 'It does not exist', 'It equals f(a)']}
            answer={2}
            hint="A two-sided limit exists only if both one-sided limits exist and agree."
            explain={<>The two-sided limit exists only when the one-sided limits agree. Here they don’t, as with |x|/x at 0.</>}
          />
          <ChoiceQuestion
            number={4}
            prompt={<>Does <code>sin(1/x)</code> have a limit as x → 0? Its values always stay between −1 and 1.</>}
            options={['Yes, 0, because it is bounded', 'Yes, it equals 1', 'No: it oscillates forever and never settles on one value', 'No: it is infinite']}
            answer={2}
            hint="Being bounded is not enough. A limit needs the values to settle toward one number."
            explain={<>The values swing between −1 and 1 infinitely often near 0, so there is no single number being approached. Compare x·sin(1/x), which is squeezed to 0.</>}
          />
        </div>
      </Section>
    </ModuleShell>
  )
}
