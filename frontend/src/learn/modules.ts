// The list of learning modules. Pure data, so the index page, sitemap and module pages agree.
export type Level = 'high_school' | 'college' | 'university'

export interface ModuleMeta {
  slug: string
  title: string
  tagline: string
  summary: string
  subject: 'Computer science' | 'Mathematics'
  level: Level
  courses: string[]
  minutes: number
}

export const LEVEL_NAME: Record<Level, string> = {
  high_school: 'High school',
  college: 'College',
  university: 'University',
}
export const LEVEL_COLOR: Record<Level, string> = {
  high_school: 'var(--lvl-high-school)',
  college: 'var(--lvl-college)',
  university: 'var(--lvl-university)',
}

export const MODULES: ModuleMeta[] = [
  {
    slug: 'recursion',
    title: 'Recursion, step by step',
    tagline: 'Watch the call stack grow and unwind.',
    summary:
      'Replay factorial, Fibonacci, list sums and Euclid’s algorithm one call at a time. See the call stack, the call tree, and why memoization turns an exponential algorithm into a linear one.',
    subject: 'Computer science',
    level: 'university',
    courses: ['Intro programming II', 'Data structures', 'Algorithms'],
    minutes: 15,
  },
  {
    slug: 'sorting',
    title: 'Sorting and Big-O',
    tagline: 'Count the work, then see how it grows.',
    summary:
      'Step through bubble, insertion, selection, merge and quick sort. Race them on the same data, then measure how the number of comparisons grows as the list gets longer.',
    subject: 'Computer science',
    level: 'university',
    courses: ['Data structures', 'Algorithms', 'Analysis of algorithms'],
    minutes: 20,
  },
  {
    slug: 'derivatives',
    title: 'The derivative as a slope',
    tagline: 'Shrink h and watch a secant become a tangent.',
    summary:
      'Drag a point along a curve and see the secant line turn into the tangent as h shrinks. The derivative graph is drawn beside it, and every claim is checked against the exact derivative.',
    subject: 'Mathematics',
    level: 'university',
    courses: ['Calculus I', 'Differential calculus'],
    minutes: 15,
  },
  {
    slug: 'limits',
    title: 'Limits and continuity',
    tagline: 'Get a feel for ε and δ.',
    summary:
      'Explore holes, jumps, asymptotes and oscillation. Pick a candidate limit, set ε, and see whether a δ exists. Only the true limit survives every ε.',
    subject: 'Mathematics',
    level: 'university',
    courses: ['Calculus I', 'Real analysis (intro)'],
    minutes: 20,
  },
]

export const moduleBySlug = (slug: string | undefined) => MODULES.find((m) => m.slug === slug)
