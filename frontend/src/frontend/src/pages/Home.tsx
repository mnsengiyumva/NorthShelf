import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import Shelf from '../components/Shelf'
import { btnPrimary, btnSecondary, h2Class } from '../ui'
import { usePageTitle } from '../usePageTitle'

const STEPS = [
  {
    title: 'Find your course',
    body: 'Filter by province, level and subject, or search for your course code.',
  },
  {
    title: 'Download what you need',
    body: 'Browsing and downloading are free and never need an account.',
  },
  {
    title: 'Share what helped you',
    body: 'Upload your own notes and study guides. A moderator reviews each one before it goes live.',
  },
]

export default function Home() {
  usePageTitle()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const regions = useQuery({ queryKey: ['regions'], queryFn: api.regions })
  const shelf = useQuery({ queryKey: ['shelf'], queryFn: () => api.courses({ limit: 18 }) })
  const provinces = (regions.data ?? []).filter((r) => r.type === 'province' || r.type === 'territory')

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const term = q.trim()
    navigate(term ? `/browse?q=${encodeURIComponent(term)}` : '/browse')
  }

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-6 pt-12 sm:pt-16">
        <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-6xl">
          Free course materials from students across Canada
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-soft">
          Notes, past exams and study guides for high school, college and university courses.
          Download without an account, and upload what helped you.
        </p>

        <form onSubmit={onSearch} role="search" className="mt-8 flex max-w-xl gap-2">
          <label htmlFor="home-search" className="sr-only">
            Search by course code or title
          </label>
          <input
            id="home-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Course code or title"
            className="min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-4 py-3 text-base text-ink placeholder:text-muted focus:border-brand focus:outline-none"
          />
          <button type="submit" className={`${btnPrimary} px-5 text-base`}>
            Search
          </button>
        </form>

        <div className="mt-10">
          <Shelf courses={shelf.data} regions={regions.data} failed={shelf.isError} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className={h2Class}>Browse by province or territory</h2>
        {regions.isLoading && <p className="mt-4 text-muted">Loading…</p>}
        <ul className="mt-5 columns-2 gap-8 text-base sm:columns-3 lg:columns-4">
          {provinces.map((r) => (
            <li key={r.code} className="mb-2 break-inside-avoid">
              <Link to={`/browse?region=${r.code}`} className="text-soft underline-offset-4 hover:text-brand hover:underline">
                {r.name_en}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className={h2Class}>How it works</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="font-display text-4xl font-semibold leading-none text-brand" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-ink">{s.title}</h3>
                  <p className="mt-1 max-w-xs text-sm leading-relaxed text-soft">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="rounded-lg bg-brand-soft px-6 py-10 sm:px-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Studied something worth sharing?
          </h2>
          <p className="mt-2 max-w-xl text-soft">
            Your notes could save another student hours. Uploading takes a couple of minutes, and
            you can remove your upload at any time.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/upload" className={btnPrimary}>
              Upload a material
            </Link>
            <Link to="/support" className={btnSecondary}>
              Support NorthShelf
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
