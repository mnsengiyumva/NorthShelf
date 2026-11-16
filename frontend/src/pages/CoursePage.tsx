import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'

export default function CoursePage() {
  const courseId = Number(useParams().courseId)

  const course = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => api.course(courseId),
    enabled: Number.isFinite(courseId),
  })

  const materials = useQuery({
    queryKey: ['materials', courseId],
    queryFn: () => api.materials({ course_id: courseId, limit: 50 }),
    enabled: Number.isFinite(courseId),
  })

  if (course.isLoading) return <p className="text-slate-500">Loading…</p>
  if (course.isError || !course.data) {
    return (
      <div>
        <p className="text-red-700">Course not found.</p>
        <Link to="/" className="text-red-700 underline">
          Back to all courses
        </Link>
      </div>
    )
  }

  const c = course.data

  return (
    <div>
      <Link to="/" className="text-sm text-red-700 hover:underline">
        ← All courses
      </Link>

      <h1 className="mt-3 text-2xl font-semibold">
        {c.code} · {c.title}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {c.region_code.replace('CA-', '')} · {c.level.replace('_', ' ')}
        {c.grade ? ` · Grade ${c.grade}` : ''}
        {c.institution ? ` · ${c.institution}` : ''}
      </p>

      <h2 className="mt-8 text-lg font-semibold">Materials</h2>

      {materials.isLoading && <p className="mt-3 text-slate-500">Loading materials…</p>}
      {materials.isError && <p className="mt-3 text-red-700">Could not load materials.</p>}
      {materials.data && materials.data.length === 0 && (
        <p className="mt-3 text-slate-500">
          Nothing here yet. Uploads are coming soon, and you&apos;ll be able to be the first to
          share something for this course.
        </p>
      )}

      <ul className="mt-3 space-y-3">
        {materials.data?.map((m) => (
          <li key={m.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="font-medium">{m.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              {m.type_name}
              {m.academic_year ? ` · ${m.academic_year}` : ''}
              {m.term ? ` · ${m.term}` : ''} · {m.language.toUpperCase()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
