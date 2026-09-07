import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { useEffect } from 'react'
import { updatePageTitle, setCanonical, updateMetaTag } from '../lib/seo'

export default function NotFoundPage() {
  useEffect(() => {
    updatePageTitle('404 | Dokantra')
    const baseUrl = import.meta.env.VITE_PUBLIC_SITE_URL ?? window.location.origin
    setCanonical(`${baseUrl}/`)
    updateMetaTag('robots', 'noindex, nofollow')
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <h1 className="text-5xl sm:text-6xl font-bold text-muted-foreground mb-3 sm:mb-4">404</h1>
      <p className="text-base sm:text-lg text-muted-foreground mb-4 sm:mb-6">
        The page you are looking for does not exist.
      </p>
      <Button asChild>
        <Link to="/">Go to Homepage</Link>
      </Button>
    </div>
  )
}
