export type TeamSummary = {
    readonly id: string,
    readonly name: string,
    readonly abbreviation: string,
    readonly score: number,
}

export type GameSummary = {
    readonly homeTeam: TeamSummary,
    readonly awayTeam: TeamSummary,
    readonly period: number,
    readonly clock: string,
}

export type GameSituation = {
    readonly possessionTeamId: TeamSummary['id'],
    readonly down: number,
    readonly distance: number,
    readonly fieldPosition: number,
}

export type PlayAction = 
| 'run'
| 'pass'
| 'incomplete_pass'

export type CapturedPlay = {
    readonly id: string
    readonly action: PlayAction
    readonly yards: number
}

export type SyncState =
  | {
      readonly status: 'local'
    }
  | {
      readonly status: 'pending'
      readonly pendingCount: number
    }
  | {
      readonly status: 'synced'
    }
  | {
      readonly status: 'conflict'
      readonly conflictCount: number
    }


