import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { api, type Course } from '../api'
import { LEVELS, levelColor, levelLabel, provinceName } from '../lib/labels'
import { btnSecondary, fieldClass, h1Class } from '../ui'
import { usePageTitle } from '../usePageTitle'

function meta(c: Course, provinces: Parameters<typeof provinceName>[1]) {
  const parts = [provinceName(c.region_code, provinces), levelLabel(c.level)]
  if (c.grade) parts.push(`Grade ${c.grade}`)
  if (c.institution) parts.push(c.institution)
  return parts.join(', ')
}

export default function Browse() {
  usePageTitle('Browse courses')
  // Filters live in the URL, so a filtered view can be shared or bookmarked.
  const [params, setParams] = useSearchParams()
  const region = params.get('region') ?? ''
  const level = params.get('level') ?? ''
  const subject = params.get('subject') ?? ''
  const q = params.get('q') ?? ''
  const hasFilters = !!(region || level || subject || q)

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const regions = useQuery({ queryKey: ['regions'], queryFn: api.regions })
  const subjects = useQuery({ queryKey: ['subjects'], queryFn: api.subjects })

  const courses = useQuery({
    queryKey: ['courses', region, level, subject, q],
    queryFn: () => api.courses({ region, level, subject, q, limit: 50 }),
    placeholderData: keepPreviousData,
  })

  const provinces = (regions.data ?? []).filter((r) => r.type === 'province' || r.type === 'territory')
  const list = courses.data

  return (
    <div>
      <h1 className={h1Class}>Browse courses</h1>
      <p className="mt-2 max-w-xl text-soft">
        Choose a province, level or subject, or search for a course code.
      </p>

      <div className="mt-6 grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <select aria-label="Province or territory" className={fieldClass + ' mt-0'} value={region} onChange={(e) => setFilter('region', e.target.value)}>
          <option value="">All provinces and territories</option>
          {provinces.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name_en}
            </option>
          ))}
        </select>
        <select aria-label="Level" className={fieldClass + ' mt-0'} value={level} onChange={(e) => setFilter('level', e.target.value)}>
          <option value="">All levels</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {levelLabel(l)}
            </option>
          ))}
        </select>
        <select aria-label="Subject" className={fieldClass + ' mt-0'} value={subject} onChange={(e) => setFilter('subject', e.target.value)}>
          <option value="">All subjects</option>
          {(subjects.data ?? []).map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name_en}
            </option>
          ))}
        </select>
        <input type="search" aria-label="Search courses" placeholder="Search by code or title" className={fieldClass + ' mt-0'} value={q} onChange={(e) => setFilter('q', e.target.value)} />
      </div>

      <div className="mt-4 flex min-h-[2.25rem] items-center justify-between text-sm text-muted" aria-live="polite">
        <p>
          {list && `${list.length}${list.length === 50 ? '+' : ''} ${list.length === 1 ? 'course' : 'courses'}`}
          {list && list.length === 50 && ' (showing the first 50, narrow the filters to see more)'}
        </p>
        {hasFilters && (
          <button type="button" onClick={() => setParams({}, { replace: true })} className="text-brand underline underline-offset-4">
            Clear filters
          </button>
        )}
      </div>

      <section className="mt-2">
        {courses.isLoading && <p className="py-8 text-muted">Loading courses…</p>}
        {courses.isError && (
          <p role="alert" className="py-8 text-danger">
            Could not load courses. Check that the API is running, then reload the page.
          </p>
        )}
        {list && list.length === 0 && (
          <div className="rounded-lg border border-dashed border-line-strong px-6 py-10">
            <p className="font-display text-lg font-semibold text-ink">No courses match these filters yet.</p>
            <p className="mt-1 max-w-md text-soft">
              Try fewer filters. If your course is missing, you can add it while uploading a material.
            </p>
            <Link to="/upload" className={`${btnSecondary} mt-4`}>
              Add a course and upload
            </Link>
          </div>
        )}

        <ul className="border-t border-line">
          {list?.map((c) => (
            <li key={c.id}>
              <Link
                to={`/courses/${c.id}`}
                className="flex items-stretch gap-4 border-b border-line px-2 py-4 hover:bg-brand-soft focus-visible:bg-brand-soft"
              >
                <span aria-hidden="true" className="w-1.5 shrink-0 rounded-full" style={{ background: levelColor(c.level) }} />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-semibold text-ink">{c.code}</span>
                  <span className="block text-soft">{c.title}</span>
                  <span className="mt-1 block text-sm text-muted sm:hidden">{meta(c, regions.data)}</span>
                </span>
                <span className="hidden max-w-xs shrink-0 self-center text-right text-sm text-muted sm:block">
                  {meta(c, regions.data)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
