import './YardsInput.css'

type YardsInputProps = {
    readonly value: string
    readonly onChange: (value: string) => void
    readonly disabled: boolean
}

export function YardsInput( {value, onChange, disabled}: YardsInputProps) {
  return (
    <section className="yards-input">
      <label className="yards-input__label" htmlFor="yards-input">Yardas</label>
      <input 
          id="yards-input" 
          className="yards-input__control"
          type="number"
          inputMode="numeric" 
          value={value} 
          disabled={disabled} 
          onChange={(event) => onChange(event.currentTarget.value)}
      />
    </section>
  )
}
