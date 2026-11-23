import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { formatBytes } from '../format'
import { h1Class } from '../ui'
import { usePageTitle } from '../usePageTitle'

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Waiting for review', className: 'bg-warn-soft text-warn' },
  published: { label: 'Published', className: 'bg-ok-soft text-ok' },
  removed: { label: 'Not approved', className: 'bg-line text-soft' },
  flagged: { label: 'Under review', className: 'bg-warn-soft text-warn' },
}

export default function MyUploads() {
  usePageTitle('My uploads')
  const { user, isLoading } = useAuth()
  const queryClient = useQueryClient()
  const mine = useQuery({ queryKey: ['my-materials'], queryFn: api.myMaterials, enabled: !!user })
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteMyMaterial(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-materials'] }),
  })

  if (isLoading) return null
  if (!user) {
    return (
      <p>
        <Link to="/login" className="text-brand underline">
          Log in
        </Link>{' '}
        to see your uploads.
      </p>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className={h1Class}>My uploads</h1>
        <Link to="/upload" className="text-sm text-brand hover:underline">
          Upload something new
        </Link>
      </div>

      {mine.isLoading && <p className="mt-4 text-muted">Loading…</p>}
      {mine.isError && <p className="mt-4 text-danger">Could not load your uploads.</p>}
      {mine.data && mine.data.length === 0 && (
        <p className="mt-4 text-muted">You haven&apos;t uploaded anything yet.</p>
      )}

      {remove.isError && <p className="mt-4 text-danger">Could not delete that upload. Please try again.</p>}

      <ul className="mt-4 space-y-3">
        {mine.data?.filter((m) => m.status !== 'removed').map((m) => {
          const status = STATUS[m.status] ?? { label: m.status, className: 'bg-line' }
          return (
            <li key={m.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {m.course_code} · {m.type_name}
                    {m.academic_year ? ` · ${m.academic_year}` : ''} · {formatBytes(m.file_size)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
              </div>
              <div className="mt-2 flex gap-4 text-sm">
                <a href={`/api/materials/${m.id}/download`} className="text-brand hover:underline">
                  Download
                </a>
                <button
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm('Delete this upload? The file will be permanently removed.')) {
                      remove.mutate(m.id)
                    }
                  }}
                  className="text-soft hover:text-brand hover:underline disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
