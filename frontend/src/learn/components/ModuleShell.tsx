import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { h1Class, h2Class } from '../../ui'
import { usePageTitle } from '../../usePageTitle'
import { LEVEL_COLOR, LEVEL_NAME, MODULES, type ModuleMeta } from '../modules'

export function LevelBadge({ level }: { level: ModuleMeta['level'] }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold text-ink"
      style={{ borderColor: LEVEL_COLOR[level] }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: LEVEL_COLOR[level] }} aria-hidden="true" />
      {LEVEL_NAME[level]}
    </span>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-surface p-4 ${className}`}>{children}</div>
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className={h2Class}>{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function ModuleShell({ meta, children }: { meta: ModuleMeta; children: ReactNode }) {
  usePageTitle(meta.title, `${meta.tagline} ${meta.summary}`)
  const i = MODULES.findIndex((m) => m.slug === meta.slug)
  const next = MODULES[(i + 1) % MODULES.length]
  return (
    <div>
      <p className="text-sm text-muted">
        <Link to="/learn" className="underline underline-offset-4 hover:text-ink">
          Learn
        </Link>{' '}
        / {meta.title}
      </p>
      <h1 className={`${h1Class} mt-2`}>{meta.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-soft">
        <LevelBadge level={meta.level} />
        <span>{meta.subject}</span>
        <span aria-hidden="true">·</span>
        <span>about {meta.minutes} minutes</span>
        <span aria-hidden="true">·</span>
        <span>Fits courses like: {meta.courses.join(', ')}</span>
      </div>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-soft">{meta.summary}</p>

      {children}

      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-sm">
        <p className="text-soft">
          Something unclear or wrong?{' '}
          <Link to="/contact#problem" className="text-brand underline underline-offset-4">
            Tell us
          </Link>
          . We check reports quickly.
        </p>
        <Link to={`/learn/${next.slug}`} className="font-medium text-brand underline underline-offset-4">
          Next module: {next.title} →
        </Link>
      </div>
    </div>
  )
}
