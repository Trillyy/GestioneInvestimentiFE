import { TableCell, TableRow } from '@/components/ui/table'

export function TableLoadingRows({
  loading,
  empty,
  colSpan,
  emptyMessage = 'Nessun elemento trovato',
}: {
  loading: boolean
  empty: boolean
  colSpan: number
  emptyMessage?: string
}) {
  if (loading) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="text-center py-10 text-muted-foreground">
          Caricamento…
        </TableCell>
      </TableRow>
    )
  }
  if (empty) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="text-center py-10 text-muted-foreground">
          {emptyMessage}
        </TableCell>
      </TableRow>
    )
  }
  return null
}
