import { useEffect } from 'react'

const DEFAULT_DESCRIPTION =
  'Free course materials shared by students across Canada: notes, past exams and study guides for high school, college and university courses.'

function setDescription(text: string) {
  let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (!tag) {
    tag = document.createElement('meta')
    tag.name = 'description'
    document.head.appendChild(tag)
  }
  tag.content = text
}

export function usePageTitle(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} | NorthShelf` : 'NorthShelf'
    setDescription(description ?? DEFAULT_DESCRIPTION)
  }, [title, description])
}
