import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '@/components/layout/RootLayout'
import HomePage from '@/pages/HomePage'
import AssetsPage from '@/pages/AssetsPage'
import AssetDetailPage from '@/pages/AssetDetailPage'
import EtfHoldingsPage from '@/pages/EtfHoldingsPage'
import ExchangeRatesPage from '@/pages/ExchangeRatesPage'
import ExchangeRateDetailPage from '@/pages/ExchangeRateDetailPage'
import NotFoundPage from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'assets', element: <AssetsPage /> },
      { path: 'assets/:id', element: <AssetDetailPage /> },
      { path: 'assets/:id/holdings', element: <EtfHoldingsPage /> },
      { path: 'exchange-rates', element: <ExchangeRatesPage /> },
      { path: 'exchange-rates/:id', element: <ExchangeRateDetailPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
