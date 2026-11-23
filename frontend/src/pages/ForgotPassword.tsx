import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { btnPrimary, h1Class } from '../ui'
import { usePageTitle } from '../usePageTitle'
import { inputClass } from './Login'

export default function ForgotPassword() {
  usePageTitle('Reset your password')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await api.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-sm">
        <h1 className={h1Class}>Check your email</h1>
        <p className="mt-3 text-soft">
          If an account exists for <strong className="text-ink">{email}</strong>, a link to reset
          your password is on its way. It works for one hour.
        </p>
        <p className="mt-3 text-sm text-muted">
          Nothing arrived? Check your spam folder, or{' '}
          <button type="button" onClick={() => setSent(false)} className="text-brand underline underline-offset-4">
            try again
          </button>
          .
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm text-brand underline underline-offset-4">
          Back to log in
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className={h1Class}>Reset your password</h1>
      <p className="mt-3 text-soft">Enter your email and we will send you a link to choose a new password.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-ink">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="mt-4 text-sm text-soft">
        Remembered it?{' '}
        <Link to="/login" className="text-brand underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  )
}
