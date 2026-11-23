import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { Course, Region } from '../api'
import { LEVELS, levelColor, levelLabel, provinceName } from '../lib/labels'

// Each spine gets a stable height and width from its id, so the shelf looks hand-stacked
// but never changes between visits.
function spineSize(c: Course) {
  return {
    h: 168 + ((c.id * 53) % 72),
    w: 42 + Math.min(c.code.length, 10) * 2 + ((c.id * 7) % 10),
  }
}

type Props = {
  courses: Course[] | undefined
  regions: Region[] | undefined
  failed?: boolean
}

export default function Shelf({ courses, regions, failed }: Props) {
  const [active, setActive] = useState<Course | null>(null)

  return (
    <div>
      <div className="-mx-4 overflow-x-auto px-4 pt-14">
        <div className="inline-block min-w-full">
          <ul className="flex items-end gap-1.5 px-2">
            {courses
              ? courses.map((c, i) => {
                  const { w, h } = spineSize(c)
                  return (
                    <li key={c.id}>
                      <Link
                        to={`/courses/${c.id}`}
                        className="spine"
                        style={{ '--w': `${w}px`, '--h': `${h}px`, '--c': levelColor(c.level), '--i': i } as CSSProperties}
                        aria-label={`${c.code}, ${c.title}`}
                        onMouseEnter={() => setActive(c)}
                        onMouseLeave={() => setActive(null)}
                        onFocus={() => setActive(c)}
                        onBlur={() => setActive(null)}
                      >
                        {c.code}
                      </Link>
                    </li>
                  )
                })
              : [150, 190, 170, 210, 160, 200, 180].map((h, i) => (
                  <li key={i}>
                    <div className="spine-placeholder" style={{ '--w': '52px', '--h': `${h}px` } as CSSProperties} />
                  </li>
                ))}
            {courses && (
              <li>
                <Link to="/upload" className="spine spine-ghost" style={{ '--i': courses.length } as CSSProperties}>
                  Add yours
                </Link>
              </li>
            )}
          </ul>
          <div className="shelf-board" />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="min-h-[2.75rem] max-w-xl text-sm text-soft" aria-live="polite">
          {failed ? (
            <>The shelf could not load. You can still <Link to="/browse" className="text-brand underline">browse all courses</Link>.</>
          ) : active ? (
            <>
              <strong className="font-semibold text-ink">{active.code}</strong> {active.title}
              <span className="block text-muted">
                {provinceName(active.region_code, regions)}, {levelLabel(active.level).toLowerCase()}
                {active.grade ? `, grade ${active.grade}` : ''}
                {active.institution ? `, ${active.institution}` : ''}
              </span>
            </>
          ) : (
            'Each spine is a course. Point at one to see its name, or select it to open the course.'
          )}
        </p>

        <ul className="flex shrink-0 flex-wrap gap-x-5 gap-y-2 text-sm">
          {LEVELS.map((l) => (
            <li key={l}>
              <Link to={`/browse?level=${l}`} className="inline-flex items-center gap-2 text-soft hover:text-ink">
                <span className="h-3 w-3 rounded-sm" style={{ background: levelColor(l) }} aria-hidden="true" />
                {levelLabel(l)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
