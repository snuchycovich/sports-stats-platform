import { useState, type SubmitEvent } from "react"
import { GameHeader} from "./components/GameHeader"
import { GameSituationPanel }  from "./components/GameSituationPanel"
import type { CapturedPlay, GameSituation, GameSummary, PlayAction, SyncState } from "./live-capture.types"
import { PlayActionPad } from "./components/PlayActionPad"
import { YardsInput } from "./components/YardsInput"
import { SavePlayButton } from "./components/SavePlayButton"
import { RecentPlaysList } from "./components/RecentPlaysList"
import { SyncStatusIndicator } from "./components/SyncStatusIndicator"

type LiveCaptureScreenProps = {
    readonly game: GameSummary,
    readonly situation: GameSituation,
    readonly syncState: SyncState,
}

export function LiveCaptureScreen({ game, situation, syncState }: LiveCaptureScreenProps) {
  const [selectedAction, setSelectedAction] = useState<PlayAction | null>(null)
  const [yards, setYards] = useState('')
  const [recentPlays, setRecentPlays] = useState<readonly CapturedPlay[]>([])
  
  const possessionTeam = [
      game.homeTeam,
      game.awayTeam,
  ].find((team) => team.id === situation.possessionTeamId)

  function handleActionSelect(action: PlayAction) {
    setSelectedAction(action)
    setYards(action === 'incomplete_pass' ? '0' : '')
  }

  const numericYards = Number(yards)

  const canSave = 
    selectedAction !== null &&
    yards.trim() !== '' &&
    Number.isFinite(numericYards)

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    if (
      selectedAction === null ||
      yards.trim() === '' ||
      !Number.isFinite(numericYards)
    ) {
      return
    }

    const newPlay: CapturedPlay = {
      id: crypto.randomUUID(),
      action: selectedAction,
      yards: numericYards,
    }

    setRecentPlays((currentPlays) => [
      ...currentPlays,
      newPlay
    ])

    setSelectedAction(null)
    setYards('')
  }
  
  return (
      <main>
          <GameHeader game={game} />
          <GameSituationPanel situation={situation} possessionTeam={possessionTeam} />
          <form onSubmit={handleSubmit}>
            <PlayActionPad 
            selectedAction={selectedAction} 
            onSelect={handleActionSelect}
            />

            <YardsInput 
              value={yards} 
              onChange={setYards} 
              disabled={
                selectedAction === null  ||
                selectedAction === 'incomplete_pass'
              }
            />

            <SavePlayButton disabled={!canSave} />
          </form>
          <RecentPlaysList recentPlays={recentPlays}/>
          <SyncStatusIndicator syncState={syncState} />
      </main>
  )
}
