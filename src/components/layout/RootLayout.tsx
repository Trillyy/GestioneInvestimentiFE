import { Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import Navbar from './Navbar'
import Footer from './Footer'
import { useServer } from '@/context/ServerContext'

export default function RootLayout() {
  const { server } = useServer()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet key={server} />
      </main>
      <Footer />
      <Toaster />
    </div>
  )
}
