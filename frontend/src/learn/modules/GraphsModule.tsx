import { useMemo, useState } from 'react'
import { btnSecondary } from '../../ui'
import ModuleShell, { Card, Section } from '../components/ModuleShell'
import { ChoiceQuestion, NumberQuestion } from '../components/Questions'
import Stepper from '../components/Stepper'
import { bfsSnaps, components, dfsSnaps, GRAPH_PRESETS, labelOf, treePath } from '../engines/graphs'
import { moduleBySlug } from '../modules'

const meta = moduleBySlug('graphs')!
type Algo = 'bfs' | 'dfs'
const W = 520, H = 340

function Explorer() {
  const [presetKey, setPresetKey] = useState<keyof typeof GRAPH_PRESETS>('loops')
  const g = GRAPH_PRESETS[presetKey]
  const [algo, setAlgo] = useState<Algo>('bfs')
  const [start, setStart] = useState(0)
  const [step, setStep] = useState(0)
  const [predict, setPredict] = useState(false)
  const [answered, setAnswered] = useState(-1)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [target, setTarget] = useState(g.n - 1)

  const snaps = useMemo(() => (algo === 'bfs' ? bfsSnaps(g, start) : dfsSnaps(g, start)), [algo, g, start])
  const last = snaps.length - 1
  const snap = snaps[Math.min(step, last)]
  const finished = step >= last

  const reset = () => { setStep(0); setAnswered(-1); setFeedback(null) }
  const choosePreset = (k: keyof typeof GRAPH_PRESETS) => { setPresetKey(k); setStart(0); setTarget(GRAPH_PRESETS[k].n - 1); reset() }

  // The node that the next step that visits something will visit.
  const next = (() => {
    for (let j = step + 1; j <= last; j++) if (snaps[j].order.length > snap.order.length) return j === step + 1 ? snaps[j].order.at(-1)! : null
    return null
  })()
  const needsGuess = predict && !finished && next !== null && answered !== step

  const guess = (i: number) => {
    if (!needsGuess) return
    if (i === next) { setAnswered(step); setFeedback(`✓ Yes, ${labelOf(i)} is next.`) }
    else setFeedback(`✗ Not ${labelOf(i)}. Think about what the ${algo === 'bfs' ? 'queue' : 'stack'} says.`)
  }
  const reveal = () => { setAnswered(step); setFeedback(`The next node is ${labelOf(next!)}.`) }
  const go = (i: number) => { setStep(i); setFeedback(null) }

  const bfsTree = useMemo(() => bfsSnaps(g, start).at(-1)!.tree, [g, start])
  const dfsTree = useMemo(() => dfsSnaps(g, start).at(-1)!.tree, [g, start])
  const myTree = algo === 'bfs' ? bfsTree : dfsTree
  const myPath = finished ? treePath(myTree, start, target) : null
  const bestPath = treePath(bfsTree, start, target)
  const unreached = finished ? [...Array(g.n).keys()].filter((i) => !snap.order.includes(i)) : []
  const comps = components(g)

  const px = (i: number) => g.pos[i].x * W
  const py = (i: number) => g.pos[i].y * H
  const onPath = (a: number, b: number) => !!myPath && myPath.some((v, k) => k < myPath.length - 1 && ((v === a && myPath[k + 1] === b) || (v === b && myPath[k + 1] === a)))
  const isTree = (a: number, b: number) => snap.tree.some(([p, c]) => (p === a && c === b) || (p === b && c === a))

  const nodeClass = (i: number) => {
    if (snap.current === i) return 'fill-brand stroke-brand'
    if (algo === 'bfs') {
      if (snap.order.includes(i)) return 'fill-ok stroke-ok'
      if (snap.frontier.includes(i)) return 'fill-warn-soft stroke-warn'
    } else {
      if (snap.fin[i] !== null) return 'fill-ok stroke-ok'
      if (snap.frontier.includes(i)) return 'fill-warn-soft stroke-warn'
    }
    return 'fill-surface stroke-line-strong'
  }
  const textOn = (i: number) => (snap.current === i || (algo === 'bfs' ? snap.order.includes(i) : snap.fin[i] !== null) ? 'fill-on-brand' : 'fill-ink')

  return (
    <Card>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Graph">
        {(Object.keys(GRAPH_PRESETS) as (keyof typeof GRAPH_PRESETS)[]).map((k) => (
          <button key={k} type="button" aria-pressed={k === presetKey} className={`${btnSecondary} ${k === presetKey ? '!border-brand !bg-brand-soft' : ''}`} onClick={() => choosePreset(k)}>{GRAPH_PRESETS[k].name}</button>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">{g.note}</p>
      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex gap-2" role="group" aria-label="Algorithm">
          {(['bfs', 'dfs'] as const).map((a) => (
            <button key={a} type="button" aria-pressed={algo === a} className={`${btnSecondary} ${algo === a ? '!border-brand !bg-brand-soft' : ''}`} onClick={() => { setAlgo(a); reset() }}>{a === 'bfs' ? 'Breadth-first (BFS)' : 'Depth-first (DFS)'}</button>
          ))}
        </div>
        <label className="text-sm text-soft">Start at
          <select value={start} onChange={(e) => { setStart(Number(e.target.value)); reset() }} className="ml-2 rounded-md border border-line-strong bg-surface px-2 py-1.5 text-ink">
            {[...Array(g.n).keys()].map((i) => <option key={i} value={i}>{labelOf(i)}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={predict} onChange={(e) => { setPredict(e.target.checked); setFeedback(null) }} />
          Predict mode: click the node that will be visited next
        </label>
      </div>
      <p className="mt-2 text-sm text-soft">{algo === 'bfs' ? 'BFS explores in rings: everything 1 step away, then 2 steps away, and so on. It uses a queue (first in, first out).' : 'DFS goes as deep as it can, then backtracks. It uses a stack (last in, first out), which is what the recursion call stack does.'}</p>

      <div className="mt-4">
        <Stepper index={step} last={last} onChange={go} blockNext={needsGuess} blockedMessage="Click the node you think comes next, or press “Show me”." />
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,520px)_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-md border border-line bg-paper" role="group" aria-label={`Graph with ${g.n} nodes`}>
          {g.edges.map(([a, b], k) => (
            <g key={k}>
              {onPath(a, b) && <line x1={px(a)} y1={py(a)} x2={px(b)} y2={py(b)} strokeWidth="10" className="stroke-ok" opacity="0.35" />}
              <line x1={px(a)} y1={py(a)} x2={px(b)} y2={py(b)} strokeWidth={isTree(a, b) ? 4 : 2} className={isTree(a, b) ? 'stroke-brand' : 'stroke-line-strong'} />
            </g>
          ))}
          {[...Array(g.n).keys()].map((i) => {
            const clickable = needsGuess
            return (
              <g key={i} role={clickable ? 'button' : undefined} tabIndex={clickable ? 0 : undefined} aria-label={`Node ${labelOf(i)}`} className={clickable ? 'cursor-pointer outline-none' : ''}
                onClick={() => guess(i)} onKeyDown={(e) => clickable && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), guess(i))}>
                <circle cx={px(i)} cy={py(i)} r="20" strokeWidth={i === start ? 4 : 2.5} className={nodeClass(i)} strokeDasharray={i === start ? undefined : undefined} />
                <text x={px(i)} y={py(i) + 5} textAnchor="middle" className={`text-[15px] font-semibold ${textOn(i)}`}>{labelOf(i)}</text>
                {algo === 'bfs' && snap.level[i] !== null && <text x={px(i) + 24} y={py(i) - 16} className="fill-muted text-[12px]">{snap.level[i]}</text>}
                {algo === 'dfs' && snap.disc[i] !== null && <text x={px(i) + 24} y={py(i) - 16} className="fill-muted text-[12px]">{snap.disc[i]}/{snap.fin[i] ?? '…'}</text>}
              </g>
            )
          })}
        </svg>

        <div className="text-sm">
          <p className="font-medium text-ink">{algo === 'bfs' ? 'Queue (front → back)' : 'Call stack (bottom → top)'}</p>
          <div className="mt-1 flex min-h-9 flex-wrap gap-1.5">
            {snap.frontier.length ? snap.frontier.map((v, k) => (
              <span key={`${v}-${k}`} className="inline-flex h-8 min-w-8 items-center justify-center rounded border-2 border-warn bg-warn-soft px-2 font-semibold text-ink">{labelOf(v)}</span>
            )) : <span className="text-muted">empty</span>}
          </div>
          <p className="mt-3 font-medium text-ink">Visited, in order</p>
          <div className="mt-1 flex min-h-9 flex-wrap gap-1.5">
            {snap.order.length ? snap.order.map((v, k) => (
              <span key={v} className="inline-flex h-8 min-w-8 items-center justify-center rounded bg-ok-soft px-2 font-semibold text-ink">{labelOf(v)}<sup className="ml-0.5 text-[10px] text-muted">{k + 1}</sup></span>
            )) : <span className="text-muted">nothing yet</span>}
          </div>
          <p className="mt-3 text-soft" aria-live="polite">{feedback ?? snap.note}</p>
          {needsGuess && <button type="button" className={`${btnSecondary} mt-2`} onClick={reveal}>Show me</button>}
          <p className="mt-3 text-xs text-muted">
            {algo === 'bfs' ? 'Small numbers: distance from the start in edges.' : 'Small numbers: discovered / finished times.'} Blue edges: the search tree. Amber nodes: waiting. Green: done. Blue node: the one being processed.
          </p>
        </div>
      </div>

      {finished && (
        <div className="mt-4 border-t border-line pt-3 text-sm">
          {unreached.length > 0 && (
            <p className="mb-3 text-soft">Never reached: <strong className="text-ink">{unreached.map(labelOf).join(', ')}</strong>. They are in a different connected component, so no path leads to them. This graph has <strong className="text-ink">{comps.length}</strong> components.</p>
          )}
          <label className="text-soft">Path from {labelOf(start)} to
            <select value={target} onChange={(e) => setTarget(Number(e.target.value))} className="mx-2 rounded-md border border-line-strong bg-surface px-2 py-1.5 text-ink">
              {[...Array(g.n).keys()].filter((i) => i !== start).map((i) => <option key={i} value={i}>{labelOf(i)}</option>)}
            </select>
          </label>
          {myPath ? (
            <p className="mt-2 text-ink">
              {algo === 'bfs' ? 'BFS' : 'DFS'} found <strong>{myPath.map(labelOf).join(' → ')}</strong> ({myPath.length - 1} edges). The shortest possible is <strong>{bestPath ? bestPath.length - 1 : '—'}</strong> edges.{' '}
              {bestPath && myPath.length === bestPath.length ? <span className="font-semibold text-ok">✓ Shortest.</span> : <span className="font-semibold text-warn">✗ Longer than necessary. DFS follows whichever branch it meets first, with no regard for length.</span>}
            </p>
          ) : <p className="mt-2 text-soft">There is no path to {labelOf(target)} from {labelOf(start)}.</p>}
        </div>
      )}
    </Card>
  )
}

export default function GraphsModule() {
  return (
    <ModuleShell meta={meta}>
      <Section title="The idea">
        <p className="max-w-3xl text-soft">
          A graph is dots (nodes) joined by lines (edges): friends, roads, web pages, game moves. To search one, you keep a to-do list of nodes you have found but not yet explored. <strong className="text-ink">The only difference between BFS and DFS is how that list behaves.</strong> BFS takes the oldest item (a queue). DFS takes the newest (a stack).
        </p>
      </Section>
      <Section title="Explore a graph">
        <Explorer />
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Try the same graph with both algorithms and compare the order. Then use the path chooser at the end: BFS always finds a path with the fewest edges, and DFS sometimes finds a much longer one.
        </p>
      </Section>
      <Section title="Check your understanding">
        <div className="space-y-4">
          <ChoiceQuestion number={1} prompt="Which data structure does BFS use to hold nodes waiting to be explored, and which does DFS use?" options={['BFS: stack, DFS: queue', 'BFS: queue, DFS: stack', 'Both use a queue', 'Both use a sorted list']} answer={1} hint="BFS takes the oldest waiting node. DFS takes the newest." explain={<>BFS uses a queue (first in, first out) and DFS a stack (last in, first out). Recursive DFS gets its stack from the call stack.</>} />
          <NumberQuestion number={2} prompt={<>A path graph is A – B – C – D – E (each joined only to its neighbours). Running BFS from A, what distance, in edges, is assigned to E?</>} answer={4} tolerance={0} hint="Count the edges on the only route from A to E." explain={<>The levels are A=0, B=1, C=2, D=3, E=4.</>} />
          <ChoiceQuestion number={3} prompt="You need a route with the fewest steps in an unweighted network (for example, fewest transfers). Which search guarantees it?" options={['DFS', 'BFS', 'Either one', 'Neither one']} answer={1} hint="Look at the path chooser after a search finishes." explain={<>BFS reaches every node by a route with the fewest edges, because it finishes all nodes at distance k before any at distance k + 1. DFS can return a long winding route.</>} />
          <ChoiceQuestion number={4} prompt="Why do BFS and DFS keep track of which nodes have been discovered?" options={['To make the picture look neat', 'So that loops in the graph do not make the search go round forever', 'Because graphs cannot have loops', 'To sort the nodes']} answer={1} hint="Try the graph with loops and imagine no memory of where you have been." explain={<>If a graph has a loop and the search does not remember visited nodes, it can circle indefinitely. Marking nodes also means each node is processed once.</>} />
          <ChoiceQuestion number={5} prompt="A graph has V nodes and E edges. What is the running time of BFS or DFS when the graph is stored as adjacency lists?" options={['O(V)', 'O(E)', 'O(V + E)', 'O(V × E)']} answer={2} hint="Each node is processed once, and each edge is looked at a constant number of times." explain={<>Each node is visited once, and each edge is examined from each end, so the total work is proportional to V + E.</>} />
          <ChoiceQuestion number={6} prompt="A search from A never visits node F in a graph. What is the most likely explanation?" options={['The search has a bug', 'F is in a different connected component, so no path joins A to F', 'F has too many edges', 'Searches skip the last node']} answer={1} hint="See the “Two separate groups” graph." explain={<>A search only reaches nodes that are connected to its start. Unvisited nodes after the queue or stack empties belong to other components.</>} />
        </div>
      </Section>
    </ModuleShell>
  )
}
