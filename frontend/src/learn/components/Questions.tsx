import { useId, useState, type ReactNode } from 'react'
import { btnPrimary, btnSecondary, fieldClass } from '../../ui'

type Status = 'idle' | 'wrong' | 'right' | 'revealed'

function Frame({
  number,
  prompt,
  status,
  hint,
  explain,
  children,
  onCheck,
  onReveal,
  canCheck,
}: {
  number: number
  prompt: ReactNode
  status: Status
  hint: string
  explain: ReactNode
  children: ReactNode
  onCheck: () => void
  onReveal: () => void
  canCheck: boolean
}) {
  const done = status === 'right' || status === 'revealed'
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="font-medium text-ink">
        <span className="mr-2 text-muted">{number}.</span>
        {prompt}
      </p>
      <div className="mt-3">{children}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!done && (
          <button type="button" className={btnPrimary} onClick={onCheck} disabled={!canCheck}>
            Check
          </button>
        )}
        {status === 'wrong' && (
          <button type="button" className={btnSecondary} onClick={onReveal}>
            Show the answer
          </button>
        )}
      </div>
      <div aria-live="polite">
        {status === 'wrong' && <p className="mt-3 text-sm text-warn">Not quite. Hint: {hint}</p>}
        {done && (
          <div className="mt-3 rounded-md bg-ok-soft p-3 text-sm text-ink">
            <p className="font-semibold text-ok">{status === 'right' ? 'Correct.' : 'Here is the answer.'}</p>
            <div className="mt-1 text-soft">{explain}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ChoiceQuestion({
  number,
  prompt,
  options,
  answer,
  hint,
  explain,
}: {
  number: number
  prompt: ReactNode
  options: string[]
  answer: number
  hint: string
  explain: ReactNode
}) {
  const [picked, setPicked] = useState<number | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const name = useId()
  const locked = status === 'right' || status === 'revealed'
  return (
    <Frame
      number={number}
      prompt={prompt}
      status={status}
      hint={hint}
      explain={explain}
      canCheck={picked !== null}
      onCheck={() => setStatus(picked === answer ? 'right' : 'wrong')}
      onReveal={() => {
        setPicked(answer)
        setStatus('revealed')
      }}
    >
      <fieldset className="space-y-2">
        <legend className="sr-only">Answers</legend>
        {options.map((o, i) => (
          <label key={o} className="flex cursor-pointer items-start gap-2 text-sm text-ink">
            <input
              type="radio"
              name={name}
              checked={picked === i}
              disabled={locked}
              onChange={() => {
                setPicked(i)
                if (status === 'wrong') setStatus('idle')
              }}
              className="mt-1 accent-[var(--brand)]"
            />
            <span>{o}</span>
          </label>
        ))}
      </fieldset>
    </Frame>
  )
}

export function NumberQuestion({
  number,
  prompt,
  answer,
  tolerance = 0,
  hint,
  explain,
}: {
  number: number
  prompt: ReactNode
  answer: number
  tolerance?: number
  hint: string
  explain: ReactNode
}) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const value = Number(text)
  const locked = status === 'right' || status === 'revealed'
  return (
    <Frame
      number={number}
      prompt={prompt}
      status={status}
      hint={hint}
      explain={explain}
      canCheck={text.trim() !== '' && Number.isFinite(value)}
      onCheck={() => setStatus(Math.abs(value - answer) <= tolerance ? 'right' : 'wrong')}
      onReveal={() => {
        setText(String(answer))
        setStatus('revealed')
      }}
    >
      <label className="block text-sm text-soft">
        Your answer
        <input
          inputMode="decimal"
          value={text}
          disabled={locked}
          onChange={(e) => {
            setText(e.target.value)
            if (status === 'wrong') setStatus('idle')
          }}
          className={`${fieldClass} max-w-[10rem]`}
        />
      </label>
    </Frame>
  )
}
