import './GameHeader.css'
import type { GameSummary } from "../live-capture.types";

type GameHeaderProps = {
    readonly game: GameSummary;
}
export function GameHeader({game}: GameHeaderProps) {
  const homeTeam = game.homeTeam;
  const awayTeam = game.awayTeam;

  return (
      <header className="game-header" aria-label="Game score">
          <div className="game-header__team game-header__team--home">
              <p className="game-header__details">
                <span className="game-header__name">{homeTeam.name}</span>
                <span className="game-header__abbreviation">{homeTeam.abbreviation}</span>
              </p>
              <strong className="game-header__score">{homeTeam.score}</strong>
          </div>

          <p className="game-header__status">
              Period {game.period} · {game.clock}
          </p>

          <div className="game-header__team game-header__team--away">
              <p className="game-header__details">
                <span className="game-header__name">{awayTeam.name}</span>
                <span className="game-header__abbreviation">{awayTeam.abbreviation}</span>
              </p>
              <strong className="game-header__score">{awayTeam.score}</strong>
          </div>
      </header>
  );
}
