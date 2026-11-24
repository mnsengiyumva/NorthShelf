import { CONTACT_EMAIL } from '../config'
import { h1Class, h2Class } from '../ui'
import { usePageTitle } from '../usePageTitle'

type Topic = { id: string; title: string; body: string; subject: string; cta: string }

const TOPICS: Topic[] = [
  {
    id: 'general',
    title: 'General questions',
    body: 'Questions about how NorthShelf works, feedback, or ideas for making it better.',
    subject: 'NorthShelf question',
    cta: 'Send a question',
  },
  {
    id: 'removal',
    title: 'Copyright removal request',
    body: 'If you created or own something on NorthShelf and want it removed, include the title of the material, a link to its page, and a short explanation of why you are the owner.',
    subject: 'NorthShelf removal request',
    cta: 'Send a removal request',
  },
  {
    id: 'problem',
    title: 'Report a problem',
    body: 'Spotted something wrong, such as personal information in a file, material in the wrong course, or something inappropriate? Send a link to the page and describe the problem.',
    subject: 'NorthShelf problem report',
    cta: 'Report a problem',
  },
  {
    id: 'moderators',
    title: 'Help moderate',
    body: 'Know a course or province well? Moderators review uploads before they go live. Tell us which courses and provinces you could cover.',
    subject: 'NorthShelf moderator offer',
    cta: 'Offer to help',
  },
  {
    id: 'sponsorship',
    title: 'Sponsorship',
    body: 'Organizations that support students can sponsor NorthShelf. Sponsors are clearly labelled, never track students, and have no control over student content.',
    subject: 'NorthShelf sponsorship',
    cta: 'Ask about sponsoring',
  },
]

export default function Contact() {
  usePageTitle('Contact', 'Get in touch with the NorthShelf team: questions, takedown requests and feedback.')
  return (
    <div className="max-w-2xl">
      <h1 className={h1Class}>Contact</h1>
      <p className="mt-4 text-lg leading-relaxed text-soft">
        Pick the topic that fits, and your message will open ready to send.
      </p>
      {!CONTACT_EMAIL && (
        <p className="mt-4 rounded-md bg-warn-soft px-4 py-3 text-sm text-warn">
          A contact address has not been set up yet. Set <code>VITE_CONTACT_EMAIL</code> in
          frontend/.env.local to enable the links below.
        </p>
      )}

      <div className="mt-8 divide-y divide-line border-y border-line">
        {TOPICS.map((t) => (
          <section key={t.id} id={t.id} className="scroll-mt-24 py-6">
            <h2 className={h2Class}>{t.title}</h2>
            <p className="mt-2 max-w-xl leading-relaxed text-soft">{t.body}</p>
            {CONTACT_EMAIL && (
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t.subject)}`}
                className="mt-3 inline-block text-brand underline underline-offset-4"
              >
                {t.cta}
              </a>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
