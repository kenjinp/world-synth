import { useEffect, useRef, useState } from "react"
import { ProgressBar } from "react-step-progress-bar"
import "react-step-progress-bar/styles.css"
import { ProgressUI } from "../../../../tunnel"
import { geologyEvents } from "./Geology.events"
import { useGeology } from "./Geology.provider"
import { GeologyEventCallback, GeologyEventType } from "./Geology.types"

export const GeologyProgress: React.FC = () => {
  const { geology, generated } = useGeology()
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState("Generating Planet...")
  const messageRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const cb: GeologyEventCallback = data => {
      const { eventType, percentDone } = data.data
      setProgress(percentDone || 0)
      let message = "Generating Planet..."
      if (eventType === GeologyEventType.Generate) {
        message = "Generating Geology..."
      }
      if (eventType === GeologyEventType.CreatePlates) {
        message = "Generating Plates..."
      }
      if (eventType === GeologyEventType.CreateContinents) {
        message = "Generating Continents..."
      }
      if (eventType === GeologyEventType.CreateOceans) {
        message = "Generating Hybrid Ocean Crust..."
      }
      if (eventType === GeologyEventType.CreateOceanicPlates) {
        message = "Generating Oceanic Plates..."
      }
      if (eventType === GeologyEventType.CalculateBoundaryStress) {
        message = "Calculating Boundary Stress..."
      }
      setMessage(message)
    }
    geologyEvents.subscribe(cb)
    return () => {
      geologyEvents.unsubscribe(cb)
    }
  }, [geology])

  return !generated ? (
    <ProgressUI.In>
      <div
        style={{
          position: "fixed",
          height: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <h2>{message}</h2>
        <div style={{ width: "45vw" }}>
          <ProgressBar
            percent={progress * 100}
            filledBackground="linear-gradient(to right, #175515, #3F91C7)"
          />
        </div>
      </div>
    </ProgressUI.In>
  ) : null
}
