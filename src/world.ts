import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  Object3D,
  SphereGeometry,
} from 'three'
import { ROAD_TOP } from './constants.ts'
import type { Materials } from './materials.ts'

const SEG_LEN = 8
const SEG_COUNT = 12
const ROAD_SPAN = SEG_LEN * SEG_COUNT

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function gull(materials: Materials): Group {
  const g = new Group()
  const body = new Mesh(new SphereGeometry(0.1, 8, 6), materials.feather)
  body.scale.set(0.55, 0.45, 1.35)
  const wingGeo = new BoxGeometry(0.32, 0.015, 0.1)
  const left = new Mesh(wingGeo, materials.feather)
  left.position.set(-0.18, 0.02, 0)
  left.rotation.z = -0.35
  const right = new Mesh(wingGeo, materials.feather)
  right.position.set(0.18, 0.02, 0)
  right.rotation.z = 0.35
  const tipGeo = new BoxGeometry(0.12, 0.012, 0.08)
  const tipL = new Mesh(tipGeo, materials.wingTip)
  tipL.position.set(-0.36, 0.08, 0)
  const tipR = new Mesh(tipGeo, materials.wingTip)
  tipR.position.set(0.36, 0.08, 0)
  const beak = new Mesh(new ConeGeometry(0.02, 0.08, 5), materials.beak)
  beak.rotation.x = -Math.PI / 2
  beak.position.set(0, 0, -0.12)
  g.add(body, left, right, tipL, tipR, beak)
  return g
}

function palm(materials: Materials, x: number, z: number, scale: number): Group {
  const g = new Group()
  g.position.set(x, 0, z)
  g.scale.setScalar(scale)
  const trunk = new Mesh(new CylinderGeometry(0.06, 0.09, 1.5, 6), materials.trunk)
  trunk.position.y = 0.75
  trunk.rotation.z = 0.12
  trunk.castShadow = true
  g.add(trunk)
  for (let i = 0; i < 5; i++) {
    const frond = new Mesh(new SphereGeometry(0.28, 8, 6), materials.leaf)
    const a = (i / 5) * Math.PI * 2
    frond.scale.set(0.35, 0.18, 1)
    frond.position.set(Math.cos(a) * 0.22, 1.5, Math.sin(a) * 0.22)
    frond.castShadow = true
    g.add(frond)
  }
  return g
}

function hut(materials: Materials, x: number, z: number): Group {
  const g = new Group()
  g.position.set(x, 0, z)
  const body = new Mesh(new BoxGeometry(1.1, 0.8, 0.9), materials.sand)
  body.position.y = 0.4
  body.castShadow = true
  body.receiveShadow = true
  const roof = new Mesh(new BoxGeometry(1.35, 0.1, 1.15), materials.wood)
  roof.position.y = 0.86
  roof.castShadow = true
  const door = new Mesh(new BoxGeometry(0.28, 0.48, 0.04), materials.woodDark)
  door.position.set(0, 0.28, 0.46)
  g.add(body, roof, door)
  return g
}

function pier(materials: Materials): Group {
  const g = new Group()
  const deck = new Mesh(new BoxGeometry(4.4, 0.08, 1), materials.wood)
  deck.position.set(-4.6, 0.42, 0)
  deck.castShadow = true
  deck.receiveShadow = true
  g.add(deck)
  const rail = new Mesh(new BoxGeometry(4.2, 0.04, 0.04), materials.woodDark)
  rail.position.set(-4.6, 0.62, 0.42)
  const rail2 = rail.clone()
  rail2.position.z = -0.42
  g.add(rail, rail2)
  for (let i = 0; i < 4; i++) {
    for (const z of [-0.32, 0.32]) {
      const post = new Mesh(new CylinderGeometry(0.045, 0.055, 0.7, 6), materials.woodDark)
      post.position.set(-2.8 - i * 1.15, 0.12, z)
      post.castShadow = true
      g.add(post)
    }
  }
  return g
}

