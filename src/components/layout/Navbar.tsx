import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/assets', label: 'Asset' },
  { to: '/exchange-rates', label: 'Cambi' },
  { to: '/transactions', label: 'Transazioni' },
]

export default function Navbar() {
  const location = useLocation()

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
      </div>
    </header>
  )
}
