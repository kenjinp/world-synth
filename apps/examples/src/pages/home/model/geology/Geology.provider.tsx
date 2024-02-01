import * as React from "react"
import { GeologyEventType, IGeology } from "./Geology.types"

export const GeologyContext = React.createContext<IGeology>(null!)

export const useGeology = () => {
  const geology = React.useContext(GeologyContext)
  const [generated, setGenerated] = React.useState(false)
  React.useEffect(() => {
    if (geology) {
      setGenerated(geology.generated)
      geology.addEventListener(GeologyEventType.Generate, () => {
        console.log("Geology Generated Event", geology.generated)
        setGenerated(geology.generated)
      })
    }
  }, [geology])

  return {
    geology,
    generated,
  }
}

export const GeologyProvider: React.FC<
  React.PropsWithChildren<{ geology: IGeology }>
> = ({ geology, children }) => {
  return (
    <GeologyContext.Provider value={geology}>
      {children}
    </GeologyContext.Provider>
  )
}
