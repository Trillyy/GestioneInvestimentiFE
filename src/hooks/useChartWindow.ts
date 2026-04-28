import { useState } from 'react'
import { toast } from 'sonner'
import type { ChartWindow } from '@/helpers/formatters.ts'

export function useChartWindow(
  onFetch: (from: string, to: string) => Promise<void>,
  initialWindow: ChartWindow = 'month',
) {
  const [selectedWindow, setSelectedWindow] = useState<ChartWindow>(initialWindow)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [customLoading, setCustomLoading] = useState(false)

  async function handleWindowChange(w: ChartWindow) {
    setSelectedWindow(w)
    if (w === 'ytd') {
      const today = new Date()
      const jan1 = `${today.getFullYear()}-01-01`
      const todayStr = today.toISOString().slice(0, 10)
      setCustomLoading(true)
      try { await onFetch(jan1, todayStr) }
      finally { setCustomLoading(false) }
    } else if (w === 'alltime') {
      const todayStr = new Date().toISOString().slice(0, 10)
      setCustomLoading(true)
      try { await onFetch('1900-01-01', todayStr) }
      finally { setCustomLoading(false) }
    }
  }

  async function handleCustomSearch() {
    if (!from || !to) {
      toast.error('Inserisci entrambe le date')
      return
    }
    setCustomLoading(true)
    setSelectedWindow('custom')
    try { await onFetch(from, to) }
    finally { setCustomLoading(false) }
  }

  return {
    window: selectedWindow,
    setWindow: setSelectedWindow,
    from,
    setFrom,
    to,
    setTo,
    customLoading,
    handleWindowChange,
    handleCustomSearch,
  }
}
