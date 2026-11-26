import { useEffect, useState } from 'react'
import { btnPrimary, btnSecondary } from '../../ui'

/** Reset / back / play / next controls and a scrubber for any list of steps. */
export default function Stepper({
  index,
  last,
  onChange,
  blockNext = false,
  blockedMessage,
}: {
  index: number
  last: number
  onChange: (i: number) => void
  blockNext?: boolean
  blockedMessage?: string
}) {
  const [playing, setPlaying] = useState(false)
  const [delay, setDelay] = useState(500)

  useEffect(() => {
    if (!playing) return
    if (index >= last || blockNext) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => onChange(index + 1), delay)
    return () => clearTimeout(t)
  }, [playing, index, last, delay, blockNext, onChange])

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      onKeyDown={(e) => {
        if (e.target instanceof HTMLInputElement && e.target.type === 'range') return
        if (e.key === 'ArrowRight' && !blockNext) onChange(Math.min(last, index + 1))
        if (e.key === 'ArrowLeft') onChange(Math.max(0, index - 1))
      }}
    >
      <button type="button" className={btnSecondary} onClick={() => { setPlaying(false); onChange(0) }} disabled={index === 0}>
        Reset
      </button>
      <button type="button" className={btnSecondary} onClick={() => onChange(index - 1)} disabled={index === 0} aria-label="Previous step">
        ← Back
      </button>
      <button type="button" className={btnSecondary} onClick={() => setPlaying(!playing)} disabled={index >= last || blockNext}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <button type="button" className={btnPrimary} onClick={() => onChange(index + 1)} disabled={index >= last || blockNext} aria-label="Next step">
        Next →
      </button>
      <input
        type="range"
        min={0}
        max={last}
        value={index}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mx-2 min-w-[8rem] flex-1 accent-[var(--brand)]"
        aria-label="Step"
      />
      <span className="text-sm tabular-nums text-muted">
        {index} / {last}
      </span>
      <label className="flex items-center gap-1 text-sm text-muted">
        Speed
        <select value={delay} onChange={(e) => setDelay(Number(e.target.value))} className="rounded-md border border-line-strong bg-surface px-1 py-1 text-sm text-ink">
          <option value={1000}>Slow</option>
          <option value={500}>Normal</option>
          <option value={150}>Fast</option>
        </select>
      </label>
      {blockNext && blockedMessage && <p className="w-full text-sm text-warn">{blockedMessage}</p>}
    </div>
  )
}
