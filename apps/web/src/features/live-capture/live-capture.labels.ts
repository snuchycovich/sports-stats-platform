import type { PlayAction } from "./live-capture.types";

export const playActionLabels = {
  run: 'Carrera',
  pass: 'Pase',
  incomplete_pass: 'Pase incompleto',
} as const satisfies Readonly<Record<PlayAction, string>>

export const playActionOrder = [
  'run',
  'pass',
  'incomplete_pass',
] as const satisfies readonly PlayAction[]