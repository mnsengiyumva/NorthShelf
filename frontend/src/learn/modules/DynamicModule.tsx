import { useMemo, useState, type ReactNode } from 'react'
import { btnSecondary, fieldClass } from '../../ui'
import ModuleShell, { Card, Section } from '../components/ModuleShell'
import { ChoiceQuestion, NumberQuestion } from '../components/Questions'
import Stepper from '../components/Stepper'
import { coinTable, coinTrace, KNAPSACK_DP_PRESETS, knapsackGrid, knapsackTrace, lcsGrid, lcsTrace, naiveCalls } from '../engines/dp'
import { moduleBySlug } from '../modules'

const meta = moduleBySlug('dynamic-programming')!

type Pos = [number, number]
interface Built {
  rowHead: string
  colHead: string
  rows: string[]
  cols: string[]
  base: { r: number; c: number; text: string }[]
  order: { r: number; c: number; text: string; answer: number; deps: Pos[]; why: ReactNode }[]
  tracePath: Pos[]
  solution: ReactNode
  recurrence: ReactNode
}

const show = (v: number) => (Number.isFinite(v) ? String(v) : '∞')

/* ---------- builders ---------- */
function buildCoins(coins: number[], amount: number): Built {
  const t = coinTable(coins, amount)
  const tr = coinTrace(t, amount)
  return {
    rowHead: '', colHead: 'amount',
    rows: ['fewest coins'], cols: t.map((c) => String(c.amount)),
    base: [{ r: 0, c: 0, text: '0' }],
    order: t.slice(1).map((cell) => ({
      r: 0, c: cell.amount, text: show(cell.value), answer: cell.value,
      deps: cell.candidates.map((x): Pos => [0, x.from]),
      why: cell.candidates.length === 0
        ? <>No coin leads to a reachable smaller amount, so <strong>T[{cell.amount}] = ∞</strong> (cannot be made).</>
        : <>To make {cell.amount}, try each coin c and use T[{cell.amount} − c] + 1: {cell.candidates.map((x) => `coin ${x.coin} → T[${x.from}] + 1 = ${x.total}`).join('; ')}. The smallest is <strong>{cell.value}</strong>.</>,
    })),
    tracePath: tr ? (() => { const p: Pos[] = []; let a = amount; while (a > 0) { p.push([0, a]); a -= t[a].via! } p.push([0, 0]); return p })() : [],
    solution: tr ? <>Trace back from the last cell: each cell remembers the coin that gave its best value. Coins: <strong>{tr.join(' + ')}</strong> = {amount}, using {tr.length} coins.</> : <>{amount} cannot be made with these coins.</>,
    recurrence: <>T[0] = 0, and T[a] = 1 + min over coins c ≤ a of T[a − c].</>,
  }
}

function buildKnapsack(items: { name: string; weight: number; value: number }[], cap: number): Built {
  const g = knapsackGrid(items, cap)
  const { chosen, path } = knapsackTrace(g, items)
  return {
    rowHead: 'items considered', colHead: 'capacity',
    rows: ['none', ...items.map((it) => `${it.name} (w${it.weight}, v${it.value})`)], cols: Array.from({ length: cap + 1 }, (_, w) => String(w)),
    base: g[0].map((c) => ({ r: 0, c: c.w, text: '0' })),
    order: g.slice(1).flatMap((row, k) => {
      const it = items[k]
      return row.map((cell) => {
        const skip = g[cell.i - 1][cell.w].value
        const fits = cell.w >= it.weight
        const takeVal = fits ? g[cell.i - 1][cell.w - it.weight].value + it.value : null
        return {
          r: cell.i, c: cell.w, text: String(cell.value), answer: cell.value,
          deps: [[cell.i - 1, cell.w], ...(fits ? [[cell.i - 1, cell.w - it.weight] as Pos] : [])] as Pos[],
          why: fits
            ? <>Item {it.name} fits. Skip it: {skip}. Take it: {it.value} + best with {cell.w - it.weight} kg left ({takeVal! - it.value}) = {takeVal}. Keep the larger: <strong>{cell.value}</strong>.</>
            : <>Item {it.name} weighs {it.weight} but only {cell.w} is available, so it cannot be taken. Copy the cell above: <strong>{cell.value}</strong>.</>,
        }
      })
    }),
    tracePath: path,
    solution: <>Trace back from the bottom-right cell: if a cell differs from the one above, the item was taken. Best choice: <strong>{chosen.map((c) => c.name).join(' + ') || 'nothing'}</strong>, total value <strong>{g[items.length][cap].value}</strong>.</>,
    recurrence: <>K[i][w] = max( K[i−1][w], value + K[i−1][w − weight] ), where the second option only exists if the item fits.</>,
  }
}

