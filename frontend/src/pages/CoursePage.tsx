import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { formatBytes } from '../format'
import { levelColor, levelLabel, provinceName } from '../lib/labels'
import { btnPrimary, btnSecondary, h1Class } from '../ui'
import { usePageTitle } from '../usePageTitle'

export default function CoursePage() {
  const courseId = Number(useParams().courseId)
  const valid = Number.isFinite(courseId)
  const [type, setType] = useState('')
  const [copied, setCopied] = useState(false)

  const course = useQuery({ queryKey: ['course', courseId], queryFn: () => api.course(courseId), enabled: valid })
  const materials = useQuery({
    queryKey: ['materials', courseId],
    queryFn: () => api.materials({ course_id: courseId, limit: 50 }),
    enabled: valid,
  })
  const regions = useQuery({ queryKey: ['regions'], queryFn: api.regions })

  usePageTitle(
    course.data ? `${course.data.code} ${course.data.title}` : 'Course',
    course.data
      ? `Free notes, past exams and study guides for ${course.data.code} ${course.data.title}${
          course.data.institution ? ` at ${course.data.institution}` : ''
        }, shared by students on NorthShelf.`
      : undefined,
  )

  if (course.isLoading) return <p className="text-muted">Loading…</p>
  if (course.isError || !course.data) {
    return (
      <div>
        <p className="font-display text-xl font-semibold text-ink">That course isn&apos;t on the shelf.</p>
        <p className="mt-2 text-soft">It may have been removed, or the link may be wrong.</p>
        <Link to="/browse" className={`${btnSecondary} mt-4`}>
          Browse all courses
        </Link>
      </div>
    )
  }

  const c = course.data
  const all = materials.data ?? []
  const types = Array.from(new Map(all.map((m) => [m.type, m.type_name])).entries())
  const shown = type ? all.filter((m) => m.type === type) : all

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked; nothing else to do
    }
  }

  return (
    <div>
      <Link to="/browse" className="text-sm text-brand underline-offset-4 hover:underline">
        All courses
      </Link>

      <div className="mt-4 flex gap-4">
        <span aria-hidden="true" className="w-2 shrink-0 rounded-full" style={{ background: levelColor(c.level) }} />
        <div>
          <h1 className={h1Class}>{c.code}</h1>
          <p className="mt-1 text-xl text-soft">{c.title}</p>
          <p className="mt-2 text-sm text-muted">
            {[provinceName(c.region_code, regions.data), levelLabel(c.level), c.grade ? `Grade ${c.grade}` : null, c.institution]
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <h2 className="font-display text-xl font-semibold text-ink">Materials</h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => void copyLink()} className={btnSecondary}>
            {copied ? 'Link copied' : 'Copy link'}
          </button>
          <Link to={`/upload?course=${c.id}`} className={btnPrimary}>
            Upload for this course
          </Link>
        </div>
      </div>

      {types.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by type">
          {[['', 'All'], ...types].map(([slug, label]) => (
            <button
              key={slug}
              type="button"
              onClick={() => setType(slug)}
              aria-pressed={type === slug}
              className={`rounded-full border px-3 py-1 text-sm ${
                type === slug ? 'border-brand bg-brand text-on-brand' : 'border-line-strong text-soft hover:bg-brand-soft'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {materials.isLoading && <p className="mt-6 text-muted">Loading materials…</p>}
      {materials.isError && <p role="alert" className="mt-6 text-danger">Could not load materials. Reload the page to try again.</p>}
      {materials.data && all.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-line-strong px-6 py-10">
          <p className="font-display text-lg font-semibold text-ink">Nothing here yet.</p>
          <p className="mt-1 max-w-md text-soft">
            Be the first to share notes, a past exam or a study guide for this course.
          </p>
          <Link to={`/upload?course=${c.id}`} className={`${btnPrimary} mt-4`}>
            Upload the first material
          </Link>
        </div>
      )}

      <ul className="mt-2">
        {shown.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4">
            <div className="min-w-0">
              <p className="font-medium text-ink">{m.title}</p>
              <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted">
                <span>{m.type_name}</span>
                {m.academic_year && <span>{m.academic_year}</span>}
                {m.term && <span>{m.term}</span>}
                <span>{m.language === 'fr' ? 'French' : 'English'}</span>
                <span>{formatBytes(m.file_size)}</span>
                <span>Shared by {m.uploader}</span>
              </p>
            </div>
            <a href={`/api/materials/${m.id}/download`} className={btnSecondary}>
              Download
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
