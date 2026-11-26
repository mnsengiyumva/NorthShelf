import { useEffect, useMemo, useState } from 'react'
import { btnSecondary, fieldClass } from '../../ui'
import { Card, Section } from '../components/ModuleShell'
import ModuleShell from '../components/ModuleShell'
import { ChoiceQuestion, NumberQuestion } from '../components/Questions'
import Stepper from '../components/Stepper'
import { fibCallCounts, layoutTree, SOURCES, stackAt, stateAt, trace, type RecAlgo } from '../engines/recursion'
import { moduleBySlug } from '../modules'

const meta = moduleBySlug('recursion')!

const ALGOS: { id: RecAlgo; label: string; blurb: string }[] = [
  { id: 'factorial', label: 'Factorial', blurb: 'One recursive call per level: a single chain. Watch the stack get as deep as n.' },
  { id: 'fibonacci', label: 'Fibonacci', blurb: 'Two recursive calls per level: a tree that doubles in size. Turn on memoization to see it collapse.' },
  { id: 'sumList', label: 'Sum of a list', blurb: 'Recursion on a list: add the first item to the sum of the rest. The base case is the empty tail.' },
  { id: 'gcd', label: 'Greatest common divisor', blurb: 'Euclid’s algorithm. The answer is passed up unchanged from the base case.' },
]

const FIB_PLAIN = {
  lines: ['def fib(n):', '    if n < 2:', '        return n', '    return fib(n - 1) + fib(n - 2)'],
  call: 0,
  base: 2,
  recursive: 3,
  memo: undefined as number | undefined,
}

const COL = 74
const ROW = 62
const NODE_W = 64
const NODE_H = 28

