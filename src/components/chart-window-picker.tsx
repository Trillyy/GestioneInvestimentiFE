import { type ChartWindow, WINDOW_LABELS } from '@/helpers/formatters.ts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export function ChartWindowPicker({
  window,
  customLoading,
  from,
  to,
  onFromChange,
  onToChange,
  onWindowChange,
  onCustomSearch,
}: {
  window: ChartWindow
  customLoading: boolean
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  onWindowChange: (w: ChartWindow) => void
  onCustomSearch: () => void
}) {
  return (
    <>
      <div className="flex gap-1 mt-2 flex-wrap">
        {(['week', 'month', 'year', 'ytd', 'alltime', 'custom'] as ChartWindow[]).map((w) => (
          <Button
            key={w}
            variant={window === w ? 'default' : 'outline'}
            size="xs"
            disabled={customLoading}
            onClick={() => void onWindowChange(w)}
          >
            {WINDOW_LABELS[w]}
          </Button>
        ))}
      </div>
      {window === 'custom' && (
        <>
          <Separator className="mt-3" />
          <div className="flex items-end gap-3 mt-3 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">Dal</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => onFromChange(e.target.value)}
                className="h-8 w-36"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Al</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => onToChange(e.target.value)}
                className="h-8 w-36"
              />
            </div>
            <Button size="sm" onClick={() => void onCustomSearch()} disabled={customLoading}>
              {customLoading ? 'Caricamento…' : 'Cerca'}
            </Button>
          </div>
        </>
      )}
    </>
  )
}
