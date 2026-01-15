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
// Fixed: removed (floor - 1) which caused misalignment
const floorToY = (floor: number) =>
  app.renderer.height - config.bottomMargin - floor * config.floorHeight

// Draw floor lines and labels
const floorsGraphics = new PIXI.Graphics()
for (let floor = 0; floor < config.floorsCount; floor += 1) {
  const y = floorToY(floor)
  // Use stroke to actually draw the lines
  floorsGraphics.moveTo(config.shaftX - 100, y)
  floorsGraphics.lineTo(config.rightX, y)
  floorsGraphics.stroke({ width: 1, color: 0xcccccc })
}
app.stage.addChild(floorsGraphics) // CRITICAL: Add to stage

for (let floor = 0; floor < config.floorsCount; floor += 1) {
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
const { elevator, passengers, moveToFloor, boardPassengers, dropPassengers } = createElevator(
  app,
  tweenGroup,
  floorToY
)

// Start person spawner - add to queue when they reach waiting spot
startPersonSpawner(app, tweenGroup, floorToY, (personView: PersonView) => {
  addPersonToQueue(floorQueues, personView.person.spawnFloor, personView)
}, floorQueues) // Pass floorQueues

// Demo elevator route
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const runSmartElevator = async () => {
  let currentDir: 'up' | 'down' = 'up'

  while (true) {
    const currentFloor = elevator.currentFloor;

    // 1. Service the current floor (Drop off & Board)
    const dropped = dropPassengers();
    boardPassengers(floorQueues, currentDir);

    if (dropped.length > 0 || passengers.length > 0) {
      await wait(1000); // "Doors open" delay
    }

    // 2. Find the next target floor
    let targetFloor = -1;

    // Priority 1: If we have passengers, where do they want to go?
    // If moving Up, find the lowest target floor above us.
    // If moving Down, find the highest target floor below us.
    const internalTargets = passengers.map(p => p.person.targetFloor);

    // Priority 2: Where is anyone waiting?
    const externalTargets = floorQueues
      .map((fq, idx) => (fq.upQueue.length > 0 || fq.downQueue.length > 0 ? idx : -1))
      .filter(idx => idx !== -1);

    const allTargets = [...new Set([...internalTargets, ...externalTargets])];

    if (allTargets.length === 0) {
      elevator.state = 'idle';
      await wait(500); // Sit idle and wait for spawns
      continue;
    }

    // Decide direction and next floor
    // Continue in current direction if there are targets ahead
    const targetsAhead = allTargets.filter(t =>
      currentDir === 'up' ? t > currentFloor : t < currentFloor
    );

    if (targetsAhead.length > 0) {
      // Pick the CLOSEST target in our current direction
      targetFloor = currentDir === 'up'
        ? Math.min(...targetsAhead)
        : Math.max(...targetsAhead);
    } else {
      // No targets ahead? Switch direction and find closest target
      currentDir = currentDir === 'up' ? 'down' : 'up';
      const targetsNewDir = allTargets.filter(t =>
        currentDir === 'up' ? t > currentFloor : t < currentFloor
      );

      if (targetsNewDir.length > 0) {
        targetFloor = currentDir === 'up'
          ? Math.min(...targetsNewDir)
          : Math.max(...targetsNewDir);
      } else if (allTargets.length > 0) {
        // This handles the case where the only target is the current floor
        // (e.g. someone just spawned here), we stay and wait for next loop
        targetFloor = allTargets[0];
      }
    }

    // 3. Move directly to the target floor if it's not where we are
    if (targetFloor !== -1 && targetFloor !== currentFloor) {
      await moveToFloor(targetFloor);
    } else {
      await wait(500);
    }
  }
}

void runSmartElevator()
