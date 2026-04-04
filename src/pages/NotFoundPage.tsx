import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-xl font-medium">Pagina non trovata</p>
      <Link to="/" className={buttonVariants()}>
        Torna alla Home
      </Link>
    </div>
  )
}
