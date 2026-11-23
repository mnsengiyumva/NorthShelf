import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Start each page at the top when you navigate.
export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
