import {
  ChunkGeneratedEvent,
  ChunkPendingEvent,
  ChunkWillBeDisposedEvent,
} from "@hello-worlds/planets"
import { usePlanet } from "@hello-worlds/react"
import React from "react"

export const ChunkDebugger: React.FC = () => {
  const planet = usePlanet()

  React.useEffect(() => {
    const ui = document.getElementById("ui")
    const chunkStats = document.createElement("div")
    ui?.appendChild(chunkStats)
    const chunkMap = new Map<
      string,
      {
        timeStart: number
        timeEnd: number
      }
    >()

    const updateChunkStats = () => {
      const chunks = Array.from(chunkMap.values())
      const total = chunks.reduce((acc, curr) => {
        return acc + (curr.timeEnd - curr.timeStart)
      }, 0)
      const avg = total / chunks.length
      chunkStats.innerHTML = `
      <br/>
      <p>Chunks: ${chunks.length}</p>
      <p>Average: ${avg.toFixed(2)}ms</p>
      `
    }

    if (!planet) return
    const pendingListener = (e: Event) => {
      const { chunk } = e as unknown as ChunkPendingEvent
      const key = chunk.id.toString()
      chunkMap.set(key, {
        timeStart: performance.now(),
        timeEnd: 0,
      })
      updateChunkStats()
    }
    const createdListener = (e: Event) => {
      const { chunk } = e as unknown as ChunkGeneratedEvent
      const key = chunk.id.toString()
      const chunkStats = chunkMap.get(key)
      if (chunkStats) {
        chunkStats.timeEnd = performance.now()
      }
      updateChunkStats()
    }
    const willDisposeListener = (e: Event) => {
      const { chunk } = e as unknown as ChunkWillBeDisposedEvent
      const key = chunk.id.toString()
      chunkMap.delete(key)
    }
    planet.addEventListener(ChunkPendingEvent.type, pendingListener)
    planet.addEventListener(ChunkGeneratedEvent.type, createdListener)
    planet.addEventListener(ChunkWillBeDisposedEvent.type, willDisposeListener)
    return () => {
      planet.removeEventListener(ChunkPendingEvent.type, pendingListener)
      planet.removeEventListener(ChunkGeneratedEvent.type, createdListener)
      planet.addEventListener(
        ChunkWillBeDisposedEvent.type,
        willDisposeListener,
      )
      if (chunkStats) {
        chunkStats.innerHTML = ""
        ui?.removeChild(chunkStats)
      }
    }
  }, [planet])
  return null
}
