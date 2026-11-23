import { Link } from 'react-router-dom'

export function LogoMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="4" y="11" width="5.5" height="15" rx="1" fill="#1f7a75" />
      <rect x="11.5" y="5" width="5.5" height="21" rx="1" fill="#c9962a" />
      <rect x="19" y="8.5" width="5.5" height="17.5" rx="1" fill="#8a5a94" transform="rotate(9 21.7 26)" />
      <rect x="2" y="26.5" width="28" height="2.5" rx="1.25" fill="currentColor" />
    </svg>
  )
}

export default function Logo({ onDark = false }: { onDark?: boolean }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2 ${onDark ? 'text-white' : 'text-ink'}`}
      aria-label="NorthShelf home"
    >
      <LogoMark />
      <span className="font-display text-xl font-bold tracking-tight">NorthShelf</span>
    </Link>
  )
}
