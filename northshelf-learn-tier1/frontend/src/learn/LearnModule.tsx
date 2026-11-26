import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { useParams } from 'react-router-dom'
import NotFound from '../pages/NotFound'
import { moduleBySlug } from './modules'

const COMPONENTS: Record<string, LazyExoticComponent<ComponentType>> = {
  recursion: lazy(() => import('./modules/RecursionModule')),
  sorting: lazy(() => import('./modules/SortingModule')),
  derivatives: lazy(() => import('./modules/DerivativesModule')),
  limits: lazy(() => import('./modules/LimitsModule')),
}

export default function LearnModule() {
  const { slug } = useParams()
  const meta = moduleBySlug(slug)
  const Component = meta ? COMPONENTS[meta.slug] : undefined
  if (!meta || !Component) return <NotFound />
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Component />
    </Suspense>
  )
}
