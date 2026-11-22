import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { api, type Course } from '../api'
import AddCourse from './AddCourse'
import { useAuth } from '../auth'
import { inputClass } from './Login'

const MAX_MB = 25

export default function Upload() {
  const { user, isLoading } = useAuth()
  const [params] = useSearchParams()
  const presetId = Number(params.get('course'))

  const [picked, setPicked] = useState<Course | null>(null)
  const [courseQuery, setCourseQuery] = useState('')
  const [materialType, setMaterialType] = useState('')
  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [term, setTerm] = useState('')
  const [language, setLanguage] = useState('en')
  const [license, setLicense] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newCourseNote, setNewCourseNote] = useState(false)

  const preset = useQuery({
    queryKey: ['course', presetId],
    queryFn: () => api.course(presetId),
    enabled: Number.isFinite(presetId) && presetId > 0,
  })
  const course = picked ?? preset.data ?? null

  const results = useQuery({
    queryKey: ['course-search', courseQuery],
    queryFn: () => api.courses({ q: courseQuery, limit: 8 }),
    enabled: courseQuery.trim().length >= 2,
  })
  const types = useQuery({ queryKey: ['material-types'], queryFn: api.materialTypes })
  const licenses = useQuery({ queryKey: ['licenses'], queryFn: api.licenses })

  if (isLoading) return null
  if (!user) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold">Share a material</h1>
        <p className="mt-3 text-slate-600">
          You need an account to upload. It&apos;s free, and browsing and downloading never require one.
        </p>
        <div className="mt-4 flex gap-4 text-sm">
          <Link to="/login" className="text-red-700 underline">
            Log in
          </Link>
          <Link to="/signup" className="text-red-700 underline">
            Create an account
          </Link>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold">Thank you!</h1>
        <p className="mt-3 text-slate-600">
          Your upload is waiting for a quick review. Once it&apos;s approved, it will appear on the
          course page for everyone.
        </p>
        <div className="mt-4 flex gap-4 text-sm">
          <Link to="/my-uploads" className="text-red-700 underline">
            See my uploads
          </Link>
          <Link to="/" className="text-red-700 underline">
            Back to browsing
          </Link>
        </div>
      </div>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!course) return setError('Please choose a course')
    if (!file) return setError('Please choose a file')
    if (file.size > MAX_MB * 1024 * 1024) return setError(`That file is larger than ${MAX_MB} MB`)

    const form = new FormData()
    form.set('file', file)
    form.set('course_id', String(course.id))
    form.set('material_type', materialType)
    form.set('title', title)
    form.set('license', license)
    form.set('language', language)
    form.set('own_work_confirmed', confirmed ? 'true' : 'false')
    if (year) form.set('academic_year', year)
    if (term) form.set('term', term)
    if (description) form.set('description', description)

    setBusy(true)
    try {
      await api.uploadMaterial(form)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">Share a material</h1>
      <p className="mt-1 text-sm text-slate-600">
        PDF, PNG or JPEG, up to {MAX_MB} MB. Uploads are reviewed before they appear.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div>
          <p className="text-sm font-medium">Course</p>
          {course ? (
            <div className="mt-1 flex items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
              <span>
                <strong>{course.code}</strong> · {course.title}
              </span>
              <button
                type="button"
                className="text-red-700 hover:underline"
                onClick={() => {
                  setPicked(null)
                  setNewCourseNote(false)
                  setCourseQuery('')
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                type="search"
                aria-label="Search for a course"
                placeholder="Search by course code or title, e.g. MHF4U"
                className={inputClass}
                value={courseQuery}
                onChange={(e) => setCourseQuery(e.target.value)}
              />
              {results.data && results.data.length === 0 && (
                <p className="mt-2 text-sm text-slate-500">No matching courses yet.</p>
              )}
              <ul className="mt-2 space-y-1">
                {results.data?.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setPicked(c)}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-red-600"
                    >
                      <strong>{c.code}</strong> · {c.title}{' '}
                      <span className="text-xs text-slate-500">
                        ({c.region_code.replace('CA-', '')}, {c.level.replace('_', ' ')})
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {!adding && (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="mt-3 text-sm text-red-700 hover:underline"
                >
                  Can&apos;t find your course? Add it
                </button>
              )}
              {adding && (
                <AddCourse
                  initialCode={courseQuery.trim().length >= 2 ? courseQuery.trim() : ''}
                  onCancel={() => setAdding(false)}
                  onCreated={(created) => {
                    setPicked(created)
                    setNewCourseNote(created.status === 'pending')
                    setAdding(false)
                  }}
                />
              )}
            </>
          )}
          {course && newCourseNote && (
            <p className="mt-2 text-xs text-slate-500">
              This is a new course. It will appear for everyone once your upload is approved.
            </p>
          )}
        </div>

        <label className="block text-sm font-medium">
          Type
          <select
            required
            className={inputClass}
            value={materialType}
            onChange={(e) => setMaterialType(e.target.value)}
          >
            <option value="">Choose a type…</option>
            {types.data?.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name_en}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Title
          <input
            required
            minLength={3}
            maxLength={150}
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 2024 Final Exam with marking scheme"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium">
            Year
            <input
              type="number"
              min={1990}
              max={2100}
              className={inputClass}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Term
            <input
              maxLength={30}
              className={inputClass}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Fall, Winter…"
            />
          </label>
          <label className="block text-sm font-medium">
            Language
            <select className={inputClass} value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
        </div>

        <label className="block text-sm font-medium">
          Description (optional)
          <textarea
            maxLength={1000}
            rows={3}
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="block text-sm font-medium">
          License
          <select
            required
            className={inputClass}
            value={license}
            onChange={(e) => setLicense(e.target.value)}
          >
            <option value="">Choose a license…</option>
            {licenses.data?.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          File
          <input
            type="file"
            required
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            className="mt-1 block w-full text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>
            I created this material, or I have permission to share it. It does not contain other
            people&apos;s names or personal information.
          </span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !confirmed}
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
        >
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </form>
    </div>
  )
}
