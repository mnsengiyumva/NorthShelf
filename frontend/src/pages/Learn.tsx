import { Link } from 'react-router-dom'
import { LevelBadge } from '../learn/components/ModuleShell'
import { MODULES } from '../learn/modules'
import { h1Class } from '../ui'
import { usePageTitle } from '../usePageTitle'

export default function Learn() {
  usePageTitle(
    'Learn by experimenting',
    'Interactive explainers for algorithms, graphs, dynamic programming, NP-hardness, limits, derivatives, integrals and matrices. Experiment with the idea, predict what happens, then check your understanding.',
  )
  return (
    <div>
      <h1 className={h1Class}>Learn by experimenting</h1>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-soft">
        Past papers show you what questions look like. These modules help you understand why the answers are what they are. Change the input, predict what will happen, watch it happen, then check yourself. Nothing here to memorize.
      </p>
      {(['Computer science', 'Mathematics'] as const).map((subject) => (
        <section key={subject} className="mt-10" aria-labelledby={`subject-${subject}`}>
          <h2 id={`subject-${subject}`} className="font-display text-2xl font-semibold text-ink">{subject}</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {MODULES.filter((m) => m.subject === subject).map((m) => (
              <li key={m.slug}>
                <Link
                  to={`/learn/${m.slug}`}
                  className="flex h-full flex-col rounded-lg border border-line bg-surface p-5 transition hover:border-brand hover:shadow-sm"
                >
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <LevelBadge level={m.level} />
                  </div>
                  <h3 className="mt-3 font-display text-xl font-semibold text-ink">{m.title}</h3>
                  <p className="mt-1 text-sm font-medium text-brand">{m.tagline}</p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-soft">{m.summary}</p>
                  <p className="mt-3 text-xs text-muted">
                    About {m.minutes} minutes · Fits: {m.courses.join(', ')}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="mt-8 max-w-3xl text-sm text-muted">
        These first modules are pitched at university level. High school and college versions are planned. If something here is unclear or wrong, or you want a topic covered,{' '}
        <Link to="/contact#problem" className="text-brand underline underline-offset-4">
          tell us
        </Link>
        .
      </p>
    </div>
  )
}
