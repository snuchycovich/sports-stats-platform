import { playActionLabels } from "../live-capture.labels"
import type { CapturedPlay } from "../live-capture.types"
import './RecentPlaysList.css'

type RecentPlaysProps = {
  readonly recentPlays: readonly CapturedPlay[]
}

export function RecentPlaysList({recentPlays}: RecentPlaysProps) {
  return (
    <section className="recent-plays-list" aria-labelledby="recent-plays-heading">
        <h2 className="recent-plays-list__heading" id="recent-plays-heading">Jugadas recientes</h2>
        {recentPlays.length === 0 ? (
          <p className="recent-plays-list__empty">No hay jugadas registradas.</p>
        ) : (
          <table className="recent-plays-list__table">
            <thead>
              <tr>
                <th scope="col">Acción</th>
                <th scope="col">Yardas</th>
              </tr>
            </thead>

            <tbody>
              {recentPlays.toReversed().map((capturedPlay) => (
                <tr key={capturedPlay.id}>
                  <td>{playActionLabels[capturedPlay.action]}</td>
                  <td>{capturedPlay.yards}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </section>
  )
}
