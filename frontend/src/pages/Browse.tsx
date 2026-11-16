import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'

const selectClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-600 focus:outline-none'

export default function Browse() {
  // Filters live in the URL, so a filtered view can be shared or bookmarked.
  const [params, setParams] = useSearchParams()
  const region = params.get('region') ?? ''
  const level = params.get('level') ?? ''
  const subject = params.get('subject') ?? ''
  const q = params.get('q') ?? ''

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const regions = useQuery({ queryKey: ['regions'], queryFn: api.regions })
  const levels = useQuery({ queryKey: ['levels'], queryFn: api.levels })
  const subjects = useQuery({ queryKey: ['subjects'], queryFn: api.subjects })

  const courses = useQuery({
    queryKey: ['courses', region, level, subject, q],
    queryFn: () => api.courses({ region, level, subject, q, limit: 50 }),
    placeholderData: keepPreviousData,
  })

  const provinces = (regions.data ?? []).filter(
    (r) => r.type === 'province' || r.type === 'territory',
  )

  return (
    <div>
      <h1 className="text-2xl font-semibold">Find your course</h1>
      <p className="mt-1 text-slate-600">
        Filter by province, level and subject to find notes, past exams and study guides.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select
          aria-label="Province or territory"
          className={selectClass}
          value={region}
          onChange={(e) => setFilter('region', e.target.value)}
        >
          <option value="">All provinces and territories</option>
          {provinces.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name_en}
            </option>
          ))}
        </select>

        <select
          aria-label="Level"
          className={selectClass}
          value={level}
          onChange={(e) => setFilter('level', e.target.value)}
        >
          <option value="">All levels</option>
          {(levels.data ?? []).map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.name_en}
            </option>
          ))}
        </select>

        <select
          aria-label="Subject"
          className={selectClass}
          value={subject}
          onChange={(e) => setFilter('subject', e.target.value)}
        >
          <option value="">All subjects</option>
          {(subjects.data ?? []).map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name_en}
            </option>
          ))}
        </select>

        <input
          type="search"
          aria-label="Search courses"
          placeholder="Search by code or title"
          className={selectClass}
          value={q}
          onChange={(e) => setFilter('q', e.target.value)}
        />
      </div>

      <section className="mt-8" aria-live="polite">
        {courses.isLoading && <p className="text-slate-500">Loading courses…</p>}
        {courses.isError && (
          <p className="text-red-700">Could not load courses. Is the API running?</p>
        )}
        {courses.data && courses.data.length === 0 && (
          <p className="text-slate-500">No courses match these filters yet.</p>
        )}

        <ul className="grid gap-3 sm:grid-cols-2">
          {courses.data?.map((c) => (
            <li key={c.id}>
              <Link
                to={`/courses/${c.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-red-600"
              >
                <p className="text-sm font-semibold text-red-700">{c.code}</p>
                <p className="mt-0.5 font-medium">{c.title}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {c.region_code.replace('CA-', '')} · {c.level.replace('_', ' ')}
                  {c.grade ? ` · Grade ${c.grade}` : ''}
                  {c.institution ? ` · ${c.institution}` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
