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

const floorToY = (floor: number) =>
  app.renderer.height - config.bottomMargin - floor * config.floorHeight

const floorsGraphics = new PIXI.Graphics()
for (let floor = 0; floor < config.floorsCount; floor += 1) {
  const y = floorToY(floor)
  floorsGraphics.moveTo(config.shaftX + 50, y + 20)
  floorsGraphics.lineTo(config.rightX, y + 20)
  floorsGraphics.stroke({ width: 1, color: 0xcccccc })
}
app.stage.addChild(floorsGraphics)

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

const tweenGroup = new Group()
app.ticker.add(() => {
  tweenGroup.update()
})

const floorQueues = createFloorQueues()

const { elevator, passengers, moveToFloor, boardPassengers, dropPassengers } = createElevator(
  app,
  tweenGroup,
  floorToY
)

startPersonSpawner(app, tweenGroup, floorToY, (personView: PersonView) => {
  addPersonToQueue(floorQueues, personView.person.spawnFloor, personView)
}, floorQueues)

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const runSmartElevator = async () => {
  let currentDir: 'up' | 'down' = 'up'

  while (true) {
    const currentFloor = elevator.currentFloor;

    // 1. Service the current floor
    const dropped = dropPassengers();
    
    // If elevator is empty, it can pick up anyone regardless of currentDir
    if (passengers.length === 0) {
      const fq = floorQueues[currentFloor];
      if (fq.upQueue.length > 0) currentDir = 'up';
      else if (fq.downQueue.length > 0) currentDir = 'down';
    }
    
    boardPassengers(floorQueues, currentDir);

    if (dropped.length > 0 || passengers.length > 0) {
      await wait(800); // Doors open
    }

    // 2. Find targets
    const internalTargets = passengers.map(p => p.person.targetFloor);
    
    // Filter external targets: only stop if someone wants to go our way, 
    // OR if the elevator is empty (it can head to any floor with a queue).
    const externalTargets = floorQueues
      .map((fq, idx) => {
        const hasAnyone = fq.upQueue.length > 0 || fq.downQueue.length > 0;
        const hasSameDir = currentDir === 'up' ? fq.upQueue.length > 0 : fq.downQueue.length > 0;
        
        if (passengers.length === 0 && hasAnyone) return idx;
        if (hasSameDir) return idx;
        return -1;
      })
      .filter(idx => idx !== -1);

    const allTargets = [...new Set([...internalTargets, ...externalTargets])];

    if (allTargets.length === 0) {
      elevator.state = 'idle';
      await wait(200); 
      continue;
    }

    // 3. Decide where to go next
    let targetsAhead = allTargets.filter(t =>
      currentDir === 'up' ? t > currentFloor : t < currentFloor
    );

    if (targetsAhead.length === 0) {
      // No one ahead? Change direction
      currentDir = currentDir === 'up' ? 'down' : 'up';
      targetsAhead = allTargets.filter(t =>
        currentDir === 'up' ? t > currentFloor : t < currentFloor
      );
    }

    if (targetsAhead.length > 0) {
      const nextTarget = currentDir === 'up' 
        ? Math.min(...targetsAhead) 
        : Math.max(...targetsAhead);
      
      await moveToFloor(nextTarget);
    } else {
      // Only targets are at current floor or behind (and we already swapped dir)
      // If a target exists at current floor (someone just arrived), wait a bit
      await wait(200);
    }
  }
}

void runSmartElevator()
