import { Link } from 'react-router-dom'
import { btnPrimary } from '../ui'
import { usePageTitle } from '../usePageTitle'

export default function NotFound() {
  usePageTitle('Page not found')
  return (
    <div>
      <p className="font-display text-3xl font-semibold text-ink">That page isn&apos;t on the shelf.</p>
      <p className="mt-2 max-w-md text-soft">
        The link may be old or mistyped. Try browsing for your course instead.
      </p>
      <Link to="/browse" className={`${btnPrimary} mt-5`}>
        Browse courses
      </Link>
    </div>
  )
}
