import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '@/components/layout/RootLayout'
import HomePage from '@/pages/HomePage'
import DashboardPage from '@/pages/DashboardPage'
import AssetsPage from '@/pages/AssetsPage'
import EtfHoldingsPage from '@/pages/EtfHoldingsPage'
import NotFoundPage from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'assets', element: <AssetsPage /> },
      { path: 'assets/:id/holdings', element: <EtfHoldingsPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
