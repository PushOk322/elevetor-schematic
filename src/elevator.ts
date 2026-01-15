import * as PIXI from 'pixi.js'
import { Group, Tween, Easing } from '@tweenjs/tween.js'
import { config } from './config'
import type { Elevator } from './types'
import { type PersonView, type FloorQueues, relayoutFloorQueues } from './floorQueues'

export function createElevator(
  app: PIXI.Application,
  tweenGroup: Group,
  floorToY: (floor: number) => number
): {
  elevator: Elevator
  cabin: PIXI.Graphics
  passengers: PersonView[]
  moveToFloor: (targetFloor: number) => Promise<void>
  placeAtFloor: (floor: number) => void
  boardPassengers: (queues: FloorQueues[], direction: 'up' | 'down') => void
  dropPassengers: () => PersonView[]
} {
  const elevator: Elevator = {
    currentFloor: 1,
    targetFloor: 1,
    state: 'idle',
  }

  const passengers: PersonView[] = []

  const cabin = new PIXI.Graphics()
  // Match cabin height to floorHeight for perfect alignment
  cabin.rect(0, 0, 100, config.floorHeight)
  cabin.stroke({ width: 4, color: 0x333333 })
  cabin.x = config.shaftX - cabin.width
  app.stage.addChild(cabin)

  const placeAtFloor = (floor: number) => {
    // Cabin y is the top, so we subtract height from floor Y
    cabin.y = floorToY(floor) - cabin.height
  }

  placeAtFloor(elevator.currentFloor)

  const moveToFloor = (targetFloor: number) => {
    const clamped = Math.max(0, Math.min(config.floorsCount - 1, targetFloor))
    const distance = Math.abs(clamped - elevator.currentFloor)
    if (distance === 0) return Promise.resolve()

    elevator.state = 'moving'
    elevator.targetFloor = clamped

    return new Promise<void>((resolve) => {
      const startY = cabin.y
      const endY = floorToY(clamped) - cabin.height
      const duration = distance * 400 

      const tween = new Tween({ y: startY })
        .to({ y: endY }, duration)
        .easing(Easing.Quadratic.InOut)
        .onUpdate(({ y }) => {
          cabin.y = y
        })
        .onComplete(() => {
          elevator.currentFloor = clamped
          elevator.state = 'idle' // Reset to idle immediately
          resolve()
        })
        .start()

      tweenGroup.add(tween)
    })
  }

    const boardPassengers = (queues: FloorQueues[], direction: 'up' | 'down') => {
      const floorQueue = queues[elevator.currentFloor]
      if (!floorQueue) return

      const queue = direction === 'up' ? floorQueue.upQueue : floorQueue.downQueue

      // Board passengers: same direction only, until capacity
      while (passengers.length < config.elevatorCapacity && queue.length > 0) {
        const personView = queue.shift()!
        passengers.push(personView)
        
        cabin.addChild(personView.view)
        
        // Reset position relative to cabin
        personView.view.x = 0
        personView.view.y = 0
        
        // Calculate a nice grid-like position inside the cabin border
        const index = passengers.length - 1;
        const row = Math.floor(index / 2);
        const col = index % 2;
        
        personView.view.x = 15 + col * 40; // Horizontal offset
        personView.view.y = cabin.height - personView.view.height - 10 - (row * 10); 
      }

      relayoutFloorQueues(queues, elevator.currentFloor)
    }

    const dropPassengers = (): PersonView[] => {
      const dropped: PersonView[] = []
      
      for (let i = passengers.length - 1; i >= 0; i--) {
        const pv = passengers[i]
        if (pv.person.targetFloor === elevator.currentFloor) {
          dropped.push(pv)
          // Remove from cabin container
          cabin.removeChild(pv.view)
          pv.view.destroy()
          passengers.splice(i, 1)
        }
      }

      return dropped
    }

    return {
    elevator,
    cabin,
    passengers,
    moveToFloor,
    placeAtFloor,
    boardPassengers,
    dropPassengers,
  }
}
