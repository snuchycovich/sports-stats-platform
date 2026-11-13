import './SavePlayButton.css'

type SavePlayButtonProps = {
    readonly disabled: boolean
}

export function SavePlayButton({disabled}: SavePlayButtonProps) {
  return(
    <button className="save-play-button" type="submit" disabled={disabled}>
        Guardar la jugada
    </button>
  )
}
