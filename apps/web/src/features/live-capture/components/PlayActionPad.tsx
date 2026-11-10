import './PlayActionPad.css'
import type { PlayAction } from "../live-capture.types";
import { playActionLabels, playActionOrder } from '../live-capture.labels';

type PlayActionPadProps = {
    readonly selectedAction: PlayAction | null
    readonly onSelect: (action: PlayAction) => void
}

export function PlayActionPad({
  selectedAction,
  onSelect,
}: PlayActionPadProps) {
    return (
        <section 
          className="play-action-pad" 
          aria-labelledby="play-action-heading"
        >
          <h2 
            id="play-action-heading"
            className="play-action-pad__heading"
          >
            Tipo de jugada
          </h2>

          <div className="play-action-pad__actions">
            { playActionOrder.map((action) => {
              const isSelected = selectedAction === action

              return (
                <button
                key={action}
                type="button"
                className="play-action-pad__button"
                aria-pressed={isSelected}
                onClick={() => onSelect(action)}
                >
                  {playActionLabels[action]}
                </button>
              )
            })}
          </div>

        </section>
    );
}