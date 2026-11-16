import { Link, Route, Routes } from 'react-router-dom'
import Browse from './pages/Browse'
import CoursePage from './pages/CoursePage'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-bold tracking-tight text-red-700">
            NorthShelf
          </Link>
          <p className="hidden text-sm text-slate-500 sm:block">
            Northshelf offers Free course materials, shared by Canadian students
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Browse />} />
          <Route path="/courses/:courseId" element={<CoursePage />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </div>
  )
}