function roadSegment(materials: Materials, index: number): Group {
  const g = new Group()

  const sea = new Mesh(new BoxGeometry(16, 0.12, SEG_LEN), index % 2 === 0 ? materials.sea : materials.seaDeep)
  sea.position.set(-12.2, -0.04, 0)
  sea.receiveShadow = true
  g.add(sea)

  for (let i = 0; i < 3; i++) {
    const wave = new Mesh(new BoxGeometry(2.4, 0.02, 0.08), materials.foam)
    wave.position.set(-6 - i * 2.2, 0.03, -2 + hash(index * 5 + i) * 4)
    g.add(wave)
  }

  const foam = new Mesh(new BoxGeometry(0.45, 0.04, SEG_LEN), materials.foam)
  foam.position.set(-4.15, 0.03, 0)
  g.add(foam)

  const sand = new Mesh(new BoxGeometry(2.6, 0.1, SEG_LEN), materials.sand)
  sand.position.set(-2.7, 0.04, 0)
  sand.receiveShadow = true
  g.add(sand)

  const road = new Mesh(new BoxGeometry(3.2, 0.08, SEG_LEN), materials.road)
  road.position.y = ROAD_TOP - 0.04
  road.receiveShadow = true
  g.add(road)

  for (let i = 0; i < 3; i++) {
    const dash = new Mesh(new BoxGeometry(0.1, 0.015, 1.05), materials.dash)
    dash.position.set(0, ROAD_TOP + 0.008, -SEG_LEN / 2 + 1.5 + i * 2.3)
    g.add(dash)
  }

  for (const side of [-1, 1]) {
    const line = new Mesh(new BoxGeometry(0.06, 0.012, SEG_LEN), materials.dash)
    line.position.set(side * 1.48, ROAD_TOP + 0.008, 0)
    g.add(line)
  }

  const board = new Mesh(new BoxGeometry(1.5, 0.1, SEG_LEN), materials.sandDeep)
  board.position.set(2.4, 0.05, 0)
  board.receiveShadow = true
  g.add(board)

  const dune = new Mesh(new BoxGeometry(12, 0.08, SEG_LEN), materials.dune)
  dune.position.set(9.2, 0.02, 0)
  dune.receiveShadow = true
  g.add(dune)

  if (index % 3 === 0) g.add(pier(materials))

  if (hash(index + 2) > 0.35) {
    g.add(palm(materials, 4.2 + hash(index) * 1.2, (hash(index + 4) - 0.5) * 3, 0.85 + hash(index + 1) * 0.4))
  }

  if (index % 4 === 1) g.add(hut(materials, 5.6, (hash(index + 8) - 0.5) * 2))

  for (let t = 0; t < 4; t++) {
    const tuft = new Mesh(new ConeGeometry(0.05, 0.22, 5), materials.leaf)
    tuft.position.set(-1.9 - hash(index * 3 + t) * 0.6, 0.12, -2.4 + t * 1.4)
    g.add(tuft)
  }

  g.position.z = (index - SEG_COUNT / 2) * SEG_LEN + SEG_LEN / 2
  return g
}

function cloud(materials: Materials, scale: number): Group {
  const g = new Group()
  const puffs: Array<[number, number, number, number]> = [
    [0, 0, 0, 0.72],
    [0.85, 0.08, 0.1, 0.55],
    [-0.8, 0.02, 0.05, 0.5],
    [0.28, 0.28, -0.05, 0.42],
  ]
  for (const [x, y, z, r] of puffs) {
    const puff = new Mesh(new SphereGeometry(r, 10, 8), materials.cloud)
    puff.position.set(x, y, z)
    g.add(puff)
  }
  g.scale.setScalar(scale)
  return g
}

function lighthouse(materials: Materials): Group {
  const g = new Group()
  const tower = new Mesh(new CylinderGeometry(0.38, 0.55, 3.4, 10), materials.feather)
  tower.position.y = 1.7
  tower.castShadow = true
  const band = new Mesh(new CylinderGeometry(0.4, 0.4, 0.28, 10), materials.cherry)
  band.position.y = 2.7
  const lamp = new Mesh(new CylinderGeometry(0.28, 0.28, 0.35, 8), materials.beak)
  lamp.position.y = 3.5
  const cap = new Mesh(new ConeGeometry(0.4, 0.35, 8), materials.wingTip)
  cap.position.y = 3.85
  g.add(tower, band, lamp, cap)
  return g
}

type Layer = {
  objects: Object3D[]
  span: number
  factor: number
}

export type World = {
  group: Group
  scroll: (distance: number) => void
}

export function createWorld(materials: Materials): World {
  const group = new Group()

  const ground = new Mesh(new CircleGeometry(160, 40), materials.seaDeep)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.08
  ground.receiveShadow = true
  group.add(ground)

  const roadBits: Object3D[] = []
  for (let i = 0; i < SEG_COUNT; i++) {
    const seg = roadSegment(materials, i)
    group.add(seg)
    roadBits.push(seg)
  }

  const cloudSpan = 96
  const clouds: Object3D[] = []
  for (let i = 0; i < 7; i++) {
    const c = cloud(materials, 1.05 + hash(i + 40) * 0.8)
    c.position.set(-2 + (hash(i + 3) - 0.5) * 16, 6.4 + hash(i + 8) * 2.2, (i - 3.5) * 13)
    group.add(c)
    clouds.push(c)
  }

  const gullSpan = 72
  const gulls: Object3D[] = []
  for (let i = 0; i < 6; i++) {
    const bird = gull(materials)
    bird.position.set(-6 + (hash(i + 9) - 0.4) * 8, 2.6 + hash(i + 2) * 1.8, (i - 3) * 12)
    bird.scale.setScalar(0.85 + hash(i + 6) * 0.5)
    group.add(bird)
    gulls.push(bird)
  }

  const farSpan = 140
  const far: Object3D[] = []
  for (let i = 0; i < 4; i++) {
    const mound = new Mesh(new SphereGeometry(4 + hash(i) * 2, 10, 8), materials.dune)
    mound.scale.y = 0.35
    mound.position.set(14 + hash(i + 1) * 4, -0.4, (i - 2) * 34)
    group.add(mound)
    far.push(mound)
  }
  const light = lighthouse(materials)
  light.position.set(11.5, 0, -8)
  group.add(light)
  far.push(light)

  const layers: Layer[] = [
    { objects: roadBits, span: ROAD_SPAN, factor: 1 },
    { objects: gulls, span: gullSpan, factor: 1.15 },
    { objects: clouds, span: cloudSpan, factor: 0.28 },
    { objects: far, span: farSpan, factor: 0.12 },
  ]

  return {
    group,
    scroll(distance: number) {
      for (const layer of layers) {
        const dz = distance * layer.factor
        const limit = layer.span * 0.5
        for (const obj of layer.objects) {
          obj.position.z += dz
          if (obj.position.z > limit) obj.position.z -= layer.span
        }
      }
    },
  }
}