function buildLcs(a: string, b: string): Built {
  const g = lcsGrid(a, b)
  const { text, path } = lcsTrace(g, a)
  const order: Built['order'] = []
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cell = g[i][j]
      order.push({
        r: i, c: j, text: String(cell.value), answer: cell.value,
        deps: cell.move === 'match' ? [[i - 1, j - 1]] : [[i - 1, j], [i, j - 1]],
        why: cell.move === 'match'
          ? <>The letters match (“{a[i - 1]}”). Extend the best answer for both shorter strings: {g[i - 1][j - 1].value} + 1 = <strong>{cell.value}</strong>.</>
          : <>“{a[i - 1]}” and “{b[j - 1]}” differ. Drop one letter or the other and keep the better: max({g[i - 1][j].value}, {g[i][j - 1].value}) = <strong>{cell.value}</strong>.</>,
      })
    }
  }
  return {
    rowHead: 'first string', colHead: 'second string',
    rows: ['', ...a.split('')], cols: ['', ...b.split('')],
    base: [...g[0].map((c) => ({ r: 0, c: c.j, text: '0' })), ...g.slice(1).map((row) => ({ r: row[0].i, c: 0, text: '0' }))],
    order, tracePath: path,
    solution: <>Trace back from the bottom-right: diagonal moves are matched letters. Longest common subsequence: <strong>{text || '(empty)'}</strong>, length {text.length}.</>,
    recurrence: <>If the letters match, L[i][j] = L[i−1][j−1] + 1. Otherwise L[i][j] = max(L[i−1][j], L[i][j−1]).</>,
  }
}

