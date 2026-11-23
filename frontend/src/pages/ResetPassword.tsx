import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { btnPrimary, h1Class } from '../ui'
import { usePageTitle } from '../usePageTitle'
import { inputClass } from './Login'

export default function ResetPassword() {
  usePageTitle('Choose a new password')
  const token = useSearchParams()[0].get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) return setError('The two passwords do not match')
    setBusy(true)
    try {
      await api.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-sm">
        <h1 className={h1Class}>Link not recognized</h1>
        <p className="mt-3 text-soft">
          This page needs the link from your reset email. You can ask for a new one.
        </p>
        <Link to="/forgot-password" className={`${btnPrimary} mt-5`}>
          Send a new link
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm">
        <h1 className={h1Class}>Password changed</h1>
        <p className="mt-3 text-soft">Your password has been updated. You can now log in with it.</p>
        <Link to="/login" className={`${btnPrimary} mt-5`}>
          Log in
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className={h1Class}>Choose a new password</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-ink">
          New password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="mt-1 block text-xs font-normal text-muted">At least 8 characters.</span>
        </label>
        <label className="block text-sm font-medium text-ink">
          Confirm new password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}{' '}
            {error.includes('invalid or has expired') && (
              <Link to="/forgot-password" className="underline underline-offset-4">
                Send a new link
              </Link>
            )}
          </p>
        )}
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
          {busy ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </div>
  )
}
