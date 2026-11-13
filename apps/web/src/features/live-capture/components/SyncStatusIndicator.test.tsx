import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SyncStatusIndicator } from './SyncStatusIndicator'

describe('SyncStatusIndicator', () => {
  it('shows when data exists only on the device', () => {
    render(
      <SyncStatusIndicator
        syncState={{ status: 'local' }}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Solo en este dispositivo',
    )
  })

  it('shows the number of pending plays', () => {
    render(
      <SyncStatusIndicator
        syncState={{
          status: 'pending',
          pendingCount: 2,
        }}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      '2 jugadas pendientes',
    )
  })

  it('shows when all plays are synchronized', () => {
    render(
      <SyncStatusIndicator
        syncState={{ status: 'synced' }}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Sincronizado',
    )
  })

  it('shows the number of synchronization conflicts', () => {
    render(
      <SyncStatusIndicator
        syncState={{
          status: 'conflict',
          conflictCount: 1,
        }}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      '1 conflicto',
    )
  })
})