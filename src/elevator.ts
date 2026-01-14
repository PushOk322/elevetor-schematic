import * as PIXI from 'pixi.js'
import { Group, Tween, Easing } from '@tweenjs/tween.js'
import { config } from './config'
import type { Elevator } from './types'
import type { PersonView, FloorQueues } from './floorQueues'

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
  cabin.rect(0, 0, 100, 150)
  cabin.fill(0x333333)
  cabin.x = config.shaftX - cabin.width
  app.stage.addChild(cabin)

  const placeAtFloor = (floor: number) => {
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
      const duration = distance * 1000

      tweenGroup.add(
        new Tween({ y: startY })
          .to({ y: endY }, duration)
          .easing(Easing.Quadratic.InOut)
          .onUpdate(({ y }) => {
            cabin.y = y
            // Update passenger positions to follow cabin
            passengers.forEach((pv) => {
              pv.view.y = cabin.y + cabin.height / 2 - pv.view.height / 2
            })
          })
          .onComplete(() => {
            elevator.currentFloor = clamped
            elevator.state = 'loading'
            resolve()
          })
          .start()
      )
    })
  }

  const boardPassengers = (queues: FloorQueues[], direction: 'up' | 'down') => {
    const floorQueue = queues[elevator.currentFloor]
    const queue = direction === 'up' ? floorQueue.upQueue : floorQueue.downQueue

    // Board passengers: same direction only, until capacity
    while (passengers.length < config.elevatorCapacity && queue.length > 0) {
      const personView = queue.shift()!
      passengers.push(personView)
      // Move person view into cabin (visually)
      personView.view.x = config.shaftX - personView.view.width / 2
      personView.view.y = cabin.y + cabin.height / 2 - personView.view.height / 2
    }
  }

  const dropPassengers = (): PersonView[] => {
    const dropped: PersonView[] = []
    const remaining: PersonView[] = []

    passengers.forEach((pv) => {
      if (pv.person.targetFloor === elevator.currentFloor) {
        dropped.push(pv)
        // Remove from stage (they've reached their destination)
        app.stage.removeChild(pv.view)
        pv.view.destroy()
      } else {
        remaining.push(pv)
      }
    })

    passengers.length = 0
    passengers.push(...remaining)

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
