import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'
import { btnPrimary } from '../ui'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium ${
    isActive ? 'text-ink underline decoration-2 underline-offset-[10px]' : 'text-soft hover:text-ink'
  }`

function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null
  const isMod = user.role === 'moderator' || user.role === 'admin'
  const itemClass = 'block w-full px-4 py-2 text-left text-sm text-ink hover:bg-brand-soft'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-brand-soft"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-on-brand">
          {user.display_name.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-ink sm:block">
          {user.display_name}
        </span>
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-muted" fill="currentColor" aria-hidden="true">
          <path d="M5.5 7.5 10 12l4.5-4.5z" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border border-line-strong bg-surface py-1 shadow-lg"
        >
          <p className="truncate border-b border-line px-4 pb-2 pt-1 text-xs text-muted">{user.email}</p>
          <Link role="menuitem" to="/my-uploads" className={itemClass}>
            My uploads
          </Link>
          {isMod && (
            <Link role="menuitem" to="/admin" className={itemClass}>
              Review queue
            </Link>
          )}
          <button role="menuitem" type="button" onClick={() => void logout()} className={itemClass}>
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const { user, isLoading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setMenuOpen(false), [pathname])

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          <NavLink to="/browse" className={navLinkClass}>
            Browse
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            About
          </NavLink>
          <NavLink to="/support" className={navLinkClass}>
            Support
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link to="/upload" className={btnPrimary}>
            Upload
          </Link>
          <ThemeToggle />
          {!isLoading &&
            (user ? (
              <UserMenu />
            ) : (
              <div className="hidden items-center gap-1 md:flex">
                <Link to="/login" className="rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-brand-soft">
                  Log in
                </Link>
                <Link to="/signup" className="rounded-md px-3 py-2 text-sm font-medium text-brand hover:bg-brand-soft">
                  Sign up
                </Link>
              </div>
            ))}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-brand-soft md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav aria-label="Mobile" className="border-t border-line bg-paper px-4 pb-4 md:hidden">
          <ul className="divide-y divide-line">
            {[
              ['/browse', 'Browse'],
              ['/upload', 'Upload'],
              ['/about', 'About and policies'],
              ['/support', 'Support NorthShelf'],
              ['/contact', 'Contact'],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="block py-3 text-base text-ink">
                  {label}
                </Link>
              </li>
            ))}
            {!isLoading && !user && (
              <>
                <li>
                  <Link to="/login" className="block py-3 text-base text-ink">
                    Log in
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="block py-3 text-base font-medium text-brand">
                    Create an account
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      )}
    </header>
  )
}
