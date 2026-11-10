import './SyncStatusIndicator.css'
import type { SyncState } from "../live-capture.types"

type SyncStatusIndicatorProps = {
    readonly syncState: SyncState
}

export function SyncStatusIndicator({ syncState }: SyncStatusIndicatorProps) {
  let message: string

  switch (syncState.status) {
    case 'local':
      message = 'Solo en este dispositivo'
      break
    case 'pending':
      message = 
        syncState.pendingCount === 1
        ? '1 jugada pendiente'
        : `${syncState.pendingCount} jugadas pendientes`
      break
    case 'synced':
      message = 'Sincronizado'
      break
    case 'conflict':
      message = `${syncState.conflictCount} conflicto${syncState.conflictCount === 1 ? '' : 's'}`
      break
  }

  return (
    <output
      className="sync-status"
      data-status={syncState.status}
    >
      <span>{message}</span>
    </output>
  )
}
