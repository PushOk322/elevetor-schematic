import './style.css'
import * as PIXI from 'pixi.js'
import { Group } from '@tweenjs/tween.js'
import { config } from './config'
import { createElevator } from './elevator'
import { startPersonSpawner } from './personSpawner'
import { createFloorQueues, addPersonToQueue, type PersonView } from './floorQueues'

const app = new PIXI.Application()

await app.init({
  width: config.canvasWidth,
  height: config.canvasHeight,
  backgroundColor: 0xffffff,
})

const appElement = document.querySelector<HTMLDivElement>('#app')!
appElement.innerHTML = ''
appElement.appendChild(app.canvas)

// Convert floor index (0 = ground) to Y coordinate
const floorToY = (floor: number) =>
  app.renderer.height - config.bottomMargin - (floor - 1) * config.floorHeight

// Draw floor lines and labels
const floorsGraphics = new PIXI.Graphics()
for (let floor = 1; floor <= config.floorsCount; floor += 1) {
  const y = floorToY(floor)
  floorsGraphics.moveTo(config.shaftX, y)
  floorsGraphics.lineTo(config.rightX, y)
}

for (let floor = 1; floor <= config.floorsCount; floor += 1) {
  const y = floorToY(floor)
  const label = new PIXI.Text({
    text: `level ${floor}`,
    style: { fill: 0x111111, fontSize: 16 },
  })
  label.anchor.set(0, 0.5)
  label.position.set(config.rightX + 10, y)
  app.stage.addChild(label)
}

// Setup tween group
const tweenGroup = new Group()
app.ticker.add(() => {
  tweenGroup.update()
})

// Create floor queues
const floorQueues = createFloorQueues()

// Create elevator
const { elevator, moveToFloor, boardPassengers, dropPassengers } = createElevator(
  app,
  tweenGroup,
  floorToY
)

// Start person spawner - add to queue when they reach waiting spot
startPersonSpawner(app, tweenGroup, floorToY, (personView: PersonView) => {
  addPersonToQueue(floorQueues, personView.person.spawnFloor, personView)
})

// Demo elevator route
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const runDemoRoute = async () => {
  let headingUp = true

  while (true) {
    const topFloor = config.floorsCount - 1
    const nextFloor = headingUp ? topFloor : 1

    await moveToFloor(nextFloor)

    // Drop passengers at their target floor
    dropPassengers()

    // Board passengers going in the same direction
    const direction = headingUp ? 'up' : 'down'
    boardPassengers(floorQueues, direction)

    await wait(800) // stop delay
    elevator.state = 'idle'

    headingUp = !headingUp
  }
}

void runDemoRoute()
