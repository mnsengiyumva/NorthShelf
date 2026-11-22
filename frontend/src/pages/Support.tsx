import { CONTACT_EMAIL, DONATE_URL } from '../config'

export default function Support() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Support NorthShelf</h1>
      <p className="mt-3 text-slate-700">
        NorthShelf is free for every student, with no paywalls and no required accounts for
        browsing or downloading. Keeping it that way costs money and time, and you can help.
      </p>

      <h2 className="mt-8 text-lg font-semibold">What support pays for</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
        <li>File storage and bandwidth for the materials students share</li>
        <li>Hosting and the domain name</li>
        <li>Moderation tools, so uploads can be reviewed quickly and safely</li>
        <li>Time to build new features, such as French-language support and better search</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">Ways to help</h2>
      <div className="mt-3 space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-medium">Give</h3>
          <p className="mt-1 text-sm text-slate-600">
            Any amount helps cover running costs.
          </p>
          {DONATE_URL ? (
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
            >
              Donate
            </a>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Donations are not open yet. Check back soon.</p>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-medium">Share what you know</h3>
          <p className="mt-1 text-sm text-slate-600">
            The most valuable contribution is your own notes, study guides and practice problems,
            shared with permission.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-medium">Help review uploads</h3>
          <p className="mt-1 text-sm text-slate-600">
            Familiar with a course or province? Moderators keep the library accurate and safe.
            {CONTACT_EMAIL ? ' Get in touch if you would like to help.' : ''}
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-medium">Sponsor NorthShelf</h3>
          <p className="mt-1 text-sm text-slate-600">
            Tutoring services, education organizations and student groups can sponsor the site.
            Sponsors are clearly labelled, never track students, and have no control over student
            content.
          </p>
          {CONTACT_EMAIL && (
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=NorthShelf%20sponsorship`}
              className="mt-3 inline-block text-sm text-red-700 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          )}
        </section>
      </div>
    </div>
  )
}
