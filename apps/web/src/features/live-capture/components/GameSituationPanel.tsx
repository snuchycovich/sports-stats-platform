import './GameSituationPanel.css'
import type { GameSituation, TeamSummary } from "../live-capture.types"

type GameSituationPanelProps = {
    readonly situation: GameSituation,
    readonly possessionTeam: TeamSummary | undefined
}

export function GameSituationPanel( { situation, possessionTeam }: GameSituationPanelProps) {
    return (
        <section className="game-situation">
            <dl className="game-situation__details">
                <div className="game-situation__item">
                    <dt className="game-situation__label">Posesión</dt>
                    <dd className="game-situation__value">{possessionTeam?.abbreviation ?? 'Equipo desconocido'}</dd>
                </div>
                <div className="game-situation__item">
                    <dt className="game-situation__label">Posición de campo</dt>
                    <dd className="game-situation__value">{situation.fieldPosition}</dd>
                </div>
                <div className="game-situation__item">
                    <dt className="game-situation__label">Down</dt>
                    <dd className="game-situation__value">{situation.down}</dd>
                </div>
                <div className="game-situation__item">
                    <dt className="game-situation__label">Distancia</dt>
                    <dd className="game-situation__value">{situation.distance} yds</dd>
                </div>
            </dl>
        </section>
    )
}
