import { Link } from 'react-router-dom'
import { CONTACT_EMAIL, DONATE_URL } from '../config'
import { btnPrimary, h1Class, h2Class } from '../ui'
import { usePageTitle } from '../usePageTitle'

export default function Support() {
  usePageTitle('Support NorthShelf')
  return (
    <div className="max-w-2xl">
      <h1 className={h1Class}>Support NorthShelf</h1>
      <p className="mt-4 text-lg leading-relaxed text-soft">
        NorthShelf is free for every student. Browsing and downloading never need an account and
        never will cost anything. Keeping it that way takes money and time, and you can help with
        either.
      </p>

      <h2 className={`${h2Class} mt-10`}>What support pays for</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-soft">
        <li>File storage and bandwidth for the materials students share</li>
        <li>Hosting and the domain name</li>
        <li>Moderation tools, so uploads are reviewed quickly and safely</li>
        <li>Development time for French-language support, better search and more</li>
      </ul>

      <h2 className={`${h2Class} mt-10`}>Ways to help</h2>
      <dl className="mt-2 divide-y divide-line border-y border-line">
        <div className="py-5">
          <dt className="font-semibold text-ink">Give</dt>
          <dd className="mt-1 text-soft">
            Any amount helps cover running costs.
            <div className="mt-3">
              {DONATE_URL ? (
                <a href={DONATE_URL} target="_blank" rel="noreferrer" className={btnPrimary}>
                  Donate
                </a>
              ) : (
                <span className="text-sm text-muted">Donations are not open yet. Check back soon.</span>
              )}
            </div>
          </dd>
        </div>
        <div className="py-5">
          <dt className="font-semibold text-ink">Share what you know</dt>
          <dd className="mt-1 text-soft">
            The most valuable contribution is your own notes, study guides and practice problems,
            shared with permission.{' '}
            <Link to="/upload" className="text-brand underline underline-offset-4">
              Upload a material
            </Link>
          </dd>
        </div>
        <div className="py-5">
          <dt className="font-semibold text-ink">Help review uploads</dt>
          <dd className="mt-1 text-soft">
            If you know a course or province well, moderators keep the library accurate and safe.{' '}
            <Link to="/contact#moderators" className="text-brand underline underline-offset-4">
              Get in touch
            </Link>
          </dd>
        </div>
        <div className="py-5">
          <dt className="font-semibold text-ink">Sponsor NorthShelf</dt>
          <dd className="mt-1 text-soft">
            Tutoring services, education organizations and student groups can sponsor the site.
            Sponsors are clearly labelled, never track students, and have no control over student
            content.{' '}
            {CONTACT_EMAIL ? (
              <a href={`mailto:${CONTACT_EMAIL}?subject=NorthShelf%20sponsorship`} className="text-brand underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>
            ) : (
              <Link to="/contact#sponsorship" className="text-brand underline underline-offset-4">
                Contact us
              </Link>
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}
