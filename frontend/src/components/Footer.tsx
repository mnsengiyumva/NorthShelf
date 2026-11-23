import { Link } from 'react-router-dom'
import { CONTACT_EMAIL } from '../config'
import Logo from './Logo'

const colHeading = 'font-display text-base font-semibold text-white'
const linkClass = 'text-sm text-white/75 hover:text-white hover:underline'

export default function Footer() {
  return (
    <footer className="bg-footer text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo onDark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/75">
            Free course materials shared by students across Canada, for high school, college and
            university.
          </p>
          {CONTACT_EMAIL && (
            <a href={`mailto:${CONTACT_EMAIL}`} className="mt-4 inline-block text-sm text-white underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
          )}
        </div>

        <nav aria-label="Explore">
          <h2 className={colHeading}>Explore</h2>
          <ul className="mt-3 space-y-2">
            <li><Link to="/browse" className={linkClass}>Browse courses</Link></li>
            <li><Link to="/upload" className={linkClass}>Upload a material</Link></li>
            <li><Link to="/my-uploads" className={linkClass}>My uploads</Link></li>
          </ul>
        </nav>

        <nav aria-label="NorthShelf">
          <h2 className={colHeading}>NorthShelf</h2>
          <ul className="mt-3 space-y-2">
            <li><Link to="/about" className={linkClass}>About and policies</Link></li>
            <li><Link to="/support" className={linkClass}>Support NorthShelf</Link></li>
            <li><Link to="/contact" className={linkClass}>Contact</Link></li>
          </ul>
        </nav>

        <nav aria-label="Help">
          <h2 className={colHeading}>Help</h2>
          <ul className="mt-3 space-y-2">
            <li><Link to="/contact#removal" className={linkClass}>Copyright removal request</Link></li>
            <li><Link to="/contact#problem" className={linkClass}>Report a problem</Link></li>
            <li><Link to="/contact#moderators" className={linkClass}>Help moderate</Link></li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-white/65 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} NorthShelf</p>
          <p>An independent project. Not affiliated with any school, college, university or exam board.</p>
        </div>
      </div>
    </footer>
  )
}
