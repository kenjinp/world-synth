import * as React from "react"
import { IGeology } from "./Geology.types"

export const GeologyContext = React.createContext<IGeology>(null!)

export const useGeology = () => React.useContext(GeologyContext)

export const GeologyProvider: React.FC<
  React.PropsWithChildren<{ geology: IGeology }>
> = ({ geology, children }) => {
  return (
    <GeologyContext.Provider value={geology}>
      {children}
    </GeologyContext.Provider>
  )
}
