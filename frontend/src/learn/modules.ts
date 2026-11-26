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
    slug: 'graphs',
    title: 'Graphs: BFS and DFS',
    tagline: 'Two ways to explore a network, and why one finds shortest paths.',
    summary:
      'Step through breadth-first and depth-first search on trees, grids and graphs with loops. Watch the queue and the call stack, predict the next node to be visited, and compare the paths each search finds.',
    subject: 'Computer science',
    level: 'university',
    courses: ['Data structures', 'Algorithms', 'Discrete math'],
    minutes: 25,
  },
  {
    slug: 'greedy',
    title: 'Greedy algorithms',
    tagline: 'Taking the best-looking option now: when that works and when it quietly fails.',
    summary:
      'Make change, schedule events and fill a knapsack by always grabbing what looks best. Find the inputs where greedy is exactly right, the ones where it is wrong, and what separates the two.',
    subject: 'Computer science',
    level: 'university',
    courses: ['Algorithms', 'Design and analysis of algorithms', 'Discrete math'],
    minutes: 25,
  },
  {
    slug: 'dynamic-programming',
    title: 'Dynamic programming',
    tagline: 'Fill the table, then trace back the answer.',
    summary:
      'Watch a table fill cell by cell for coin change, knapsack and longest common subsequence. See which earlier cells each answer depends on, then trace the table back to recover the solution.',
    subject: 'Computer science',
    level: 'university',
    courses: ['Algorithms', 'Design and analysis of algorithms'],
    minutes: 25,
  },
  {
    slug: 'np-hardness',
    title: 'NP-hardness: easy to check, hard to find',
    tagline: 'Why some problems blow up, and what “NP-hard” actually claims.',
    summary:
      'Check a proposed answer in a blink, then try to find one by searching. Watch subset sum and the travelling salesman problem explode with size, and compare a fast heuristic with the true optimum.',
    subject: 'Computer science',
    level: 'university',
    courses: ['Algorithms', 'Theory of computation', 'Complexity'],
    minutes: 25,
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
  {
    slug: 'integrals',
    title: 'Integrals as accumulated area',
    tagline: 'Slice the area, add it up, and watch the error shrink.',
    summary:
      'Approximate area with left, right, midpoint and trapezoid slices. See why more slices help, which rules improve faster, and how the area-so-far curve connects integrals back to derivatives.',
    subject: 'Mathematics',
    level: 'university',
    courses: ['Calculus I', 'Calculus II', 'Numerical methods'],
    minutes: 25,
  },
  {
    slug: 'matrices',
    title: 'Matrices as transformations',
    tagline: 'See what a matrix does to the plane, then multiply with understanding.',
    summary:
      'Edit a 2 × 2 matrix and watch the grid stretch, turn, shear or collapse. See determinants as area, eigenvectors as directions that stay put, and matrix multiplication as doing one transformation after another.',
    subject: 'Mathematics',
    level: 'university',
    courses: ['Linear algebra', 'Calculus III', 'Computer graphics'],
    minutes: 30,
  },
]

export const moduleBySlug = (slug: string | undefined) => MODULES.find((m) => m.slug === slug)
