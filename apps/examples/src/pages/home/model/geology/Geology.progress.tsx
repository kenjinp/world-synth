import { useEffect } from "react"
import { useGeology } from "./Geology.provider"
import { GeologyEventType } from "./Geology.types"

export const GeologyProgress: React.FC = () => {
  const geology = useGeology()

  useEffect(() => {
    const ui = document.getElementById("ui")
    const gstats = document.createElement("div")
    ui?.appendChild(gstats)
    const cb = () => {
      if (gstats) {
        gstats.innerHTML = `
        <p>Plates: ${geology.plates.length}</p>
        <p>Continents: ${geology.continents.length}</p>
        <p>Oceans: ${geology.oceans.length}</p>
        `
      }
    }
    geology.addEventListener(GeologyEventType.Generate, cb)

    return () => {
      geology.removeEventListener(GeologyEventType.Generate, cb)
      gstats.innerHTML = ""
      ui?.removeChild(gstats)
    }
  }, [geology])

  return null
}
