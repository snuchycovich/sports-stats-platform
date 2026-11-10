import type { GameSituation, GameSummary, SyncState } from "./live-capture.types";

export const mockGame = {
    homeTeam: {
        id: 'halcones',
        name: 'Halcones de la Universidad Veracruzana',
        abbreviation: 'HUV',
        score: 7
    },
    awayTeam: {
        id: 'zorros',
        name: 'Zorros Dorados de Xalapa',
        abbreviation: 'ZXL',
        score: 3
    },
    period: 2,
    clock: '08:42'
} satisfies GameSummary

export const mockSituation = {
    possessionTeamId: 'halcones',
    down: 2,
    distance: 12,
    fieldPosition: 34
} satisfies GameSituation

export const mockSyncState = {
  status: 'local',
} satisfies SyncState