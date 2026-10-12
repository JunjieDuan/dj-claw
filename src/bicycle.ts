import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  Object3D,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import {
  AXLE_Y,
  BB_Y,
  BB_Z,
  CRANK_LENGTH,
  CRANK_X,
  FRONT_Z,
  GRIP_X,
  GRIP_Y,
  GRIP_Z,
  REAR_Z,
  SEAT_Y,
  SEAT_Z,
  WHEEL_RADIUS,
} from './constants.ts'
import type { Materials } from './materials.ts'

const up = new Vector3(0, 1, 0)

function tube(from: Vector3, to: Vector3, radius: number, material: Materials[keyof Materials]): Mesh {
  const dir = new Vector3().subVectors(to, from)
  const len = Math.max(dir.length(), 0.001)
  const mesh = new Mesh(new CylinderGeometry(radius, radius, len, 10), material)
  mesh.position.copy(from).add(to).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(up, dir.normalize())
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function createWheel(materials: Materials): Group {
  const wheel = new Group()

  const tire = new Mesh(new TorusGeometry(WHEEL_RADIUS, 0.03, 12, 36), materials.tire)
  tire.rotation.y = Math.PI / 2
  tire.castShadow = true
  tire.receiveShadow = true
  wheel.add(tire)

  const wall = new Mesh(new TorusGeometry(WHEEL_RADIUS - 0.012, 0.012, 8, 28), materials.wall)
  wall.rotation.y = Math.PI / 2
  wheel.add(wall)

  const rim = new Mesh(new TorusGeometry(WHEEL_RADIUS - 0.05, 0.01, 8, 28), materials.rim)
  rim.rotation.y = Math.PI / 2
  wheel.add(rim)

  const hub = new Mesh(new CylinderGeometry(0.038, 0.038, 0.07, 12), materials.gold)
  hub.rotation.z = Math.PI / 2
  hub.castShadow = true
  wheel.add(hub)

  const spokeLen = WHEEL_RADIUS - 0.07
  const spokeGeo = new CylinderGeometry(0.005, 0.005, spokeLen, 4)
  spokeGeo.translate(0, spokeLen / 2, 0)
  for (let i = 0; i < 12; i++) {
    const spoke = new Mesh(spokeGeo, materials.spoke)
    spoke.rotation.x = (i / 12) * Math.PI * 2
    wheel.add(spoke)
  }

  return wheel
}

function createFender(materials: Materials): Group {
  const arc = Math.PI * 0.7
  const holder = new Group()
  const fender = new Mesh(
    new TorusGeometry(WHEEL_RADIUS + 0.048, 0.014, 8, 22, arc),
    materials.wall,
  )
  fender.rotation.z = Math.PI / 2 - arc / 2
  fender.castShadow = true
  holder.add(fender)
  holder.rotation.y = Math.PI / 2
  return holder
}

function createCrankArm(materials: Materials, x: number, flipped: boolean): { arm: Group; pedal: Group } {
  const arm = new Group()
  arm.position.x = x
  if (flipped) arm.rotation.x = Math.PI

  const bar = new Mesh(new CylinderGeometry(0.016, 0.016, CRANK_LENGTH, 8), materials.gold)
  bar.position.y = CRANK_LENGTH / 2
  bar.castShadow = true
  arm.add(bar)

  const pedal = new Group()
  pedal.position.y = CRANK_LENGTH
  const platform = new Mesh(new BoxGeometry(0.1, 0.02, 0.062), materials.pedal)
  platform.castShadow = true
  pedal.add(platform)

  const stripe = new Mesh(new BoxGeometry(0.055, 0.024, 0.03), materials.gold)
  pedal.add(stripe)

  arm.add(pedal)
  return { arm, pedal }
}

function createBasket(materials: Materials): Group {
  const basket = new Group()
  const rim = new Mesh(new TorusGeometry(0.16, 0.012, 6, 16), materials.basket)
  rim.rotation.x = Math.PI / 2
  rim.castShadow = true
  basket.add(rim)

  const floor = new Mesh(new CylinderGeometry(0.15, 0.15, 0.012, 14), materials.basket)
  floor.position.y = -0.1
  basket.add(floor)

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const rod = new Mesh(new CylinderGeometry(0.006, 0.006, 0.1, 5), materials.basket)
    rod.position.set(Math.cos(a) * 0.15, -0.05, Math.sin(a) * 0.15)
    basket.add(rod)
  }

  const stem = new Mesh(new CylinderGeometry(0.006, 0.006, 0.08, 5), materials.leaf)
  stem.position.set(-0.07, -0.02, 0.02)
  const bloom = new Mesh(new SphereGeometry(0.028, 10, 8), materials.flowerPink)
  bloom.position.set(-0.07, 0.03, 0.02)
  basket.add(stem, bloom)

  return basket
}

export type Bicycle = {
  group: Group
  frontWheel: Group
  rearWheel: Group
  crank: Group
  leftPedal: Group
  rightPedal: Group
  leftGrip: Object3D
  rightGrip: Object3D
}

