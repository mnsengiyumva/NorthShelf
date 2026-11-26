import { useMemo, useState } from 'react'
import { btnSecondary, fieldClass } from '../../ui'
import ModuleShell, { Card, Section } from '../components/ModuleShell'
import { ChoiceQuestion, NumberQuestion } from '../components/Questions'
import Stepper from '../components/Stepper'
import {
  firstCounterexample, fractionalGreedy, greedy01, greedyCoins, KNAPSACK_PRESETS, optimal01, optimalCoins, optimalCount,
  PRESETS_INTERVALS, randomIntervals, RULE_LABEL, RULE_ORDER, schedule, toIntervals, type Interval, type Rule,
} from '../engines/greedy'
import { moduleBySlug } from '../modules'

const meta = moduleBySlug('greedy')!

const COIN_PRESETS: { label: string; coins: string; amount: number }[] = [
  { label: '1, 5, 10, 25', coins: '1, 5, 10, 25', amount: 63 },
  { label: '1, 3, 4', coins: '1, 3, 4', amount: 6 },
  { label: '1, 5, 10, 12', coins: '1, 5, 10, 12', amount: 15 },
  { label: '1, 2, 5, 10, 20, 50', coins: '1, 2, 5, 10, 20, 50', amount: 88 },
]

function parseCoins(text: string): { coins: number[] } | { error: string } {
  const parts = text.split(/[\s,]+/).filter(Boolean)
  const nums = parts.map(Number)
  if (nums.length < 2 || nums.length > 8) return { error: 'Enter between 2 and 8 coin values, separated by commas.' }
  if (nums.some((n) => !Number.isInteger(n) || n < 1 || n > 500)) return { error: 'Coin values must be whole numbers from 1 to 500.' }
  return { coins: [...new Set(nums)] }
}

