import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, type CourseDraft, type CreatedCourse } from '../api'
import { inputClass } from './Login'

const LEVELS = [
  { slug: 'high_school', label: 'High school' },
  { slug: 'college', label: 'College' },
  { slug: 'university', label: 'University' },
]

type Props = {
  initialCode?: string
  onCreated: (course: CreatedCourse) => void
  onCancel: () => void
}

export default function AddCourse({ initialCode = '', onCreated, onCancel }: Props) {
  const [level, setLevel] = useState('')
  const [region, setRegion] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [newSchool, setNewSchool] = useState('')
  const [code, setCode] = useState(initialCode)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [language, setLanguage] = useState('en')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const regions = useQuery({ queryKey: ['regions'], queryFn: api.regions })
  const subjects = useQuery({ queryKey: ['subjects'], queryFn: api.subjects })
  const needsSchool = level === 'college' || level === 'university'
  const schools = useQuery({
    queryKey: ['institutions', region, level],
    queryFn: () => api.institutions({ region, level }),
    enabled: needsSchool && !!region,
  })
  const provinces = (regions.data ?? []).filter((r) => r.type === 'province' || r.type === 'territory')
  const schoolNotListed = institutionId === 'other'

  // This component sits inside the upload form, so it validates by hand instead of using
  // HTML form attributes, and it keeps Enter from submitting the whole upload form.
  async function submit() {
    setError(null)
    if (!level) return setError('Please choose a level')
    if (!region) return setError('Please choose a province or territory')
    if (code.trim().length < 2) return setError('Please enter the course code')
    if (title.trim().length < 3) return setError('Please enter the course title')
    const draft: CourseDraft = { level, region, code, title, language }
    if (subject) draft.subject = subject
    if (level === 'high_school' && grade) draft.grade = Number(grade)
    if (needsSchool) {
      if (schoolNotListed) draft.new_institution_name = newSchool
      else if (institutionId) draft.institution_id = Number(institutionId)
      else return setError('Please choose your school, or pick "My school isn\'t listed"')
    }
    setBusy(true)
    try {
      onCreated(await api.createCourse(draft))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the course')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="mt-3 rounded-lg border border-slate-300 bg-white p-4"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
          e.preventDefault()
          void submit()
        }
      }}
    >
      <h3 className="font-medium">Add a missing course</h3>
      <p className="mt-1 text-xs text-slate-500">
        New courses appear for everyone once your upload to them is approved.
      </p>

      <div className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Level
            <select
              className={inputClass}
              value={level}
              onChange={(e) => {
                setLevel(e.target.value)
                setInstitutionId('')
              }}
            >
              <option value="">Choose…</option>
              {LEVELS.map((l) => (
                <option key={l.slug} value={l.slug}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Province or territory
            <select
              className={inputClass}
              value={region}
              onChange={(e) => {
                setRegion(e.target.value)
                setInstitutionId('')
              }}
            >
              <option value="">Choose…</option>
              {provinces.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name_en}
                </option>
              ))}
            </select>
          </label>
        </div>

        {needsSchool && region && (
          <div>
            <label className="block text-sm font-medium">
              School
              <select
                className={inputClass}
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
              >
                <option value="">Choose your school…</option>
                {schools.data?.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
                <option value="other">My school isn&apos;t listed</option>
              </select>
            </label>
            {schoolNotListed && (
              <label className="mt-3 block text-sm font-medium">
                School name
                <input
                  maxLength={120}
                  className={inputClass}
                  value={newSchool}
                  onChange={(e) => setNewSchool(e.target.value)}
                  placeholder="Full official name"
                />
              </label>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium">
            Course code
            <input
              maxLength={20}
              className={inputClass}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={level === 'high_school' ? 'e.g. MHF4U' : 'e.g. CSCI 1010'}
            />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            Course title
            <input
              maxLength={120}
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Advanced Functions"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium">
            Subject
            <select className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">Not sure</option>
              {subjects.data?.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name_en}
                </option>
              ))}
            </select>
          </label>
          {level === 'high_school' && (
            <label className="block text-sm font-medium">
              Grade
              <select className={inputClass} value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option value="">Not sure</option>
                {[9, 10, 11, 12].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm font-medium">
            Language
            <select className={inputClass} value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
          >
            {busy ? 'Adding…' : 'Add this course'}
          </button>
          <button type="button" onClick={onCancel} className="text-sm text-slate-600 hover:underline">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
