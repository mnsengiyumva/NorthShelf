import { Outlet, Route, Routes } from 'react-router-dom'
import Footer from './components/Footer'
import Header from './components/Header'
import ScrollToTop from './components/ScrollToTop'
import About from './pages/About'
import Admin from './pages/Admin'
import Browse from './pages/Browse'
import Contact from './pages/Contact'
import CoursePage from './pages/CoursePage'
import Home from './pages/Home'
import Login from './pages/Login'
import MyUploads from './pages/MyUploads'
import NotFound from './pages/NotFound'
import Signup from './pages/Signup'
import Support from './pages/Support'
import Upload from './pages/Upload'

// Pages other than the home page share one centered content column.
function Shell() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10">
      <Outlet />
    </div>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <Header />
      <main id="main" className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<Shell />}>
            <Route path="/browse" element={<Browse />} />
            <Route path="/courses/:courseId" element={<CoursePage />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/my-uploads" element={<MyUploads />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/support" element={<Support />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
