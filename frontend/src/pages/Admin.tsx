import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { useAuth } from '../auth'
import { formatBytes } from '../format'

export default function Admin() {
  const { user, isLoading } = useAuth()
  const queryClient = useQueryClient()
  const isMod = user?.role === 'moderator' || user?.role === 'admin'

  const queue = useQuery({ queryKey: ['review-queue'], queryFn: api.reviewQueue, enabled: isMod })
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: api.stats, enabled: isMod })

  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      action === 'approve' ? api.approve(id) : api.reject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['review-queue'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })

  if (isLoading) return null
  if (!isMod) return <p className="text-slate-600">This page is for moderators.</p>

  return (
    <div>
      <h1 className="text-2xl font-semibold">Review queue</h1>
      <p className="mt-1 text-sm text-slate-600">
        Open each file, check it is on topic, free of personal information and fine to share, then approve or reject it.
      </p>

      {stats.data && (
        <div className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Storage used</p>
            <p className="font-semibold">{formatBytes(stats.data.stored_bytes)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Uploads, last 24 h</p>
            <p className="font-semibold">{stats.data.uploads_last_24h}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Published</p>
            <p className="font-semibold">{stats.data.by_status.published ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Waiting for review</p>
            <p className="font-semibold">{stats.data.by_status.pending ?? 0}</p>
          </div>
        </div>
      )}

      {queue.isLoading && <p className="mt-4 text-slate-500">Loading…</p>}
      {queue.data && queue.data.length === 0 && (
        <p className="mt-4 text-slate-500">Nothing waiting for review.</p>
      )}
      {decide.isError && <p className="mt-4 text-red-700">That didn&apos;t work. Please try again.</p>}

      <ul className="mt-4 space-y-3">
        {queue.data?.map((m) => (
          <li key={m.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="font-medium">{m.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              {m.course_code} · {m.type_name}
              {m.academic_year ? ` · ${m.academic_year}` : ''} · {formatBytes(m.file_size)} ·
              by {m.uploader}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {m.level.replace('_', ' ')} · {m.region_code.replace('CA-', '')}
              {m.institution ? ` · ${m.institution}` : ''}
              {m.course_status === 'pending' && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                  New course: approving this adds it to the site
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              License: {m.license} · Ownership confirmed: {m.own_work_confirmed ? 'yes' : 'no'}
            </p>
            {m.description && <p className="mt-2 text-sm">{m.description}</p>}
            <div className="mt-3 flex items-center gap-4 text-sm">
              <a
                href={`/api/materials/${m.id}/download`}
                target="_blank"
                rel="noreferrer"
                className="text-red-700 hover:underline"
              >
                Open file
              </a>
              <button
                disabled={decide.isPending}
                onClick={() => decide.mutate({ id: m.id, action: 'approve' })}
                className="rounded-md bg-green-700 px-3 py-1 font-medium text-white hover:bg-green-800 disabled:opacity-60"
              >
                Approve
              </button>
              <button
                disabled={decide.isPending}
                onClick={() => decide.mutate({ id: m.id, action: 'reject' })}
                className="rounded-md bg-slate-600 px-3 py-1 font-medium text-white hover:bg-slate-700 disabled:opacity-60"
              >
                Reject and delete file
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
