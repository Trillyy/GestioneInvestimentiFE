import { Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import Navbar from './Navbar'
import Footer from "./Footer";

export default function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>
      <Footer />
      <Toaster />
    </div>
  )
}
