import { Link, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import Browse from './pages/Browse'
import CoursePage from './pages/CoursePage'
import Login from './pages/Login'
import Signup from './pages/Signup'

function HeaderNav() {
  const { user, isLoading, logout } = useAuth()
  if (isLoading) return null

  if (user) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-600">{user.display_name}</span>
        <button onClick={() => void logout()} className="text-red-700 hover:underline">
          Log out
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <Link to="/login" className="text-slate-700 hover:underline">
        Log in
      </Link>
      <Link
        to="/signup"
        className="rounded-md bg-red-700 px-3 py-1.5 font-medium text-white hover:bg-red-800"
      >
        Sign up
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-bold tracking-tight text-red-700">
            NorthShelf
          </Link>
          <HeaderNav />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Browse />} />
          <Route path="/courses/:courseId" element={<CoursePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </div>
  )
}
