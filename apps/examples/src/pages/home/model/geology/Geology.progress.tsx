import { useEffect, useRef } from "react"
import { ProgressBar } from "react-step-progress-bar"
import "react-step-progress-bar/styles.css"
import { ProgressUI } from "../../../../tunnel"
import { useGeology } from "./Geology.provider"
import { GeologyEventCallback, GeologyEventType } from "./Geology.types"

export const GeologyProgress: React.FC = () => {
  const { geology, generated } = useGeology()
  const messageRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    // const ui = document.getElementById("ui")
    // const gstats = document.createElement("div")
    // ui?.appendChild(gstats)
    const messageHolder = messageRef.current
    const cb: GeologyEventCallback = ({ geology, data }) => {
      const { eventType, percentDone } = data
      console.log(data)
      let message = ""
      if (eventType === GeologyEventType.Generate) {
        message = "Generating Geology..."
      }
      if (eventType === GeologyEventType.CreatePlates) {
        message = "Generating Plates"
      }
      if (eventType === GeologyEventType.CreateContinents) {
        message = "Generating Continents"
      }
      if (eventType === GeologyEventType.CreateOceans) {
        message = "Generating Hybrid Ocean Crust"
      }
      if (eventType === GeologyEventType.CreateOceanicPlates) {
        message = "Generating Oceanic Plates"
      }
      if (messageHolder) {
        messageHolder.innerHTML = message
      }
      // if (gstats) {
      //   gstats.innerHTML = `
      //   <p>Plates: ${geology.plates.length}</p>
      //   <p>Continents: ${geology.continents.length}</p>
      //   <p>Oceans: ${geology.oceans.length}</p>
      //   `
      // }
    }
    geology.addEventListener(GeologyEventType.Generate, cb)

    return () => {
      geology.removeEventListener(GeologyEventType.Generate, cb)
      // gstats.innerHTML = ""
      // ui?.removeChild(gstats)
    }
  }, [geology])

  return generated ? (
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
        <h2 ref={messageRef}></h2>
        <div style={{ width: "45vw" }}>
          <ProgressBar
            percent={progress}
            filledBackground="linear-gradient(to right, #175515, #3F91C7)"
          />
        </div>
      </div>
    </ProgressUI.In>
  ) : null
}
