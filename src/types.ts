export type ElevatorState = 'idle' | 'moving' | 'loading'

export type PersonDirection = 'up' | 'down'

export interface Elevator {
  currentFloor: number
  targetFloor: number
  state: ElevatorState
}

export interface Person {
  spawnFloor: number
  targetFloor: number
  dir: PersonDirection
}
