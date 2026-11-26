import { useMemo, useState } from 'react'
import { btnSecondary } from '../../ui'
import ModuleShell, { Card, Section } from '../components/ModuleShell'
import { ChoiceQuestion, NumberQuestion } from '../components/Questions'
import {
  bruteForceTSP, heuristicStats, humanTime, makeSubsetInstance, MAX_SUBSET_N, maskToPicked, nearestNeighbor, OPS_PER_SECOND,
  randomCities, solveSubsetSum, sumOfPicked, tourCount, tourLength,
} from '../engines/np'
import { moduleBySlug } from '../modules'

const meta = moduleBySlug('np-hardness')!
const sci = (v: number) => (v < 1e9 ? v.toLocaleString('en-CA') : v.toExponential(1).replace('e+', ' × 10^'))

function SubsetSection() {
  const [n, setN] = useState(12)
  const [solvable, setSolvable] = useState(true)
  const [seed, setSeed] = useState(1)
  const inst = useMemo(() => makeSubsetInstance(n, seed, solvable), [n, seed, solvable])
  return <SubsetBody key={`${n}-${seed}-${solvable}`} inst={inst} n={n} setN={setN} solvable={solvable} setSolvable={setSolvable} newSet={() => setSeed((s) => s + 1)} />
}

function SubsetBody({ inst, n, setN, solvable, setSolvable, newSet }: { inst: ReturnType<typeof makeSubsetInstance>; n: number; setN: (n: number) => void; solvable: boolean; setSolvable: (b: boolean) => void; newSet: () => void }) {
  const [picked, setPicked] = useState<boolean[]>(() => new Array(n).fill(false))
  const [result, setResult] = useState<null | { mask: number | null; checked: number; ms: number }>(null)
  const sum = sumOfPicked(inst.nums, picked)
  const hit = sum === inst.target && picked.some(Boolean)

  const search = () => {
    const t0 = performance.now()
    const r = solveSubsetSum(inst.nums, inst.target)
    setResult({ ...r, ms: performance.now() - t0 })
  }

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <label className="text-sm text-soft">Numbers: <strong className="text-ink">{n}</strong>
          <input type="range" min={6} max={MAX_SUBSET_N} value={n} onChange={(e) => setN(Number(e.target.value))} className="mt-1 block w-44 accent-[var(--brand)]" /></label>
        <div className="flex gap-2" role="group" aria-label="Instance type">
          <button type="button" aria-pressed={solvable} className={`${btnSecondary} ${solvable ? '!border-brand !bg-brand-soft' : ''}`} onClick={() => setSolvable(true)}>A solution exists</button>
          <button type="button" aria-pressed={!solvable} className={`${btnSecondary} ${!solvable ? '!border-brand !bg-brand-soft' : ''}`} onClick={() => setSolvable(false)}>No solution exists</button>
        </div>
        <button type="button" className={btnSecondary} onClick={newSet}>New numbers</button>
      </div>

      <p className="mt-4 font-medium text-ink">Pick some numbers that add up to exactly <span className="rounded bg-brand-soft px-2 py-0.5 tabular-nums">{inst.target}</span></p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Numbers to choose from">
        {inst.nums.map((v, i) => (
          <button key={i} type="button" aria-pressed={picked[i]} onClick={() => setPicked(picked.map((p, k) => (k === i ? !p : p)))}
            className={`h-10 min-w-12 rounded-md border-2 px-2 text-sm font-semibold tabular-nums ${picked[i] ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface text-ink hover:border-brand'}`}>
            {v}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm" aria-live="polite">
        Your sum: <strong className="tabular-nums text-ink">{sum}</strong>{' '}
        {hit ? <span className="font-semibold text-ok">✓ That is a valid answer.</span> : <span className="text-soft">Target {inst.target}: {sum < inst.target ? `${inst.target - sum} short` : sum > inst.target ? `${sum - inst.target} over` : 'pick at least one number'}.</span>}
      </p>
      <p className="mt-1 text-sm text-muted">
        <strong className="text-ink">Checking</strong> a choice takes {n} additions at most, however many numbers there are. That is the easy half.
      </p>

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-sm text-soft"><strong className="text-ink">Finding</strong> an answer is the hard half. Brute force tries every subset: {n} numbers means {(2 ** n - 1).toLocaleString('en-CA')} non-empty subsets.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" className={btnSecondary} onClick={search}>Let the computer search</button>
          {result?.mask != null && <button type="button" className={btnSecondary} onClick={() => setPicked(maskToPicked(result.mask!, n))}>Show me the subset</button>}
        </div>
        {result && (
          <p className="mt-3 text-sm text-ink" aria-live="polite">
            {result.mask !== null ? <>Found a subset after checking <strong>{result.checked.toLocaleString('en-CA')}</strong> subsets.</> : <>No subset works. It had to check all <strong>{result.checked.toLocaleString('en-CA')}</strong> subsets to be sure.</>}
            <span className="text-soft"> (took {result.ms < 1 ? 'under 1' : Math.round(result.ms)} ms)</span>
          </p>
        )}
        <p className="mt-2 text-xs text-muted">
          Try “No solution exists” and add one more number. The search work doubles each time. A solution found early can be luck: the honest cost is the worst case.
          {solvable ? '' : ' (This instance uses all even numbers and an odd target, so no subset can work, but the brute force does not know that trick.)'}
        </p>
      </div>
    </Card>
  )
}

function GrowthSection() {
  const rows = [10, 20, 30, 40, 50, 60, 80]
  return (
    <Card>
      <p className="text-sm text-soft">Assume a computer that does a billion simple steps per second. Compare an algorithm whose work grows like n³ with one that must try 2ⁿ possibilities.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-96 border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-ink"><th className="py-1.5 pr-4">n</th><th className="py-1.5 pr-4">n³ steps</th><th className="py-1.5 pr-4">time</th><th className="py-1.5 pr-4">2ⁿ steps</th><th className="py-1.5">time</th></tr>
          </thead>
          <tbody>
            {rows.map((k) => (
              <tr key={k} className="border-b border-line text-soft tabular-nums">
                <td className="py-1.5 pr-4 font-medium text-ink">{k}</td>
                <td className="py-1.5 pr-4">{sci(k ** 3)}</td>
                <td className="py-1.5 pr-4">{humanTime(k ** 3 / OPS_PER_SECOND)}</td>
                <td className="py-1.5 pr-4">{sci(2 ** k)}</td>
                <td className={`py-1.5 ${2 ** k / OPS_PER_SECOND > 3600 ? 'font-semibold text-warn' : ''}`}>{humanTime(2 ** k / OPS_PER_SECOND)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-soft">Buying a computer 1000 times faster only lets you add about 10 more numbers (2¹⁰ ≈ 1000). That is why waiting for faster hardware does not fix exponential growth.</p>
    </Card>
  )
}

function TspSection() {
  const [n, setN] = useState(7)
  const [seed, setSeed] = useState(3)
  const pts = useMemo(() => randomCities(n, seed), [n, seed])
  const best = useMemo(() => bruteForceTSP(pts), [pts])
  const nn = useMemo(() => nearestNeighbor(pts), [pts])
  return <TspBody key={`${n}-${seed}`} n={n} setN={setN} newMap={() => setSeed((s) => s + 1)} pts={pts} best={best} nn={nn} />
}

function TspBody({ n, setN, newMap, pts, best, nn }: { n: number; setN: (n: number) => void; newMap: () => void; pts: ReturnType<typeof randomCities>; best: ReturnType<typeof bruteForceTSP>; nn: number[] }) {
  const [mine, setMine] = useState<number[]>([])
  const [showNN, setShowNN] = useState(false)
  const [showBest, setShowBest] = useState(false)
  const [stats, setStats] = useState<null | ReturnType<typeof heuristicStats>>(null)
  const W = 520
  const px = (p: { x: number; y: number }) => `${p.x * W},${p.y * W}`
  const route = (order: number[]) => [...order, order[0]].map((i) => px(pts[i])).join(' ')
  const nnLen = tourLength(pts, nn)
  const done = mine.length === n
  const myLen = done ? tourLength(pts, mine) : null
  const click = (i: number) => { if (!mine.includes(i)) setMine([...mine, i]) }

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <label className="text-sm text-soft">Cities: <strong className="text-ink">{n}</strong>
          <input type="range" min={4} max={9} value={n} onChange={(e) => setN(Number(e.target.value))} className="mt-1 block w-40 accent-[var(--brand)]" /></label>
        <button type="button" className={btnSecondary} onClick={newMap}>New map</button>
        <button type="button" className={btnSecondary} onClick={() => setMine(mine.slice(0, -1))} disabled={!mine.length}>Undo</button>
        <button type="button" className={btnSecondary} onClick={() => setMine([])} disabled={!mine.length}>Clear</button>
      </div>
      <p className="mt-3 text-sm text-soft">Visit every city once and return to the start, with the shortest total distance. <strong className="text-ink">Click the cities in the order you would visit them.</strong> You can also use Tab and Enter.</p>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,520px)_1fr]">
        <svg viewBox={`0 0 ${W} ${W}`} className="w-full rounded-md border border-line bg-paper" role="group" aria-label="Map of cities">
          {showBest && <polyline points={route(best.order)} fill="none" strokeWidth="4" className="stroke-ok" opacity="0.85" />}
          {showNN && <polyline points={route(nn)} fill="none" strokeWidth="3" strokeDasharray="7 5" className="stroke-warn" />}
          {mine.length > 1 && <polyline points={mine.map((i) => px(pts[i])).join(' ') + (done ? ' ' + px(pts[mine[0]]) : '')} fill="none" strokeWidth="3" className="stroke-brand" />}
          {pts.map((p, i) => {
            const order = mine.indexOf(i)
            return (
              <g key={i} role="button" tabIndex={0} aria-label={`City ${i + 1}${order >= 0 ? `, visited ${order + 1}` : ''}`} className="cursor-pointer outline-none focus-visible:[&>circle]:stroke-brand"
                onClick={() => click(i)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), click(i))}>
                <circle cx={p.x * W} cy={p.y * W} r="15" className={order >= 0 ? 'fill-brand stroke-surface' : 'fill-surface stroke-line-strong'} strokeWidth="2.5" />
                <text x={p.x * W} y={p.y * W + 5} textAnchor="middle" className={`text-[14px] font-semibold ${order >= 0 ? 'fill-on-brand' : 'fill-ink'}`}>{order >= 0 ? order + 1 : i + 1}</text>
              </g>
            )
          })}
        </svg>

        <div className="text-sm">
          <ul className="space-y-2 text-soft">
            <li><span className="inline-block h-0.5 w-6 bg-brand align-middle" aria-hidden="true" /> Your tour: <strong className="text-ink tabular-nums">{myLen !== null ? myLen.toFixed(2) : `${mine.length} of ${n} cities`}</strong></li>
            <li><span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-warn align-middle" aria-hidden="true" /> Nearest neighbour: <strong className="text-ink tabular-nums">{showNN || done ? nnLen.toFixed(2) : 'hidden'}</strong></li>
            <li><span className="inline-block h-0.5 w-6 bg-ok align-middle" aria-hidden="true" /> Best possible: <strong className="text-ink tabular-nums">{showBest || done ? best.length.toFixed(2) : 'hidden'}</strong></li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} aria-pressed={showNN} onClick={() => setShowNN(!showNN)}>{showNN ? 'Hide' : 'Show'} nearest neighbour</button>
            <button type="button" className={btnSecondary} aria-pressed={showBest} onClick={() => setShowBest(!showBest)}>{showBest ? 'Hide' : 'Show'} best tour</button>
          </div>
          {myLen !== null && (
            <p className="mt-3 text-ink" aria-live="polite">
              {myLen <= best.length + 1e-9 ? <span className="font-semibold text-ok">✓ You found the best tour.</span> : <span><strong className="text-warn">Yours is {(((myLen / best.length) - 1) * 100).toFixed(1)}% longer</strong> than the best.</span>}{' '}
              {myLen < nnLen - 1e-9 ? 'You beat the nearest-neighbour heuristic.' : myLen > nnLen + 1e-9 ? 'The nearest-neighbour heuristic did better.' : 'Same as the nearest-neighbour heuristic.'}
            </p>
          )}
          <p className="mt-3 text-soft">To find the best tour the computer checked <strong className="text-ink">{best.checked.toLocaleString('en-CA')}</strong> different tours, which is (n − 1)! ÷ 2. For 20 cities that would be about <strong className="text-ink">{sci(tourCount(20))}</strong> tours: roughly {humanTime(tourCount(20) / OPS_PER_SECOND)} at a billion tours per second.</p>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <p className="text-sm text-soft"><strong className="text-ink">Nearest neighbour</strong> is a heuristic: from each city, go to the closest unvisited one. It is instant, never checks alternatives, and is often close but not best. How close? Try it on 100 random maps of {n} cities.</p>
        <button type="button" className={`${btnSecondary} mt-2`} onClick={() => setStats(heuristicStats(n, 100))}>Run 100 maps</button>
        {stats && (
          <p className="mt-2 text-sm text-ink" aria-live="polite">
            Average: <strong>{((stats.average - 1) * 100).toFixed(1)}%</strong> longer than optimal. Worst map: <strong>{((stats.worst - 1) * 100).toFixed(0)}%</strong> longer. Exactly optimal on <strong>{stats.optimalCount}</strong> of {stats.trials}.
          </p>
        )}
      </div>
    </Card>
  )
}

