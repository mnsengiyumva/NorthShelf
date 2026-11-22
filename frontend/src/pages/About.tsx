import { CONTACT_EMAIL } from '../config'

export default function About() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">About NorthShelf</h1>
      <p className="mt-3 text-slate-700">
        NorthShelf is a free library of course materials shared by students, organized by province,
        level and course across Canadian high schools, colleges and universities.
      </p>

      <h2 className="mt-8 text-lg font-semibold">How uploads work</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
        <li>You need an account to upload. Browsing and downloading are open to everyone.</li>
        <li>Upload only your own work, or material you have permission to share.</li>
        <li>Remove names, student numbers and other personal information before uploading.</li>
        <li>Do not upload current-term assignments or exams, or anything your school forbids sharing.</li>
        <li>Every upload is reviewed by a moderator before it appears.</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">Copyright and removal requests</h2>
      <p className="mt-2 text-slate-700">
        If you created or own something on NorthShelf and want it removed, contact us with the
        title of the material, a link to its page, and a short explanation of why you are the
        owner. We will review it promptly.
      </p>
      {CONTACT_EMAIL ? (
        <p className="mt-2">
          <a href={`mailto:${CONTACT_EMAIL}?subject=NorthShelf%20removal%20request`} className="text-red-700 hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-500">A contact address will be listed here.</p>
      )}

      <h2 className="mt-8 text-lg font-semibold">Privacy</h2>
      <p className="mt-2 text-slate-700">
        We collect only what is needed to run your account: an email address, a display name, and
        the materials you upload. Use a nickname rather than your full name. Browsing does not
        require an account, and NorthShelf does not use advertising trackers.
      </p>
    </div>
  )
}
