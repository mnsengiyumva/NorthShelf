import { useEffect, useMemo, useState } from 'react'
import { btnSecondary, fieldClass } from '../../ui'
import ModuleShell, { Card, Section } from '../components/ModuleShell'
import { ChoiceQuestion, NumberQuestion } from '../components/Questions'
import Stepper from '../components/Stepper'
import {
  ALGO_INFO,
  ALGO_ORDER,
  doublingFactor,
  makeInput,
  measure,
  runSort,
  SIZES,
  type InputKind,
  type Measurement,
  type SortAlgo,
} from '../engines/sorting'
import { moduleBySlug } from '../modules'

const meta = moduleBySlug('sorting')!

const KIND_LABEL: Record<InputKind, string> = {
  random: 'Random order',
  sorted: 'Already sorted',
  reversed: 'Reverse sorted',
  nearly: 'Nearly sorted',
}

const STYLE: Record<SortAlgo, { color: string; dash: string }> = {
  bubble: { color: 'var(--danger)', dash: '' },
  insertion: { color: 'var(--warn)', dash: '7 4' },
  selection: { color: 'var(--muted)', dash: '2 4' },
  merge: { color: 'var(--ok)', dash: '' },
  quick: { color: 'var(--brand)', dash: '9 3 2 3' },
}

function Bars({ snap, n }: { snap: ReturnType<typeof runSort>['snapshots'][number]; n: number }) {
  const W = 640
  const hasAux = snap.aux !== null
  const H = hasAux ? 290 : 190
  const bw = W / n
  const maxV = n
  const barClass = (i: number) => {
    if (snap.done) return 'fill-ok'
    if (snap.compare.includes(i)) return 'fill-warn'
    if (snap.written.includes(i)) return 'fill-danger'
    if (snap.pivot === i) return 'fill-ink'
    if (snap.range && (i < snap.range[0] || i > snap.range[1])) return 'fill-line-strong'
    return 'fill-brand'
  }
  const row = (vals: (number | null)[], top: number, height: number, cls: (i: number) => string) =>
    vals.map((v, i) =>
      v === null ? null : (
        <g key={i}>
          <rect x={i * bw + 1} y={top + height - (v / maxV) * height} width={Math.max(bw - 2, 1)} height={(v / maxV) * height} rx="1.5" className={cls(i)} />
          {n <= 20 && (
            <text x={i * bw + bw / 2} y={top + height - 4} textAnchor="middle" fontSize="10" className="fill-on-brand" fontWeight="600">
              {v}
            </text>
          )}
        </g>
      ),
    )
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Bar chart of the list being sorted">
      {row(snap.arr, 4, 170, barClass)}
      {hasAux && (
        <>
          <text x="2" y="194" fontSize="11" className="fill-muted">
            Merge buffer
          </text>
          {row(snap.aux!, 200, 84, (i) => (snap.auxCompare.includes(i) ? 'fill-warn' : 'fill-brand-soft stroke-brand'))}
        </>
      )}
    </svg>
  )
}