export default function NpModule() {
  return (
    <ModuleShell meta={meta}>
      <Section title="1. Easy to check, hard to find">
        <p className="mb-4 max-w-3xl text-soft">
          <strong className="text-ink">Subset sum</strong>: given some numbers and a target, can you pick some of them that add up to exactly the target? Try it yourself, then let the computer search.
        </p>
        <SubsetSection />
      </Section>

      <Section title="2. How fast does it blow up?">
        <GrowthSection />
      </Section>

      <Section title="3. The travelling salesman">
        <TspSection />
      </Section>

      <Section title="4. So what does “NP-hard” mean?">
        <Card>
          <dl className="space-y-3 text-sm">
            <div><dt className="font-semibold text-ink">P</dt><dd className="text-soft">Problems that can be <em>solved</em> in time that grows like a polynomial (n², n³…). Sorting is in P.</dd></div>
            <div><dt className="font-semibold text-ink">NP</dt><dd className="text-soft">Yes/no problems where a proposed answer can be <em>checked</em> in polynomial time. “Does a subset add up to this target?” is in NP: you saw the check was quick.</dd></div>
            <div><dt className="font-semibold text-ink">NP-complete</dt><dd className="text-soft">The hardest problems in NP. Subset sum and the decision version of the travelling salesman problem (“is there a tour shorter than L?”) are in this group. If you could solve any one of them quickly, you could solve every problem in NP quickly.</dd></div>
            <div><dt className="font-semibold text-ink">NP-hard</dt><dd className="text-soft">At least as hard as every problem in NP. This includes optimization versions such as “find the shortest tour”.</dd></div>
          </dl>
          <div className="mt-4 grid gap-4 border-t border-line pt-4 text-sm sm:grid-cols-2">
            <div>
              <p className="font-semibold text-ink">What it does <em>not</em> mean</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-soft">
                <li>It does not mean “impossible”. Small cases are solved all the time.</li>
                <li>It does not mean every instance is hard. Many are easy, and some special cases have fast algorithms.</li>
                <li>It is not proven that fast algorithms are impossible. Whether P = NP is a famous open question, and most experts expect the answer is no.</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-ink">What people do in practice</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-soft">
                <li><strong className="text-ink">Heuristics</strong> like nearest neighbour: fast, usually decent, no guarantee.</li>
                <li><strong className="text-ink">Approximation</strong> algorithms with a proven bound on how far off they can be.</li>
                <li><strong className="text-ink">Special structure</strong>: knapsack with small capacity is fast by dynamic programming, even though knapsack is NP-hard in general.</li>
              </ul>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Check your understanding">
        <div className="space-y-4">
          <ChoiceQuestion
            number={1}
            prompt="Which statement about subset sum is correct?"
            options={['It is hard to check a proposed subset', 'Checking a subset is quick, but no known algorithm finds one quickly in the worst case', 'It has been proven that no fast algorithm exists', 'It can only be solved by quantum computers']}
            answer={1}
            hint="Think about what you did in section 1 versus what the computer did."
            explain={<>Checking is a single pass of additions. Finding a subset has no known polynomial-time algorithm. Nobody has proven that none exists, which is exactly the P versus NP question.</>}
          />
          <NumberQuestion number={2} prompt={<>How many different tours does a 7-city travelling salesman problem have, if the start is fixed and a tour and its reverse count once?</>} answer={360} tolerance={0} hint="The formula is (n − 1)! ÷ 2." explain={<>6! = 720, and dividing by 2 for direction gives 360.</>} />
          <NumberQuestion number={3} prompt={<>About how many subsets does a set of 30 numbers have, in billions? (Give a number like 2.5.)</>} answer={1.07} tolerance={0.03} hint="The count is 2³⁰." explain={<>2³⁰ = 1 073 741 824, about 1.07 billion. Ten more numbers would multiply it by about a thousand.</>} />
          <ChoiceQuestion
            number={4}
            prompt="A problem is proven NP-hard. Which conclusion is justified?"
            options={['No computer can ever solve it', 'It is at least as hard as every problem in NP, so a fast exact algorithm for all inputs would be a major breakthrough', 'It always takes exactly 2ⁿ steps', 'It cannot be approximated at all']}
            answer={1}
            hint="Re-read the definition of NP-hard above, then think about what it leaves out."
            explain={<>NP-hard is a statement about relative difficulty. It does not forbid solving small cases, special cases, or finding good approximate answers.</>}
          />
          <ChoiceQuestion
            number={5}
            prompt="Someone discovers a fast (polynomial-time) algorithm for one NP-complete problem. What follows?"
            options={['Only that one problem becomes easy', 'Every problem in NP can be solved quickly too (so P = NP)', 'Nothing, because the algorithm must be wrong', 'Only optimization problems become easy']}
            answer={1}
            hint="NP-complete problems are the hardest in NP: every NP problem can be converted into them."
            explain={<>Every problem in NP can be converted into any NP-complete problem in polynomial time. A fast solver for one would therefore solve them all.</>}
          />
          <ChoiceQuestion
            number={6}
            prompt="The nearest-neighbour tour was usually close to the best tour but not always. What does that show about heuristics?"
            options={['They always find the best answer', 'They trade guaranteed optimality for speed, and can be good in practice', 'They are slower than brute force', 'They only work on small maps']}
            answer={1}
            hint="Check the average and the worst case from the 100-map experiment."
            explain={<>A heuristic avoids searching everything, so it is fast. The price is that it can miss the best answer, sometimes by a lot on unlucky inputs.</>}
          />
        </div>
      </Section>
    </ModuleShell>
  )
}