export default function RecursionModule() {
  const [algo, setAlgo] = useState<RecAlgo>('factorial')
  const [n, setN] = useState(4)
  const [listText, setListText] = useState('3, 1, 4, 1, 5')
  const [a, setA] = useState(48)
  const [b, setB] = useState(18)
  const [memo, setMemo] = useState(false)
  const [step, setStep] = useState(0)
  const [predictOn, setPredictOn] = useState(false)
  const [answer, setAnswer] = useState('')
  const [wrong, setWrong] = useState(0)

  const maxN = algo === 'fibonacci' ? 8 : 10
  const nn = Math.min(n, maxN)
  const list = useMemo(() => listText.split(/[\s,]+/).filter(Boolean).map(Number).filter(Number.isFinite).slice(0, 8), [listText])
  const t = useMemo(() => trace(algo, { n: nn, list, a, b, memo }), [algo, nn, list, a, b, memo])
  const { pos, columns, rows } = useMemo(() => layoutTree(t.nodes), [t])

  useEffect(() => setStep(0), [t])
  useEffect(() => {
    setAnswer('')
    setWrong(0)
  }, [step, t])

  const last = t.events.length
  const state = stateAt(t.events, step)
  const stack = stackAt(t.events, step)
  const top = stack.length ? stack[stack.length - 1] : -1
  const lastEv = step > 0 ? t.events[step - 1] : null
  const nextEv = step < last ? t.events[step] : null
  const src = algo === 'fibonacci' && !memo ? FIB_PLAIN : SOURCES[algo]
  const highlight = !lastEv
    ? -1
    : lastEv.type === 'call'
      ? src.call
      : lastEv.kind === 'base'
        ? src.base
        : lastEv.kind === 'memo'
          ? (src.memo ?? -1)
          : src.recursive

  const label = lastEv ? t.nodes[lastEv.id].label : ''
  const note = !lastEv
    ? 'Press Next to begin. The first call comes from outside the function.'
    : lastEv.type === 'call'
      ? `Call ${label}. A new frame is pushed onto the call stack.`
      : lastEv.kind === 'base'
        ? `${label} reaches the base case and returns ${lastEv.value} without calling itself again.`
        : lastEv.kind === 'memo'
          ? `${label} finds its answer in the memo table and returns ${lastEv.value} at once. No further calls.`
          : `${label} now has the results of its recursive calls. It combines them and returns ${lastEv.value}. Its frame is popped.`

  const pending = predictOn && nextEv?.type === 'return' ? nextEv : null
  const pendingLabel = pending ? t.nodes[pending.id].label : ''
  const check = () => {
    if (!pending) return
    if (Number(answer) === pending.value && answer.trim() !== '') setStep(step + 1)
    else setWrong(wrong + 1)
  }

  const width = Math.max(columns * COL + 20, 300)
  const height = rows * ROW + 20
  const X = (id: number) => 10 + pos.get(id)!.x * COL + COL / 2
  const Y = (id: number) => 10 + pos.get(id)!.y * ROW + NODE_H / 2

  return (
    <ModuleShell meta={meta}>
      <Section title="Pick a function and an input">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Function">
          {ALGOS.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setAlgo(x.id)}
              aria-pressed={algo === x.id}
              className={`${btnSecondary} ${algo === x.id ? '!border-brand !bg-brand-soft' : ''}`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <p className="mt-3 max-w-3xl text-soft">{ALGOS.find((x) => x.id === algo)!.blurb}</p>

        <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
          {(algo === 'factorial' || algo === 'fibonacci') && (
            <label className="text-sm text-soft">
              n = <strong className="text-ink">{nn}</strong>
              <input type="range" min={0} max={maxN} value={nn} onChange={(e) => setN(Number(e.target.value))} className="mt-1 block w-48 accent-[var(--brand)]" />
            </label>
          )}
          {algo === 'fibonacci' && (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={memo} onChange={(e) => setMemo(e.target.checked)} className="accent-[var(--brand)]" />
              Memoize (remember answers already computed)
            </label>
          )}
          {algo === 'sumList' && (
            <label className="text-sm text-soft">
              List (up to 8 numbers)
              <input value={listText} onChange={(e) => setListText(e.target.value)} className={`${fieldClass} w-56`} />
            </label>
          )}
          {algo === 'gcd' && (
            <>
              <label className="text-sm text-soft">
                a
                <input type="number" min={0} max={999} value={a} onChange={(e) => setA(Number(e.target.value))} className={`${fieldClass} w-24`} />
              </label>
              <label className="text-sm text-soft">
                b
                <input type="number" min={0} max={999} value={b} onChange={(e) => setB(Number(e.target.value))} className={`${fieldClass} w-24`} />
              </label>
            </>
          )}
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={predictOn} onChange={(e) => setPredictOn(e.target.checked)} className="accent-[var(--brand)]" />
            Predict mode: guess each return value before it happens
          </label>
        </div>
      </Section>

      <Section title="Replay it">
        <Stepper
          index={step}
          last={last}
          onChange={setStep}
          blockNext={!!pending}
          blockedMessage="Predict mode is on. Answer the question below to continue."
        />
        <p className="mt-3 min-h-[3rem] text-ink" aria-live="polite">
          {note}
        </p>

        {pending && (
          <Card className="mt-3 border-brand">
            <p className="font-medium text-ink">
              <code>{pendingLabel}</code> is about to return. What value will it return?
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                inputMode="numeric"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && check()}
                className={`${fieldClass} !mt-0 w-32`}
                aria-label="Predicted return value"
              />
              <button type="button" className={btnSecondary} onClick={check}>
                Check
              </button>
              {wrong >= 2 && (
                <button type="button" className={btnSecondary} onClick={() => setStep(step + 1)}>
                  Show me
                </button>
              )}
            </div>
            {wrong >= 1 && (
              <p className="mt-2 text-sm text-warn">
                Not quite. Look at the values returned by the calls directly below {pendingLabel} in the tree, and at the highlighted line of code.
              </p>
            )}
          </Card>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
          <Card className="overflow-x-auto">
            <h3 className="mb-2 text-sm font-semibold text-ink">Call tree</h3>
            <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="Recursion call tree" className="max-w-none">
              {t.nodes.map((nd) =>
                nd.parent !== null && state.called.has(nd.id) ? (
                  <line key={`e${nd.id}`} x1={X(nd.parent)} y1={Y(nd.parent) + NODE_H / 2} x2={X(nd.id)} y2={Y(nd.id) - NODE_H / 2} className="stroke-line-strong" strokeWidth="1.5" />
                ) : null,
              )}
              {t.nodes.map((nd) => {
                if (!state.called.has(nd.id)) return null
                const ret = state.returned.get(nd.id)
                const isTop = nd.id === top
                const cls = isTop
                  ? 'fill-brand stroke-brand'
                  : ret
                    ? ret.kind === 'memo'
                      ? 'fill-warn-soft stroke-warn'
                      : 'fill-ok-soft stroke-ok'
                    : 'fill-brand-soft stroke-brand'
                return (
                  <g key={nd.id}>
                    <rect x={X(nd.id) - NODE_W / 2} y={Y(nd.id) - NODE_H / 2} width={NODE_W} height={NODE_H} rx="6" className={cls} strokeWidth="1.5" />
                    <text x={X(nd.id)} y={Y(nd.id) + 4} textAnchor="middle" fontSize="11" className={isTop ? 'fill-on-brand' : 'fill-ink'}>
                      {nd.label}
                    </text>
                    {ret && (
                      <text x={X(nd.id)} y={Y(nd.id) + NODE_H / 2 + 12} textAnchor="middle" fontSize="11" fontWeight="600" className="fill-ink">
                        → {ret.value}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
            <p className="mt-2 text-xs text-muted">
              Blue: still waiting for its calls to finish. Dark blue: running now. Green: returned. {memo && algo === 'fibonacci' ? 'Amber: answered from the memo table.' : ''}
            </p>
          </Card>

          <div className="space-y-4">
            <Card>
              <h3 className="mb-2 text-sm font-semibold text-ink">Code</h3>
              <pre className="overflow-x-auto text-sm leading-6">
                {src.lines.map((line, i) => (
                  <div key={i} className={`px-2 ${i === highlight ? 'rounded bg-warn-soft font-semibold text-ink' : 'text-soft'}`}>
                    <code>{line}</code>
                  </div>
                ))}
              </pre>
            </Card>
            <Card>
              <h3 className="mb-2 text-sm font-semibold text-ink">Call stack (top first)</h3>
              {stack.length === 0 ? (
                <p className="text-sm text-muted">Empty.</p>
              ) : (
                <ol className="space-y-1">
                  {stack
                    .slice()
                    .reverse()
                    .map((id, i) => (
                      <li key={id} className={`rounded border px-2 py-1 text-sm ${i === 0 ? 'border-brand bg-brand-soft font-semibold text-ink' : 'border-line text-soft'}`}>
                        <code>{t.nodes[id].label}</code>
                      </li>
                    ))}
                </ol>
              )}
              <p className="mt-3 text-sm text-muted">
                Stack depth now: <strong className="text-ink">{stack.length}</strong>. Deepest it gets: <strong className="text-ink">{t.maxStack}</strong>.
              </p>
              <p className="mt-1 text-sm text-muted">
                Calls so far: <strong className="text-ink">{state.called.size}</strong> of {t.calls}. Final result: <strong className="text-ink">{t.result}</strong>.
              </p>
            </Card>
          </div>
        </div>
      </Section>

      <Section title="Why memoization matters">
        <p className="max-w-3xl text-soft">
          Plain recursive Fibonacci recomputes the same values again and again, so the number of calls grows exponentially. Remembering each answer means every{' '}
          <code>fib(k)</code> is computed only once, and the calls grow linearly. Turn on <em>Memoize</em> above and replay fib(6) to see the tree shrink.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[24rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong text-left text-ink">
                <th className="py-2 pr-6">n</th>
                <th className="py-2 pr-6">Calls without memo</th>
                <th className="py-2">Calls with memo</th>
              </tr>
            </thead>
            <tbody>
              {[5, 10, 20, 30, 40].map((k) => {
                const c = fibCallCounts(k)
                return (
                  <tr key={k} className="border-b border-line text-soft">
                    <td className="py-2 pr-6 text-ink">fib({k})</td>
                    <td className="py-2 pr-6 tabular-nums">{c.plain.toLocaleString()}</td>
                    <td className="py-2 tabular-nums">{c.memo.toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Check your understanding">
        <div className="space-y-4">
          <NumberQuestion
            number={1}
            prompt={<>How many function calls does <code>fib(5)</code> make with no memoization? (Count every call, including the first.)</>}
            answer={fibCallCounts(5).plain}
            hint="fib(5) calls fib(4) and fib(3). Count the calls in each subtree and add 1 for the call itself. Or replay it above."
            explain={<>fib(5) makes {fibCallCounts(5).plain} calls. With memoization it makes {fibCallCounts(5).memo}. The gap is the repeated work, and it explodes: fib(30) makes {fibCallCounts(30).plain.toLocaleString()} calls.</>}
          />
          <NumberQuestion
            number={2}
            prompt={<>What is the deepest the call stack gets while computing <code>fact(6)</code>?</>}
            answer={trace('factorial', { n: 6 }).maxStack}
            hint="Each call waits for the next one to return, so nothing is popped until the base case. fact(6) calls fact(5) calls …"
            explain={<>The stack reaches {trace('factorial', { n: 6 }).maxStack} frames: fact(6) down to fact(1). That is why very deep recursion can overflow the stack.</>}
          />
          <ChoiceQuestion
            number={3}
            prompt={<>What happens if you delete the base case from <code>fact(n)</code> and call <code>fact(3)</code>?</>}
            options={['It returns 0', 'It returns 6 anyway', 'It keeps calling itself until the stack overflows', 'It returns 1']}
            answer={2}
            hint="What would stop the calls from continuing to fact(0), fact(−1), fact(−2), …?"
            explain={<>Nothing ever stops the recursion, so frames pile up until the language raises an error (in Python, a RecursionError). Every recursive function needs a base case that is actually reached.</>}
          />
          <ChoiceQuestion
            number={4}
            prompt="Why does memoization make recursive Fibonacci fast?"
            options={[
              'Each fib(k) is computed once; later calls just look the value up',
              'It makes each call run in constant time by using a faster CPU instruction',
              'It removes the base case',
              'It turns the recursion into a loop, so there are no calls at all',
            ]}
            answer={0}
            hint="Compare the two trees above. What is different about the repeated subtrees?"
            explain={<>The repeated subtrees are replaced by single lookups, so about 2n − 1 calls are made instead of an exponential number.</>}
          />
        </div>
      </Section>
    </ModuleShell>
  )
}