/* ---------- the stepping view ---------- */
function ProblemView({ built, extra }: { built: Built; extra?: ReactNode }) {
  const [step, setStep] = useState(0)
  const [predict, setPredict] = useState(false)
  const [guess, setGuess] = useState('')
  const [okStep, setOkStep] = useState(-1)
  const [traced, setTraced] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const last = built.order.length
  const finished = step >= last
  const focusIdx = predict && !finished ? step : step - 1
  const focus = focusIdx >= 0 ? built.order[focusIdx] : null
  const filled = (r: number, c: number) => built.base.some((b) => b.r === r && b.c === c) ? built.base.find((b) => b.r === r && b.c === c)!.text : (() => { const k = built.order.findIndex((o) => o.r === r && o.c === c); return k >= 0 && k < step ? built.order[k].text : null })()
  const inPath = (r: number, c: number) => traced && built.tracePath.some(([pr, pc]) => pr === r && pc === c)
  const isDep = (r: number, c: number) => !!focus && focus.deps.some(([dr, dc]) => dr === r && dc === c)

  const check = () => {
    if (!focus) return
    const g = guess.trim().toLowerCase()
    const ok = Number.isFinite(focus.answer) ? g !== '' && Number(g) === focus.answer : ['inf', 'infinity', '∞'].includes(g)
    if (ok) { setOkStep(step); setFeedback('✓ Correct. Press Next to fill it in.') } else setFeedback('✗ Not quite. Look at the highlighted cells it depends on.')
  }
  const reveal = () => { setOkStep(step); setFeedback(`The answer is ${show(focus!.answer)}. Press Next to fill it in.`) }
  const go = (i: number) => { setStep(i); setGuess(''); setFeedback(null); setTraced(false) }

  return (
    <Card>
      <p className="text-sm text-soft">Rule: {built.recurrence}</p>
      <label className="mt-3 flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={predict} onChange={(e) => { setPredict(e.target.checked); setFeedback(null); setGuess('') }} />
        Predict mode: work out each cell before it is filled
      </label>
      <div className="mt-3">
        <Stepper index={step} last={last} onChange={go} blockNext={predict && !finished && okStep !== step} blockedMessage="Work out the highlighted cell first, or press “Show me”." />
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="border-collapse text-center text-sm tabular-nums">
          <thead>
            <tr>
              <th className="p-1 text-left text-xs font-normal text-muted">{built.rowHead && `${built.rowHead} ↓ / `}{built.colHead} →</th>
              {built.cols.map((c, j) => <th key={j} scope="col" className="min-w-9 p-1 font-medium text-soft">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {built.rows.map((rl, r) => (
              <tr key={r}>
                <th scope="row" className="whitespace-nowrap p-1 pr-2 text-left font-medium text-soft">{rl}</th>
                {built.cols.map((_, c) => {
                  const v = filled(r, c)
                  const isFocus = !!focus && focus.r === r && focus.c === c
                  const cls = inPath(r, c) ? 'bg-ok-soft border-ok text-ink' : isFocus ? 'bg-brand-soft border-brand text-ink' : isDep(r, c) ? 'bg-warn-soft border-warn text-ink' : 'border-line text-ink'
                  return (
                    <td key={c} className={`h-9 min-w-9 border ${cls}`}>
                      {isFocus && predict && v === null ? <span className="text-brand">?</span> : v}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-muted">Blue: the cell in focus. Amber: the earlier cells it depends on. Green: the trace-back path.</p>

      <div className="mt-3 text-sm" aria-live="polite">
        {focus ? (
          <>
            {predict && !finished && okStep !== step && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <label className="text-soft">Value of the highlighted cell: <input value={guess} onChange={(e) => setGuess(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && check()} className={`${fieldClass} ml-1 inline-block w-20`} inputMode="numeric" /></label>
                <button type="button" className={btnSecondary} onClick={check}>Check</button>
                <button type="button" className={btnSecondary} onClick={reveal}>Show me</button>
              </div>
            )}
            {feedback && <p className="mb-1 font-medium text-ink">{feedback}</p>}
            {(!predict || finished || okStep === step) && <p className="text-soft">{focus.why}</p>}
            {predict && !finished && okStep !== step && <p className="text-muted">Hint: it depends only on the amber cells.</p>}
          </>
        ) : <p className="text-soft">Press Next to fill the first cell. The shaded first row and column are the starting values.</p>}
      </div>

      {finished && (
        <div className="mt-4 border-t border-line pt-3">
          <button type="button" className={btnSecondary} onClick={() => setTraced((t) => !t)} aria-pressed={traced}>{traced ? 'Hide trace-back' : 'Trace back the solution'}</button>
          {traced && <p className="mt-2 text-sm text-soft">{built.solution}</p>}
        </div>
      )}
      {extra}
    </Card>
  )
}

/* ---------- problem pickers ---------- */
const COIN_SETS = [
  { label: '1, 3, 4', coins: [1, 3, 4], amount: 10 },
  { label: '1, 5, 10, 12', coins: [1, 5, 10, 12], amount: 20 },
  { label: '2, 5 (some amounts impossible)', coins: [2, 5], amount: 11 },
]
const LCS_PAIRS: [string, string][] = [['AGGTAB', 'GXTXAYB'], ['KITTEN', 'SITTING'], ['ABCBDAB', 'BDCABA']]

function CoinProblem() {
  const [setIdx, setSetIdx] = useState(0)
  const [amountText, setAmountText] = useState(String(COIN_SETS[0].amount))
  const preset = COIN_SETS[setIdx]
  const amount = Number(amountText)
  const ok = Number.isInteger(amount) && amount >= 1 && amount <= 40
  const built = useMemo(() => (ok ? buildCoins(preset.coins, amount) : null), [preset, amount, ok])
  const naive = ok ? naiveCalls(preset.coins, amount) : 0
  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        {COIN_SETS.map((s, i) => (
          <button key={s.label} type="button" className={`${btnSecondary} ${i === setIdx ? '!border-brand !bg-brand-soft' : ''}`} onClick={() => { setSetIdx(i); setAmountText(String(s.amount)) }}>Coins {s.label}</button>
        ))}
        <label className="text-sm text-soft">Amount <input value={amountText} onChange={(e) => setAmountText(e.target.value)} inputMode="numeric" className={`${fieldClass} ml-1 inline-block w-20`} aria-invalid={!ok} /></label>
      </div>
      {!ok && <p role="alert" className="mt-2 text-sm text-warn">Enter a whole number from 1 to 40.</p>}
      {built && (
        <div className="mt-3">
          <ProblemView key={`${setIdx}-${amount}`} built={built} extra={
            <p className="mt-4 border-t border-line pt-3 text-sm text-soft">
              This table has <strong className="text-ink">{amount + 1} cells</strong>. Plain recursion without remembering would make about <strong className="text-ink">{naive > 1e9 ? naive.toExponential(1).replace('e+', ' × 10^') : naive.toLocaleString('en-CA')}</strong> calls, because it solves the same smaller amounts again and again.
            </p>
          } />
        </div>
      )}
    </>
  )
}

function KnapsackProblem() {
  const [key, setKey] = useState<keyof typeof KNAPSACK_DP_PRESETS>('small')
  const [cap, setCap] = useState(KNAPSACK_DP_PRESETS.small.cap)
  const p = KNAPSACK_DP_PRESETS[key]
  const built = useMemo(() => buildKnapsack(p.items, cap), [p, cap])
  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        {(Object.keys(KNAPSACK_DP_PRESETS) as (keyof typeof KNAPSACK_DP_PRESETS)[]).map((k) => (
          <button key={k} type="button" className={`${btnSecondary} ${k === key ? '!border-brand !bg-brand-soft' : ''}`} onClick={() => { setKey(k); setCap(KNAPSACK_DP_PRESETS[k].cap) }}>{KNAPSACK_DP_PRESETS[k].label}</button>
        ))}
        <label className="text-sm text-soft">Capacity = <strong className="text-ink">{cap}</strong>
          <input type="range" min={1} max={12} value={cap} onChange={(e) => setCap(Number(e.target.value))} className="mt-1 block w-44 accent-[var(--brand)]" /></label>
      </div>
      <div className="mt-3"><ProblemView key={`${key}-${cap}`} built={built} /></div>
      {key === 'trap' && <p className="mt-2 text-sm text-muted">Greedy by value per kg takes A and then B (total value 16) and gets stuck. The table finds B + C, worth 22.</p>}
    </>
  )
}

function LcsProblem() {
  const [pair, setPair] = useState<[string, string]>(LCS_PAIRS[0])
  const [aText, setAText] = useState(LCS_PAIRS[0][0])
  const [bText, setBText] = useState(LCS_PAIRS[0][1])
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
  const a = clean(aText), b = clean(bText)
  const ok = a.length > 0 && b.length > 0
  const built = useMemo(() => (ok ? buildLcs(a, b) : null), [a, b, ok])
  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        {LCS_PAIRS.map((pr) => (
          <button key={pr.join()} type="button" className={`${btnSecondary} ${pr === pair ? '!border-brand !bg-brand-soft' : ''}`} onClick={() => { setPair(pr); setAText(pr[0]); setBText(pr[1]) }}>{pr[0]} / {pr[1]}</button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm text-soft">First string<input value={aText} onChange={(e) => setAText(e.target.value)} className={`${fieldClass} mt-1 w-40 font-mono`} maxLength={10} /></label>
        <label className="text-sm text-soft">Second string<input value={bText} onChange={(e) => setBText(e.target.value)} className={`${fieldClass} mt-1 w-40 font-mono`} maxLength={10} /></label>
        <span className="text-xs text-muted">Letters and digits, up to 10 each.</span>
      </div>
      {built ? <div className="mt-3"><ProblemView key={`${a}|${b}`} built={built} /></div> : <p role="alert" className="mt-2 text-sm text-warn">Enter at least one character in each string.</p>}
    </>
  )
}

export default function DynamicModule() {
  const [tab, setTab] = useState<'coins' | 'knapsack' | 'lcs'>('coins')
  const tabs = [['coins', 'Coin change'], ['knapsack', 'Knapsack'], ['lcs', 'Longest common subsequence']] as const
  return (
    <ModuleShell meta={meta}>
      <Section title="The idea">
        <p className="max-w-3xl text-soft">
          Some problems are built from smaller copies of themselves, and the same smaller copies show up again and again. Dynamic programming solves each smaller problem <strong className="text-ink">once</strong>, writes the answer in a table, and builds bigger answers from the table. Pick a problem, then step through the table one cell at a time.
        </p>
      </Section>
      <Section title="Fill the table">
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Problem">
          {tabs.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={`${btnSecondary} ${tab === k ? '!border-brand !bg-brand-soft' : ''}`} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        {tab === 'coins' && <CoinProblem />}
        {tab === 'knapsack' && <KnapsackProblem />}
        {tab === 'lcs' && <LcsProblem />}
      </Section>
      <Section title="Check your understanding">
        <div className="space-y-4">
          <NumberQuestion number={1} prompt={<>Coins are 1, 3 and 4. What is the fewest number of coins that make 10?</>} answer={3} tolerance={0} hint="Fill the table for amounts 1 up to 10. Each cell looks back 1, 3 and 4 cells." explain={<>3 + 3 + 4 = 10 uses three coins, and no two coins can make 10.</>} />
          <NumberQuestion number={2} prompt={<>What is the length of the longest common subsequence of ABCDE and ACE?</>} answer={3} tolerance={0} hint="A subsequence keeps the order but may skip letters." explain={<>ACE appears in both, in order, so the length is 3.</>} />
          <ChoiceQuestion
            number={3}
            prompt="Why is a DP table so much faster than plain recursion on these problems?"
            options={['The computer works in parallel', 'The same smaller problems come up many times, and the table solves each only once', 'The table avoids using memory', 'Recursion is always slower than loops']}
            answer={1}
            hint="Compare the number of table cells with the number of recursive calls in the coin section."
            explain={<>Plain recursion re-solves the same subproblems exponentially many times. A table solves each one once, so the work is the number of cells.</>}
          />
          <ChoiceQuestion
            number={4}
            prompt="The table gives the best value. How do you get the actual solution (which coins, which items, which letters)?"
            options={['Run the whole algorithm again', 'Trace back from the final cell, following which choice produced each value', 'Sort the table', 'It is impossible to recover']}
            answer={1}
            hint="Look at what the green path does."
            explain={<>Each cell was computed from a specific earlier cell. Following those links from the last cell back to the start recovers the choices.</>}
          />
          <ChoiceQuestion
            number={5}
            prompt="A knapsack table has n items and capacity W. How many cells does it have?"
            options={['2ⁿ', '(n + 1) × (W + 1)', 'n!', 'n + W']}
            answer={1}
            hint="One row per item (plus a start row), one column per capacity from 0 to W."
            explain={<>The table is (n + 1) × (W + 1). That is fast when W is small, but W can be huge as a number, so this is called pseudo-polynomial. The NP-hardness module explains why that still does not make knapsack easy.</>}
          />
        </div>
      </Section>
    </ModuleShell>
  )
}