function CoinChips({ coins, dim = false }: { coins: number[]; dim?: boolean }) {
  return (
    <span className="inline-flex flex-wrap gap-1.5 align-middle">
      {coins.map((c, i) => (
        <span key={i} className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full border-2 px-1.5 text-xs font-semibold tabular-nums ${dim ? 'border-line text-muted' : 'border-brand bg-brand-soft text-ink'}`}>
          {c}
        </span>
      ))}
    </span>
  )
}

function CoinSection() {
  const [text, setText] = useState(COIN_PRESETS[0].coins)
  const [amountText, setAmountText] = useState(String(COIN_PRESETS[0].amount))
  const [step, setStep] = useState(0)
  const [prediction, setPrediction] = useState<null | 'same' | 'worse'>(null)

  const parsed = parseCoins(text)
  const amount = Number(amountText)
  const amountOk = Number.isInteger(amount) && amount >= 1 && amount <= 300
  const valid = 'coins' in parsed && amountOk
  const coins = 'coins' in parsed ? parsed.coins : []

  const result = useMemo(() => {
    if (!valid) return null
    const g = greedyCoins(coins, amount)
    const o = optimalCoins(coins, amount)
    return { g, o, counter: firstCounterexample(coins) }
  }, [valid, coins.join(','), amount]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setStep(0)
    setPrediction(null)
  }
  const apply = (c: string, a: number) => {
    setText(c)
    setAmountText(String(a))
    reset()
  }

  const g = result?.g
  const taken = g ? g.steps.slice(0, step) : []
  const remaining = g ? (step === 0 ? amount : g.steps[step - 1].remainingBefore - g.steps[step - 1].coin) : 0
  const finished = g ? step >= g.steps.length : false
  const same = result && g && result.o ? g.ok && g.count === result.o.length : false
  const nextCoin = g && step < g.steps.length ? g.steps[step].coin : null

  return (
    <Section title="1. Making change">
      <p className="max-w-3xl text-soft">
        The greedy rule: <strong className="text-ink">always take the largest coin that still fits</strong>. It is fast and needs no backtracking. The question is whether it ever uses more coins than necessary.
      </p>
      <Card className="mt-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Coin set presets">
          {COIN_PRESETS.map((p) => (
            <button key={p.label} type="button" className={`${btnSecondary} ${text === p.coins && amountText === String(p.amount) ? '!border-brand !bg-brand-soft' : ''}`} onClick={() => apply(p.coins, p.amount)}>
              Coins {p.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="grow text-sm text-soft">
            Coin values
            <input value={text} onChange={(e) => { setText(e.target.value); reset() }} className={`${fieldClass} mt-1 font-mono`} aria-invalid={'error' in parsed} />
          </label>
          <label className="text-sm text-soft">
            Amount
            <input value={amountText} onChange={(e) => { setAmountText(e.target.value); reset() }} inputMode="numeric" className={`${fieldClass} mt-1 w-24`} aria-invalid={!amountOk} />
          </label>
        </div>
        {'error' in parsed && <p role="alert" className="mt-2 text-sm text-warn">{parsed.error}</p>}
        {!amountOk && <p role="alert" className="mt-2 text-sm text-warn">The amount must be a whole number from 1 to 300.</p>}
      </Card>

      {valid && result && g && (
        <Card className="mt-4">
          <p className="font-medium text-ink">Predict first: will greedy use the fewest possible coins for {amount}?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {([['same', 'Yes, the fewest'], ['worse', 'No, more than necessary']] as const).map(([k, label]) => (
              <button key={k} type="button" className={`${btnSecondary} ${prediction === k ? '!border-brand !bg-brand-soft' : ''}`} onClick={() => setPrediction(k)} aria-pressed={prediction === k}>
                {label}
              </button>
            ))}
          </div>
          {prediction && (
            <p className="mt-2 text-sm" aria-live="polite">
              {(prediction === 'same') === same ? <span className="font-semibold text-ok">✓ Good call. </span> : <span className="font-semibold text-warn">✗ Not this time. </span>}
              <span className="text-soft">Step through to see why.</span>
            </p>
          )}

          <div className="mt-4">
            <Stepper index={step} last={g.steps.length} onChange={setStep} blockNext={prediction === null} blockedMessage="Make a prediction first, then step through." />
          </div>
          <div className="mt-3 text-sm" aria-live="polite">
            <p className="text-soft">
              Still to make: <strong className="text-ink tabular-nums">{remaining}</strong>
              {nextCoin !== null && <> · largest coin that fits: <strong className="text-ink">{nextCoin}</strong></>}
            </p>
            <p className="mt-2 text-ink">Greedy has taken: {taken.length ? <CoinChips coins={taken.map((s) => s.coin)} /> : <span className="text-muted">nothing yet</span>}</p>
          </div>

          {finished && (
            <div className="mt-4 rounded-md border border-line p-3 text-sm">
              {!g.ok ? (
                <p className="text-warn">Greedy got stuck with {g.left} left: no coin fits. {result.o ? <>A solution does exist: <CoinChips coins={result.o} />.</> : 'This amount cannot be made at all.'}</p>
              ) : (
                <>
                  <p className="text-ink">Greedy used <strong>{g.count}</strong> coins. The true minimum is <strong>{result.o!.length}</strong>: <CoinChips coins={result.o!} dim={same} />.</p>
                  <p className={`mt-1 font-semibold ${same ? 'text-ok' : 'text-warn'}`}>{same ? '✓ Greedy was optimal here.' : '✗ Greedy was not optimal here.'}</p>
                </>
              )}
            </div>
          )}

          <p className="mt-4 text-sm text-soft">
            {result.counter === null ? (
              <>For the coin set <strong className="text-ink">{coins.join(', ')}</strong> greedy is optimal for <em>every</em> amount we checked, so it is safe to use here.</>
            ) : (
              <>
                For this coin set greedy is <strong className="text-ink">not</strong> always optimal. The smallest amount that breaks it is <strong className="text-ink">{result.counter}</strong>.{' '}
                <button type="button" className="text-brand underline underline-offset-4" onClick={() => apply(text, result.counter!)}>Try {result.counter}</button>
              </>
            )}
          </p>
        </Card>
      )}
      <p className="mt-3 max-w-3xl text-sm text-muted">
        Whether greedy works depends on the coin set, not on the amount. A set where it always works is sometimes called canonical. Real currencies are designed that way.
      </p>
    </Section>
  )
}

function ScheduleSection() {
  const [presetKey, setPresetKey] = useState<string>('long')
  const [seed, setSeed] = useState(0)
  const [rule, setRule] = useState<Rule>('earliestStart')
  const [step, setStep] = useState(0)

  const intervals: Interval[] = useMemo(
    () => (presetKey === 'random' ? randomIntervals(seed + 1) : toIntervals(PRESETS_INTERVALS[presetKey].items)),
    [presetKey, seed],
  )
  const horizon = Math.max(...intervals.map((i) => i.end)) + 1
  const run = useMemo(() => schedule(intervals, rule), [intervals, rule])
  const best = useMemo(() => optimalCount(intervals), [intervals])
  const shown = run.decisions.slice(0, step)
  const current = step > 0 ? run.decisions[step - 1] : null
  const finished = step >= run.decisions.length

  const rowH = 28, left = 36, W = 640
  const sx = (v: number) => left + ((W - left - 12) * v) / horizon
  const status = (id: number) => {
    const d = shown.find((s) => s.interval.id === id)
    return d ? (d.accepted ? 'accepted' : 'rejected') : 'waiting'
  }

  const pick = (k: string) => { setPresetKey(k); setStep(0) }

  return (
    <Section title="2. Scheduling events">
      <p className="max-w-3xl text-soft">
        You can attend any set of events that do not overlap. Goal: attend as many as possible. Greedy considers events in some order and keeps each one that fits. <em>Which order</em> is the whole question.
      </p>
      <Card className="mt-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Event set">
          {[...Object.entries(PRESETS_INTERVALS).map(([k, v]) => [k, v.label] as const), ['random', 'Random day'] as const].map(([k, label]) => (
            <button key={k} type="button" className={`${btnSecondary} ${presetKey === k ? '!border-brand !bg-brand-soft' : ''}`} onClick={() => (k === 'random' && presetKey === 'random' ? (setSeed(seed + 1), setStep(0)) : pick(k))}>
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">{presetKey === 'random' ? 'Eight random events. Press again for a new set.' : PRESETS_INTERVALS[presetKey].note}</p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Greedy rule">
          {RULE_ORDER.map((r) => (
            <button key={r} type="button" aria-pressed={r === rule} className={`${btnSecondary} ${r === rule ? '!border-brand !bg-brand-soft' : ''}`} onClick={() => { setRule(r); setStep(0) }}>
              {RULE_LABEL[r]}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <Stepper index={step} last={run.decisions.length} onChange={setStep} />
        </div>

        <svg viewBox={`0 0 ${W} ${intervals.length * rowH + 28}`} className="mt-3 w-full" role="img" aria-label={`Timeline of ${intervals.length} events`}>
          {Array.from({ length: horizon + 1 }, (_, t) => (
            <g key={t}>
              <line x1={sx(t)} x2={sx(t)} y1={0} y2={intervals.length * rowH} className="stroke-line" />
              {t % Math.ceil(horizon / 12) === 0 && <text x={sx(t)} y={intervals.length * rowH + 16} textAnchor="middle" className="fill-muted text-[11px]">{t}</text>}
            </g>
          ))}
          {intervals.map((iv, row) => {
            const st = status(iv.id)
            const isCur = current?.interval.id === iv.id
            return (
              <g key={iv.id}>
                <text x={left - 8} y={row * rowH + 18} textAnchor="end" className="fill-muted text-[11px]">E{iv.id + 1}</text>
                <rect
                  x={sx(iv.start)} y={row * rowH + 4} width={Math.max(4, sx(iv.end) - sx(iv.start))} height={rowH - 8} rx="4"
                  className={st === 'accepted' ? 'fill-ok' : st === 'rejected' ? 'fill-surface stroke-warn' : 'fill-brand-soft stroke-brand'}
                  strokeWidth={isCur ? 3 : 1.5} strokeDasharray={st === 'rejected' ? '4 3' : undefined}
                />
                <text x={sx(iv.start) + 6} y={row * rowH + 18} className={`text-[11px] ${st === 'accepted' ? 'fill-surface' : 'fill-ink'}`}>
                  {iv.start}–{iv.end}
                </text>
              </g>
            )
          })}
        </svg>
        <p className="mt-1 text-xs text-muted">Green: accepted. Dashed: skipped because it overlaps an accepted event. Pale: not considered yet.</p>

        <p className="mt-3 min-h-10 text-sm text-soft" aria-live="polite">
          {current ? (
            current.accepted
              ? <>E{current.interval.id + 1} ({current.interval.start}–{current.interval.end}) does not overlap anything chosen, so <strong className="text-ink">accept</strong>.</>
              : <>E{current.interval.id + 1} ({current.interval.start}–{current.interval.end}) overlaps E{current.blockedBy!.id + 1}, so <strong className="text-ink">skip</strong>.</>
          ) : <>Rule: <strong className="text-ink">{RULE_LABEL[rule].toLowerCase()}</strong>. Press Next to consider the first event.</>}
        </p>
        {finished && (
          <p className={`mt-2 text-sm font-semibold ${run.chosen.length === best ? 'text-ok' : 'text-warn'}`} aria-live="polite">
            {run.chosen.length === best ? `✓ ${run.chosen.length} events: the best possible.` : `✗ ${run.chosen.length} events, but ${best} is possible.`}
          </p>
        )}
      </Card>
      <p className="mt-3 max-w-3xl text-sm text-muted">
        Earliest finish first is the one that is always optimal. The reason is an exchange argument: in any best schedule, swapping its first event for the one that finishes earliest never creates an overlap, so nothing is lost.
      </p>
    </Section>
  )
}

function KnapsackSection() {
  const [key, setKey] = useState<keyof typeof KNAPSACK_PRESETS>('classic')
  const preset = KNAPSACK_PRESETS[key]
  const [cap, setCap] = useState(preset.cap)
  const rows = useMemo(() => {
    const f = fractionalGreedy(preset.items, cap)
    const g = greedy01(preset.items, cap)
    const o = optimal01(preset.items, cap)
    return { f, g, o }
  }, [preset, cap])
  const max = Math.max(rows.f.value, rows.g.value, rows.o.value, 1)
  const bars = [
    { label: 'Greedy, fractions allowed', value: rows.f.value, note: rows.f.taken.map((t) => (t.fraction < 1 ? `${Math.round(t.fraction * 100)}% of ${t.item.name}` : t.item.name)).join(', ') || '—', cls: 'bg-ok' },
    { label: 'Greedy, whole items only', value: rows.g.value, note: rows.g.taken.map((t) => t.name).join(', ') || '—', cls: 'bg-warn' },
    { label: 'Best whole-item choice', value: rows.o.value, note: rows.o.taken.map((t) => t.name).join(', ') || '—', cls: 'bg-brand' },
  ]
  return (
    <Section title="3. Filling a knapsack">
      <p className="max-w-3xl text-soft">
        Greedy rule: take items with the best <strong className="text-ink">value per kilogram</strong> first. If you may take part of an item, this is always optimal. If items are all-or-nothing, it can fail.
      </p>
      <Card className="mt-4">
        <div className="flex flex-wrap items-end gap-3">
          {(Object.keys(KNAPSACK_PRESETS) as (keyof typeof KNAPSACK_PRESETS)[]).map((k) => (
            <button key={k} type="button" className={`${btnSecondary} ${k === key ? '!border-brand !bg-brand-soft' : ''}`} onClick={() => { setKey(k); setCap(KNAPSACK_PRESETS[k].cap) }}>
              {KNAPSACK_PRESETS[k].label}
            </button>
          ))}
          <label className="text-sm text-soft">
            Capacity = <strong className="text-ink">{cap} kg</strong>
            <input type="range" min={5} max={60} value={cap} onChange={(e) => setCap(Number(e.target.value))} className="mt-1 block w-48 accent-[var(--brand)]" />
          </label>
        </div>
        <table className="mt-4 w-full max-w-md border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-ink"><th className="py-1.5">Item</th><th>Weight</th><th>Value</th><th>Value per kg</th></tr>
          </thead>
          <tbody>
            {preset.items.map((it) => (
              <tr key={it.name} className="border-b border-line text-soft tabular-nums">
                <td className="py-1.5">{it.name}</td><td>{it.weight} kg</td><td>{it.value}</td><td>{(it.value / it.weight).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="mt-4 space-y-3">
          {bars.map((b) => (
            <li key={b.label}>
              <div className="flex justify-between text-sm"><span className="text-ink">{b.label}</span><span className="tabular-nums text-soft">{Math.round(b.value * 10) / 10}</span></div>
              <div className="mt-1 h-3 rounded bg-line"><div className={`h-3 rounded ${b.cls}`} style={{ width: `${(b.value / max) * 100}%` }} /></div>
              <p className="mt-0.5 text-xs text-muted">takes: {b.note}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-soft" aria-live="polite">
          {rows.g.value < rows.o.value ? <>Greedy with whole items loses <strong className="text-ink">{rows.o.value - rows.g.value}</strong> here. Slide the capacity to find where it recovers.</> : <>At this capacity greedy happens to match the best choice. Try other capacities.</>}
        </p>
      </Card>
      <p className="mt-3 max-w-3xl text-sm text-muted">
        When whole items are required, the best answer needs to consider combinations. That is a different technique, dynamic programming, which is the next module.
      </p>
    </Section>
  )
}

export default function GreedyModule() {
  return (
    <ModuleShell meta={meta}>
      <CoinSection />
      <ScheduleSection />
      <KnapsackSection />
      <Section title="Check your understanding">
        <div className="space-y-4">
          <NumberQuestion number={1} prompt={<>Coins are 1, 3 and 4. How many coins does the greedy rule use to make 6?</>} answer={3} tolerance={0} hint="Take the largest coin that fits, then repeat with what is left." explain={<>Greedy takes 4, then 1, then 1: three coins. But 3 + 3 uses only two.</>} />
          <ChoiceQuestion
            number={2}
            prompt="Which coin set is safe for greedy, meaning it is optimal for every amount?"
            options={['1, 3, 4', '1, 5, 10, 12', '1, 5, 10, 25', '1, 10, 15']}
            answer={2}
            hint="Try the smallest amount that breaks each of the others. Use the explorer above."
            explain={<>1, 5, 10, 25 never fails. The others each have a counterexample: 6 for 1, 3, 4; 15 for 1, 5, 10, 12; and 20 for 1, 10, 15 (greedy 15 + five 1s, but 10 + 10 is better).</>}
          />
          <ChoiceQuestion
            number={3}
            prompt="You want to attend as many non-overlapping events as possible. Which greedy order is always optimal?"
            options={['Earliest start first', 'Shortest event first', 'Earliest finish first', 'Fewest overlaps first']}
            answer={2}
            hint="Which choice leaves the most room for everything after it?"
            explain={<>Finishing earliest leaves the most time free. The other rules each have a small counterexample you can find in the scheduler above.</>}
          />
          <ChoiceQuestion
            number={4}
            prompt="Why does value-per-kilogram greedy work when you can take fractions but fail for whole items?"
            options={[
              'With fractions the knapsack can always be filled exactly, so no capacity is wasted',
              'Whole items are heavier',
              'The sorting step is slower',
              'It never fails for whole items either',
            ]}
            answer={0}
            hint="Look at the capacity left over in the whole-item result."
            explain={<>With whole items the last item may not fit, leaving unused capacity that a different combination could have used well. Fractions remove that waste.</>}
          />
          <ChoiceQuestion
            number={5}
            prompt="A greedy algorithm looks right on five test inputs. What do you still need before trusting it?"
            options={['More test inputs', 'A proof of optimality, such as an exchange argument', 'A faster computer', 'Nothing: greedy is always optimal']}
            answer={1}
            hint="Every wrong example in this module looked fine on some inputs."
            explain={<>Greedy can look perfect on many inputs and still fail on one. Either prove it (an exchange argument is the usual tool) or find a counterexample.</>}
          />
        </div>
      </Section>
    </ModuleShell>
  )
}
