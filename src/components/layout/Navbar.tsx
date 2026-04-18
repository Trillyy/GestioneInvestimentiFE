import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useServer } from '@/context/ServerContext'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/assets', label: 'Asset' },
  { to: '/exchange-rates', label: 'Cambi' },
  { to: '/transactions', label: 'Transazioni' },
]

export default function Navbar() {
  const location = useLocation()
  const { server, setServer } = useServer()

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-14 items-center gap-6 px-4">
        <span className="font-semibold text-lg tracking-tight">GI</span>
        <nav className="flex items-center gap-4">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                location.pathname === to
                  ? 'text-primary'
                  : 'text-muted-foreground',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 rounded-full border px-1 py-1 text-xs font-medium">
          <button
            onClick={() => setServer('local')}
            className={cn(
              'rounded-full px-3 py-1 transition-colors',
              server === 'local'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Local
          </button>
          <button
            onClick={() => setServer('prod')}
            className={cn(
              'rounded-full px-3 py-1 transition-colors',
              server === 'prod'
                ? 'bg-amber-500 text-white'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Prod
          </button>
        </div>
      </div>
    </header>
  )
}
