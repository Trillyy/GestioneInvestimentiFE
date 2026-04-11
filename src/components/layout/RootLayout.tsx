import { Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import Navbar from './Navbar'

export default function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        Gestione Investimenti &copy; {new Date().getFullYear()}
      </footer>
      <Toaster />
    </div>
  )
}
