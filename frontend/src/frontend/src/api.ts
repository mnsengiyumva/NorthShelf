export type Region = {
  id: number
  type: string
  code: string
  name_en: string
  name_fr: string | null
  parent_code: string | null
}

export type Option = {
  id: number
  slug: string
  name_en: string
  name_fr: string | null
}

export type Course = {
  id: number
  code: string
  title: string
  grade: number | null
  language: string
  level: string
  region_code: string
  institution: string | null
  subject: string | null
}

export type Institution = {
  id: number
  name: string
  level: string
  region_code: string
}

export type CourseDraft = {
  level: string
  region: string
  code: string
  title: string
  subject?: string
  grade?: number
  language: string
  institution_id?: number
  new_institution_name?: string
}

export type CreatedCourse = Course & { status: string; existing: boolean }

export type Material = {
  id: string
  title: string
  description: string | null
  academic_year: number | null
  term: string | null
  language: string
  download_count: number
  created_at: string
  course_id: number
  course_code: string
  course_title: string
  type: string
  type_name: string
  uploader: string
  file_size: number
  mime_type: string
  status: string
}

export type AdminMaterial = Material & {
  license: string
  own_work_confirmed: boolean
  course_status: string
  level: string
  region_code: string
  institution: string | null
}

export type Stats = {
  stored_bytes: number
  uploads_last_24h: number
  by_status: Record<string, number>
  top_uploaders: { display_name: string; uploads: number; bytes: number }[]
}

export type License = {
  id: number
  slug: string
  name: string
  url: string | null
}

export type User = {
  id: string
  email: string
  display_name: string
  role: string
}

type Params = Record<string, string | number | undefined | null>

async function get<T>(path: string, params: Params = {}): Promise<T> {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value))
  }
  const query = qs.toString()
  const res = await fetch(query ? `${path}?${query}` : path)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json() as Promise<T>
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const isForm = body instanceof FormData
  const res = await fetch(path, {
    method,
    // For FormData the browser sets the multipart Content-Type (with its boundary) itself.
    headers: body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (typeof data.detail === 'string') message = data.detail
      else if (Array.isArray(data.detail) && data.detail[0]?.msg) message = data.detail[0].msg
    } catch {
      // response had no JSON body; keep the generic message
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  regions: () => get<Region[]>('/api/regions'),
  levels: () => get<Option[]>('/api/levels'),
  subjects: () => get<Option[]>('/api/subjects'),
  materialTypes: () => get<Option[]>('/api/material-types'),
  courses: (params: Params) => get<Course[]>('/api/courses', params),
  course: (id: number) => get<Course>(`/api/courses/${id}`),
  materials: (params: Params) => get<Material[]>('/api/materials', params),
  institutions: (params: Params) => get<Institution[]>('/api/institutions', params),
  createCourse: (draft: CourseDraft) => send<CreatedCourse>('POST', '/api/courses', draft),
  licenses: () => get<License[]>('/api/licenses'),
  uploadMaterial: (form: FormData) =>
    send<{ id: string; status: string }>('POST', '/api/materials', form),
  myMaterials: () => get<Material[]>('/api/my/materials'),
  deleteMyMaterial: (id: string) => send<void>('DELETE', `/api/my/materials/${id}`),
  stats: () => get<Stats>('/api/admin/stats'),
  reviewQueue: () => get<AdminMaterial[]>('/api/admin/materials', { status: 'pending' }),
  approve: (id: string) => send<{ id: string; status: string }>('POST', `/api/admin/materials/${id}/approve`),
  reject: (id: string) => send<{ id: string; status: string }>('POST', `/api/admin/materials/${id}/reject`),

  // --- auth (the session lives in an httpOnly cookie set by the backend) ---
  me: async (): Promise<User | null> => {
    const res = await fetch('/api/auth/me')
    if (res.status === 401) return null
    if (!res.ok) throw new Error(`Request failed (${res.status})`)
    return res.json() as Promise<User>
  },
  login: (email: string, password: string) =>
    send<User>('POST', '/api/auth/login', { email, password }),
  signup: (email: string, password: string, display_name: string) =>
    send<User>('POST', '/api/auth/signup', { email, password, display_name }),
  logout: () => send<void>('POST', '/api/auth/logout'),
}
