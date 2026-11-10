import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { mockGame, mockSituation, mockSyncState } from './live-capture.mock'
import { LiveCaptureScreen } from './LiveCaptureScreen'


function setup() {
  const user = userEvent.setup()

  render (
    <LiveCaptureScreen 
      game={mockGame}
      situation={mockSituation}
      syncState={mockSyncState}
    />,
  )

  return {
    user,
    yardsInput: screen.getByRole('spinbutton', {
      name : 'Yardas',
    }),
  }
}

it('disables yards until an action is selected', () => {
  const { yardsInput } = setup()

  expect(yardsInput).toBeDisabled()
})

it('enables yards and accepts a negative value for run', async () => {
  const { user, yardsInput } = setup()

  await user.click(
    screen.getByRole('button', {name: 'Carrera'}),
  )

  expect(yardsInput).toBeEnabled()

  await user.type(yardsInput, '-4')

  expect(yardsInput).toHaveValue(-4)
})

it('resets yards to zero and disables the input for an incomplete pass', async () => {
  const { user, yardsInput } = setup()

  await user.click(
    screen.getByRole('button', {name: 'Carrera'}),
  )

  await user.type(yardsInput, '8')

  expect(yardsInput).toHaveValue(8)

  const incompletePassButton = screen.getByRole('button', {
    name: 'Pase incompleto'
  })

  await user.click(incompletePassButton)

  expect(yardsInput).toHaveValue(0)
  expect(yardsInput).toBeDisabled()
  expect(incompletePassButton).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

it(' enables save only when the play is valid', async () => {
  const {user, yardsInput} = setup()

  const saveButton = screen.getByRole('button', {
    name: 'Guardar la jugada',
  })

  expect(saveButton).toBeDisabled()

  await user.click(
    screen.getByRole('button', { name: 'Carrera' }),
  )

  expect(saveButton).toBeDisabled()

  await user.type(yardsInput, '6')

  expect(saveButton).toBeEnabled()
})

it('saves a valid play and resets the form', async () => {
  const {user, yardsInput} = setup()

  const listEmptyMessage = screen.getByText(/No hay jugadas registradas./i) 
  
  expect(listEmptyMessage).toBeVisible()

  const actionRunButton = screen.getByRole('button', { name: 'Carrera' })

  await user.click(
    actionRunButton
  )

  await user.type(yardsInput, '-4')

  await user.click(
    screen.getByRole('button', { name: 'Guardar la jugada' })
  )

  expect(listEmptyMessage).not.toBeInTheDocument()

  const carreraCell = screen.getByRole('cell', { name: 'Carrera' });
  const yardsCell = screen.getByRole('cell', { name: '-4' });
  
  expect(carreraCell).toBeInTheDocument()
  expect(yardsCell).toBeInTheDocument()
  
  expect(actionRunButton).toHaveAttribute(
    'aria-pressed',
    'false',
  )

  expect(yardsInput).toHaveValue(null)
  expect(yardsInput).toBeDisabled()
})

it('saves a valid incomplete pass play', async () => {
  const {user, yardsInput} = setup()


  await user.click(
    screen.getByRole('button', { name: 'Pase incompleto' })
  )

  expect(yardsInput).toHaveValue(0)

  const saveButton = screen.getByRole('button', { name: 'Guardar la jugada'})
  
  expect(saveButton).toBeEnabled()

  await user.click(saveButton)

  const incompleteCell = screen.getByRole('cell', { name: 'Pase incompleto' });
  const yardsCell = screen.getByRole('cell', { name: '0' })
  
  expect(incompleteCell).toBeInTheDocument()
  expect(yardsCell).toBeInTheDocument()
})