export function createBicycle(materials: Materials): Bicycle {
  const group = new Group()

  const rear = new Vector3(0, AXLE_Y, REAR_Z)
  const front = new Vector3(0, AXLE_Y, FRONT_Z)
  const bb = new Vector3(0, BB_Y, BB_Z)
  const seat = new Vector3(0, SEAT_Y, SEAT_Z)
  const headset = new Vector3(0, 0.9, -0.38)
  const stemTop = new Vector3(0, GRIP_Y + 0.02, GRIP_Z - 0.06)

  const rearWheel = createWheel(materials)
  rearWheel.position.copy(rear)
  const frontWheel = createWheel(materials)
  frontWheel.position.copy(front)
  group.add(rearWheel, frontWheel)

  const rearFender = createFender(materials)
  rearFender.position.copy(rear)
  const frontFender = createFender(materials)
  frontFender.position.copy(front)
  group.add(rearFender, frontFender)

  group.add(tube(bb, seat, 0.022, materials.frame))
  group.add(tube(bb, headset, 0.022, materials.frame))
  group.add(tube(seat.clone().add(new Vector3(0, -0.02, -0.02)), headset, 0.02, materials.frame))
  group.add(tube(bb, rear, 0.016, materials.frame))
  group.add(tube(seat.clone().add(new Vector3(0, -0.04, 0.02)), rear, 0.014, materials.frame))

  for (const side of [-1, 1]) {
    const axle = front.clone()
    axle.x = side * 0.07
    const crown = headset.clone()
    crown.x = side * 0.035
    group.add(tube(crown, axle, 0.014, materials.frame))
  }

  group.add(tube(headset, stemTop, 0.018, materials.frame))

  const barL = new Vector3(-0.22, GRIP_Y, GRIP_Z - 0.04)
  const barR = new Vector3(0.22, GRIP_Y, GRIP_Z - 0.04)
  group.add(tube(barL, barR, 0.016, materials.frame))
  group.add(tube(stemTop, new Vector3(0, GRIP_Y, GRIP_Z - 0.04), 0.016, materials.frame))

  const leftGrip = new Object3D()
  leftGrip.position.set(-GRIP_X, GRIP_Y, GRIP_Z)
  const rightGrip = new Object3D()
  rightGrip.position.set(GRIP_X, GRIP_Y, GRIP_Z)
  group.add(leftGrip, rightGrip)

  group.add(tube(barL, leftGrip.position, 0.02, materials.grip))
  group.add(tube(barR, rightGrip.position, 0.02, materials.grip))

  const bell = new Mesh(new SphereGeometry(0.028, 12, 10), materials.gold)
  bell.position.set(0.12, GRIP_Y + 0.045, GRIP_Z - 0.02)
  bell.castShadow = true
  group.add(bell)

  const saddle = new Mesh(new SphereGeometry(0.11, 16, 12), materials.saddle)
  saddle.scale.set(0.55, 0.32, 1.15)
  saddle.position.set(0, SEAT_Y + 0.03, SEAT_Z)
  saddle.rotation.x = -0.35
  saddle.castShadow = true
  group.add(saddle)

  const crank = new Group()
  crank.position.copy(bb)
  const housing = new Mesh(new SphereGeometry(0.045, 12, 10), materials.frame)
  housing.castShadow = true
  crank.add(housing)

  const ring = new Group()
  ring.position.x = 0.05
  const disc = new Mesh(new CylinderGeometry(0.078, 0.078, 0.014, 18), materials.gold)
  disc.rotation.z = Math.PI / 2
  ring.add(disc)
  const toothGeo = new CylinderGeometry(0.012, 0.012, 0.028, 5)
  const toothOut = new Vector3()
  for (let i = 0; i < 12; i++) {
    const tooth = new Mesh(toothGeo, materials.gold)
    const a = (i / 12) * Math.PI * 2
    toothOut.set(0, Math.cos(a), Math.sin(a))
    tooth.position.copy(toothOut).multiplyScalar(0.09)
    tooth.quaternion.setFromUnitVectors(up, toothOut)
    ring.add(tooth)
  }
  crank.add(ring)

  const left = createCrankArm(materials, -CRANK_X, false)
  const right = createCrankArm(materials, CRANK_X, true)
  crank.add(left.arm, right.arm)
  group.add(crank)

  const cog = new Group()
  cog.position.set(0.05, 0, 0)
  const cogDisc = new Mesh(new CylinderGeometry(0.05, 0.05, 0.012, 14), materials.gold)
  cogDisc.rotation.z = Math.PI / 2
  cog.add(cogDisc)
  rearWheel.add(cog)

  const basket = createBasket(materials)
  basket.position.set(0, 0.86, -0.5)
  group.add(basket)

  const reflector = new Mesh(new SphereGeometry(0.03, 10, 8), materials.cherry)
  reflector.position.set(0, SEAT_Y - 0.08, REAR_Z + 0.08)
  group.add(reflector)

  return {
    group,
    frontWheel,
    rearWheel,
    crank,
    leftPedal: left.pedal,
    rightPedal: right.pedal,
    leftGrip,
    rightGrip,
  }
}
