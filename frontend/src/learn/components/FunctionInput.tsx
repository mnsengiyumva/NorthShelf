import { useState } from 'react'
import { btnPrimary, fieldClass } from '../../ui'
import { ExprError } from '../engines/expr'

export interface FunctionInputValue {
  text: string
  xmin: number
  xmax: number
  a: number
}

interface Props {
  /** Show the "at x =" box (limits). */
  showPoint?: boolean
  examples: string[]
  initial: FunctionInputValue
  /** Should throw (ExprError or Error) with a friendly message if the value cannot be used. */
  onApply: (v: FunctionInputValue) => void
}

/** Text box for a user-typed function of x, with range and examples. Nothing here is executed as code. */
export default function FunctionInput({ showPoint, examples, initial, onApply }: Props) {
  const [text, setText] = useState(initial.text)
  const [xmin, setXmin] = useState(String(initial.xmin))
  const [xmax, setXmax] = useState(String(initial.xmax))
  const [a, setA] = useState(String(initial.a))
  const [error, setError] = useState<string | null>(null)

  const apply = (t = text) => {
    const lo = Number(xmin), hi = Number(xmax), pt = Number(a)
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo >= hi) return setError('The range needs two numbers with “from” smaller than “to”.')
    if (hi - lo > 1e4) return setError('That range is too wide. Try something under 10 000 across.')
    if (showPoint && (!Number.isFinite(pt) || pt <= lo || pt >= hi)) return setError('The point x = a must be a number inside the range.')
    try {
      onApply({ text: t, xmin: lo, xmax: hi, a: pt })
      setError(null)
    } catch (e) {
      setError(e instanceof ExprError || e instanceof Error ? e.message : 'Something went wrong with that function.')
    }
  }

  return (
    <form
      className="rounded-lg border border-line bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault()
        apply()
      }}
    >
      <p className="text-sm font-medium text-ink">Or try your own function</p>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <label className="grow text-sm text-soft">
          f(x) =
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={`${fieldClass} mt-1 min-w-48 font-mono`}
            spellCheck={false}
            autoComplete="off"
            maxLength={200}
            aria-describedby="fn-help"
            aria-invalid={error ? true : undefined}
          />
        </label>
        {showPoint && (
          <label className="text-sm text-soft">
            at x =
            <input value={a} onChange={(e) => setA(e.target.value)} inputMode="decimal" className={`${fieldClass} mt-1 w-20`} />
          </label>
        )}
        <label className="text-sm text-soft">
          x from
          <input value={xmin} onChange={(e) => setXmin(e.target.value)} inputMode="decimal" className={`${fieldClass} mt-1 w-20`} />
        </label>
        <label className="text-sm text-soft">
          to
          <input value={xmax} onChange={(e) => setXmax(e.target.value)} inputMode="decimal" className={`${fieldClass} mt-1 w-20`} />
        </label>
        <button type="submit" className={btnPrimary}>
          Plot it
        </button>
      </div>
      <p id="fn-help" className="mt-2 text-xs text-muted">
        Use x, + − * / ^, brackets, and sin, cos, tan, exp, ln, log, sqrt, abs, pi, e. Example: <code>x^2 * sin(x)</code>. Slopes and limits for your own function are numerical estimates.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            className="rounded border border-line px-2 py-1 font-mono text-xs text-soft hover:border-brand hover:text-ink"
            onClick={() => {
              setText(ex)
              apply(ex)
            }}
          >
            {ex}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          {error}
        </p>
      )}
    </form>
  )
}