function GrowthChart({ data, log }: { data: Record<SortAlgo, Measurement[]>; log: boolean }) {
  const W = 640
  const H = 320
  const m = { l: 56, r: 92, t: 12, b: 34 }
  const w = W - m.l - m.r
  const h = H - m.t - m.b
  const all = ALGO_ORDER.flatMap((a) => data[a].map((d) => d.comparisons))
  const maxY = Math.max(...all)
  const minY = Math.max(1, Math.min(...all))
  const ly = (v: number) => Math.log10(Math.max(v, 1))
  const y = (v: number) => m.t + (1 - (log ? (ly(v) - Math.floor(ly(minY))) / (Math.ceil(ly(maxY)) - Math.floor(ly(minY))) : v / maxY)) * h
  const x = (i: number) => m.l + (i / (SIZES.length - 1)) * w
  const decades: number[] = []
  for (let d = Math.floor(ly(minY)); d <= Math.ceil(ly(maxY)); d++) decades.push(10 ** d)
  const linTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxY))
  const ticks = log ? decades : linTicks
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Comparisons against list length for each algorithm">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={m.l + w} y1={y(t)} y2={y(t)} className="stroke-line" />
          <text x={m.l - 6} y={y(t) + 3} textAnchor="end" fontSize="10" className="fill-muted">
            {t.toLocaleString()}
          </text>
        </g>
      ))}
      {SIZES.map((s, i) => (
        <text key={s} x={x(i)} y={H - 14} textAnchor="middle" fontSize="10" className="fill-muted">
          {s}
        </text>
      ))}
      <text x={m.l + w / 2} y={H - 1} textAnchor="middle" fontSize="11" className="fill-soft">
        list length n
      </text>
      {ALGO_ORDER.map((a) => (
        <g key={a}>
          <polyline
            points={data[a].map((d, i) => `${x(i)},${y(d.comparisons)}`).join(' ')}
            fill="none"
            strokeWidth="2.5"
            style={{ stroke: STYLE[a].color }}
            strokeDasharray={STYLE[a].dash}
          />
          <text x={x(SIZES.length - 1) + 6} y={y(data[a][SIZES.length - 1].comparisons) + 3} fontSize="11" className="fill-ink">
            {ALGO_INFO[a].name.replace(' sort', '')}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function SortingModule() {
  const [algo, setAlgo] = useState<SortAlgo>('bubble')
  const [kind, setKind] = useState<InputKind>('random')
  const [n, setN] = useState(14)
  const [seed, setSeed] = useState(1)
  const [step, setStep] = useState(0)
  const [log, setLog] = useState(false)

  const input = useMemo(() => makeInput(kind, n, seed), [kind, n, seed])
  const run = useMemo(() => runSort(algo, input, true), [algo, input])
  useEffect(() => setStep(0), [run])
  const snap = run.snapshots[Math.min(step, run.snapshots.length - 1)]

  const race = useMemo(() => ALGO_ORDER.map((a) => ({ a, r: runSort(a, input) })), [input])
  const raceMax = Math.max(...race.map((x) => x.r.comparisons), 1)
  const growth = useMemo(() => {
    const out = {} as Record<SortAlgo, Measurement[]>
    for (const a of ALGO_ORDER) out[a] = measure(a, kind)
    return out
  }, [kind])

  const sortedCounts = useMemo(() => {
    const out = {} as Record<SortAlgo, number>
    for (const a of ALGO_ORDER) out[a] = runSort(a, makeInput('sorted', 16)).comparisons
    return out
  }, [])
  const bubbleRandom = useMemo(() => doublingFactor(measure('bubble', 'random')), [])
  const quickBig = measure('quick', 'sorted', [1024])[0].comparisons
  const mergeBig = measure('merge', 'sorted', [1024])[0].comparisons
  const info = ALGO_INFO[algo]

  return (
    <ModuleShell meta={meta}>
      <Section title="Pick an algorithm and some data">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Algorithm">
          {ALGO_ORDER.map((a) => (
            <button key={a} type="button" onClick={() => setAlgo(a)} aria-pressed={algo === a} className={`${btnSecondary} ${algo === a ? '!border-brand !bg-brand-soft' : ''}`}>
              {ALGO_INFO[a].name}
            </button>
          ))}
        </div>
        <p className="mt-3 max-w-3xl text-soft">{info.idea}</p>
        <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
          <label className="text-sm text-soft">
            Input
            <select value={kind} onChange={(e) => setKind(e.target.value as InputKind)} className={`${fieldClass} w-44`}>
              {(Object.keys(KIND_LABEL) as InputKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-soft">
            List length: <strong className="text-ink">{n}</strong>
            <input type="range" min={6} max={40} value={n} onChange={(e) => setN(Number(e.target.value))} className="mt-1 block w-48 accent-[var(--brand)]" />
          </label>
          {(kind === 'random' || kind === 'nearly') && (
            <button type="button" className={btnSecondary} onClick={() => setSeed(seed + 1)}>
              New list
            </button>
          )}
        </div>
      </Section>

      <Section title="Step through it">
        <Stepper index={step} last={run.snapshots.length - 1} onChange={setStep} />
        <p className="mt-3 min-h-[3rem] text-ink" aria-live="polite">
          {snap.note}
        </p>
        <Card className="mt-2">
          <Bars snap={snap} n={n} />
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-warn align-middle" /> being compared</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-danger align-middle" /> just written or swapped</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-ink align-middle" /> pivot</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-ok align-middle" /> sorted</span>
          </div>
          <p className="mt-3 text-sm text-soft">
            Comparisons so far: <strong className="text-ink">{snap.comparisons}</strong> · Writes so far: <strong className="text-ink">{snap.writes}</strong> (a swap is 2 writes) · Total for this run:{' '}
            <strong className="text-ink">{run.comparisons}</strong> comparisons, <strong className="text-ink">{run.writes}</strong> writes
          </p>
        </Card>
      </Section>

      <Section title="Race them on the same data">
        <p className="max-w-3xl text-soft">
          Same list ({KIND_LABEL[kind].toLowerCase()}, n = {n}). Fewer comparisons means less work. Change the input type above and watch the winner change.
        </p>
        <Card className="mt-3">
          <ul className="space-y-2">
            {race
              .slice()
              .sort((x, y) => x.r.comparisons - y.r.comparisons)
              .map(({ a, r }) => (
                <li key={a} className="grid grid-cols-[7.5rem_1fr_9rem] items-center gap-3 text-sm">
                  <span className="text-ink">{ALGO_INFO[a].name}</span>
                  <span className="h-4 rounded-sm bg-line" aria-hidden="true">
                    <span className="block h-4 rounded-sm" style={{ width: `${Math.max(2, (r.comparisons / raceMax) * 100)}%`, background: STYLE[a].color }} />
                  </span>
                  <span className="tabular-nums text-soft">
                    {r.comparisons} comparisons
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      </Section>

      <Section title="How the work grows">
        <p className="max-w-3xl text-soft">
          Counting steps on one small list does not tell you the whole story. Here each algorithm is run on lists of length 8 to 1024 ({KIND_LABEL[kind].toLowerCase()}), counting comparisons, not clock time, so the result does not depend on your computer.
          Quadratic algorithms curve upward steeply. On the log-log view, an O(n) algorithm is a line with slope 1 and an O(n²) algorithm is a line with slope 2.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={log} onChange={(e) => setLog(e.target.checked)} className="accent-[var(--brand)]" />
            Log scale on the vertical axis
          </label>
        </div>
        <Card className="mt-3">
          <GrowthChart data={growth} log={log} />
        </Card>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong text-left text-ink">
                <th className="py-2 pr-4">Algorithm</th>
                <th className="py-2 pr-4">Comparisons at n = 1024</th>
                <th className="py-2 pr-4">Each time n doubles, work grows by about</th>
                <th className="py-2 pr-4">Best</th>
                <th className="py-2 pr-4">Average</th>
                <th className="py-2 pr-4">Worst</th>
                <th className="py-2 pr-4">Extra space</th>
                <th className="py-2">Stable</th>
              </tr>
            </thead>
            <tbody>
              {ALGO_ORDER.map((a) => (
                <tr key={a} className="border-b border-line text-soft">
                  <td className="py-2 pr-4 text-ink">{ALGO_INFO[a].name}</td>
                  <td className="py-2 pr-4 tabular-nums">{growth[a][SIZES.length - 1].comparisons.toLocaleString()}</td>
                  <td className="py-2 pr-4 tabular-nums">×{doublingFactor(growth[a]).toFixed(2)}</td>
                  <td className="py-2 pr-4">{ALGO_INFO[a].best}</td>
                  <td className="py-2 pr-4">{ALGO_INFO[a].average}</td>
                  <td className="py-2 pr-4">{ALGO_INFO[a].worst}</td>
                  <td className="py-2 pr-4">{ALGO_INFO[a].space}</td>
                  <td className="py-2">{ALGO_INFO[a].stable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Doubling n and seeing the work grow ×2 to ×2.4 is the fingerprint of n log n. Growth near ×4 is the fingerprint of n². The theory columns describe the algorithms as taught; the quick sort here uses the last element as its pivot.
        </p>
      </Section>

      <Section title="Check your understanding">
        <div className="space-y-4">
          <NumberQuestion
            number={1}
            prompt="Insertion sort is run on a list of 10 that is already sorted. How many comparisons does it make?"
            answer={runSort('insertion', makeInput('sorted', 10)).comparisons}
            hint="Each new element is compared with the one before it, finds it is not smaller, and stops. How many elements are there after the first?"
            explain={<>Just {runSort('insertion', makeInput('sorted', 10)).comparisons}: one comparison for each of the 9 elements after the first. That is why insertion sort is O(n) on sorted data.</>}
          />
          <ChoiceQuestion
            number={2}
            prompt="On an already sorted list of 16 numbers, which algorithm makes the fewest comparisons?"
            options={['Selection sort', 'Insertion sort', 'Merge sort', 'Quick sort (last element as pivot)']}
            answer={1}
            hint="Think about which algorithms can notice that nothing needs to move. Try them on the “Already sorted” input above."
            explain={<>Insertion sort: {sortedCounts.insertion}. Merge sort: {sortedCounts.merge}. Selection sort and quick sort: {sortedCounts.selection} and {sortedCounts.quick}. “O(n log n)” does not always beat “O(n²)”: the best case of insertion sort is O(n).</>}
          />
          <ChoiceQuestion
            number={3}
            prompt="Bubble sort on random data takes T comparisons for a list of length n. Roughly how many does it take for length 2n?"
            options={['About 2T', 'About 4T', 'About 8T', 'About T + n']}
            answer={1}
            hint="Bubble sort compares about n²/2 pairs. What is (2n)² compared with n²?"
            explain={<>Doubling n multiplies the work by about {bubbleRandom.toFixed(2)}, which is close to ×4, as the n² formula predicts.</>}
          />
          <ChoiceQuestion
            number={4}
            prompt="Quick sort that always picks the last element as pivot is run on an already sorted list of 1024 numbers. What happens?"
            options={[
              'It is at its best: about n log n comparisons',
              'It degenerates: every partition peels off one element, giving about n²/2 comparisons',
              'It makes exactly as many comparisons as merge sort',
              'It does not terminate',
            ]}
            answer={1}
            hint="With the largest element as pivot, how many elements end up on each side of it?"
            explain={<>It makes {quickBig.toLocaleString()} comparisons, which is exactly n(n−1)/2, compared with {mergeBig.toLocaleString()} for merge sort. Real implementations pick pivots randomly or by median-of-three to avoid this.</>}
          />
        </div>
      </Section>
    </ModuleShell>
  )
}
