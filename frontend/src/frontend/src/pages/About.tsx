import { Link } from 'react-router-dom'
import { CONTACT_EMAIL } from '../config'
import { h1Class, h2Class } from '../ui'
import { usePageTitle } from '../usePageTitle'

export default function About() {
  usePageTitle('About and policies')
  return (
    <div className="max-w-2xl">
      <h1 className={h1Class}>About NorthShelf</h1>
      <p className="mt-4 text-lg leading-relaxed text-soft">
        NorthShelf is a free library of course materials shared by students, organized by province,
        level and course across Canadian high schools, colleges and universities.
      </p>

      <h2 className={`${h2Class} mt-10`}>How uploads work</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-soft">
        <li>You need an account to upload. Browsing and downloading are open to everyone.</li>
        <li>Upload only your own work, or material you have permission to share.</li>
        <li>Remove names, student numbers and other personal information before uploading.</li>
        <li>Do not upload current-term assignments or exams, or anything your school forbids sharing.</li>
        <li>Every upload is reviewed by a moderator before it appears.</li>
        <li>You can delete your own uploads at any time from My uploads.</li>
      </ul>

      <h2 id="removal" className={`${h2Class} mt-10 scroll-mt-24`}>Copyright and removal requests</h2>
      <p className="mt-3 leading-relaxed text-soft">
        If you created or own something on NorthShelf and want it removed, contact us with the
        title of the material, a link to its page, and a short explanation of why you are the
        owner. We will review it promptly.{' '}
        <Link to="/contact#removal" className="text-brand underline underline-offset-4">
          How to send a request
        </Link>
      </p>

      <h2 className={`${h2Class} mt-10`}>Privacy</h2>
      <p className="mt-3 leading-relaxed text-soft">
        We collect only what is needed to run your account: an email address, a display name, and
        the materials you upload. Use a nickname rather than your full name. Browsing does not
        require an account, and NorthShelf does not use advertising trackers.
      </p>

      <h2 className={`${h2Class} mt-10`}>Questions</h2>
      <p className="mt-3 leading-relaxed text-soft">
        See the{' '}
        <Link to="/contact" className="text-brand underline underline-offset-4">
          contact page
        </Link>
        {CONTACT_EMAIL ? (
          <>
            {' '}or write to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
          </>
        ) : null}
        .
      </p>
    </div>
  )
}
