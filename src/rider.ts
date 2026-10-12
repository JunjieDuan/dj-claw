import {
  BufferGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  Matrix4,
  Mesh,
  Object3D,
  Quaternion,
  Shape,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three'
import type { Material } from 'three'
import { solveTwoBone } from './ik.ts'
import type { Materials } from './materials.ts'

const THIGH = 0.28
const SHIN = 0.5
const UPPER_WING = 0.28
const FORE_WING = 0.3

const BODY_Y = 1.09
const BODY_Z = 0.26

export type RiderFrame = {
  time: number
  dt: number
  phase: number
  leftPedal: Vector3
  rightPedal: Vector3
  leftGrip: Vector3
  rightGrip: Vector3
}

const hipL = new Vector3()
const hipR = new Vector3()
const shoulderL = new Vector3()
const shoulderR = new Vector3()
const kneeL = new Vector3()
const kneeR = new Vector3()
const elbowL = new Vector3()
const elbowR = new Vector3()
const poleL = new Vector3()
const poleR = new Vector3()
const targetL = new Vector3()
const targetR = new Vector3()
const boneDir = new Vector3()
const widthAxis = new Vector3()
const thickAxis = new Vector3()
const worldUp = new Vector3(0, 1, 0)
const basis = new Matrix4()

function shaded(geo: BufferGeometry, material: Material): Mesh {
  geo.computeVertexNormals()
  const mesh = new Mesh(geo, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function limbMesh(radiusTop: number, radiusBottom: number, length: number, material: Material): Mesh {
  const geo = new CylinderGeometry(radiusTop, radiusBottom, length, 14)
  geo.translate(0, length / 2, 0)
  const mesh = new Mesh(geo, material)
  mesh.castShadow = true
  return mesh
}

/** Smooth tube with a radius that changes along the curve. Ends are left open so they can bury into the body and head. */
function buildNeck(points: Vector3[], radiusAt: (t: number) => number): BufferGeometry {
  const curve = new CatmullRomCurve3(points, false, 'catmullrom', 0.45)
  const tubular = 64
  const radial = 18
  const centers: Vector3[] = []
  const tangents: Vector3[] = []
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular
    centers.push(curve.getPointAt(t))
    tangents.push(curve.getTangentAt(t).normalize())
  }

  const normals: Vector3[] = []
  let normal = new Vector3().crossVectors(tangents[0], worldUp)
  if (normal.lengthSq() < 1e-8) normal.crossVectors(tangents[0], new Vector3(1, 0, 0))
  normal.normalize()
  const spin = new Quaternion()
  const axis = new Vector3()
  for (let i = 0; i <= tubular; i++) {
    if (i > 0) {
      axis.crossVectors(tangents[i - 1], tangents[i])
      const sin = axis.length()
      const cos = tangents[i - 1].dot(tangents[i])
      if (sin > 1e-6) {
        axis.multiplyScalar(1 / sin)
        spin.setFromAxisAngle(axis, Math.atan2(sin, cos))
        normal.applyQuaternion(spin).normalize()
      }
    }
    normals.push(normal.clone())
  }

  const positions: number[] = []
  const side = new Vector3()
  const lift = new Vector3()
  for (let i = 0; i <= tubular; i++) {
    const radius = radiusAt(i / tubular)
    side.crossVectors(normals[i], tangents[i]).normalize()
    lift.copy(normals[i])
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2
      const c = Math.cos(a) * radius
      const s = Math.sin(a) * radius
      positions.push(
        centers[i].x + side.x * c + lift.x * s,
        centers[i].y + side.y * c + lift.y * s,
        centers[i].z + side.z * c + lift.z * s,
      )
    }
  }

  const indices: number[] = []
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const j2 = (j + 1) % radial
      const a = i * radial + j
      const b = i * radial + j2
      const c = (i + 1) * radial + j
      const d = (i + 1) * radial + j2
      indices.push(a, c, b, b, c, d)
    }
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  return geo
}

type Station = { y: number; z: number; rx: number; ry: number }

/**
 * Loft an ellipse (or a pouch cross-section) through stations.
 * The ring's horizontal axis stays level so a side view shows the real height.
 */
function buildLoft(
  stations: Station[],
  section: (angle: number, rx: number, ry: number) => { x: number; y: number },
  radial = 22,
): BufferGeometry {
  const centers = stations.map((s) => new Vector3(0, s.y, s.z))
  const tangent = new Vector3()
  const side = new Vector3()
  const lift = new Vector3()
  const positions: number[] = []

  for (let i = 0; i < stations.length; i++) {
    const prev = centers[Math.max(0, i - 1)]
    const next = centers[Math.min(centers.length - 1, i + 1)]
    tangent.subVectors(next, prev)
    if (tangent.lengthSq() < 1e-8) tangent.set(0, 0, -1)
    tangent.normalize()
    side.crossVectors(worldUp, tangent)
    if (side.lengthSq() < 1e-8) side.set(1, 0, 0)
    side.normalize()
    lift.crossVectors(tangent, side).normalize()
    const { rx, ry } = stations[i]
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2
      const local = section(a, rx, ry)
      positions.push(
        centers[i].x + side.x * local.x + lift.x * local.y,
        centers[i].y + side.y * local.x + lift.y * local.y,
        centers[i].z + side.z * local.x + lift.z * local.y,
      )
    }
  }

  const indices: number[] = []
  for (let i = 0; i < stations.length - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const j2 = (j + 1) % radial
      const a = i * radial + j
      const b = i * radial + j2
      const c = (i + 1) * radial + j
      const d = (i + 1) * radial + j2
      indices.push(a, c, b, b, c, d)
    }
  }

  const cap = (ring: number, center: Vector3, inward: number) => {
    const centerIndex = positions.length / 3
    positions.push(center.x, center.y, center.z)
    for (let j = 0; j < radial; j++) {
      const j2 = (j + 1) % radial
      const a = ring * radial + j
      const b = ring * radial + j2
      if (inward > 0) indices.push(centerIndex, a, b)
      else indices.push(centerIndex, b, a)
    }
  }
  cap(0, centers[0], -1)
  cap(stations.length - 1, centers[centers.length - 1], 1)

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  return geo
}

function ellipseSection(angle: number, rx: number, ry: number): { x: number; y: number } {
  return { x: Math.cos(angle) * rx, y: Math.sin(angle) * ry }
}

/** Sack cross-section: shallow where it welds to the bill, round underneath. */
function pouchSection(angle: number, rx: number, ry: number): { x: number; y: number } {
  const across = Math.cos(angle)
  const vertical = Math.sin(angle)
  return {
    x: across * rx * (vertical > 0 ? 0.72 : 1),
    y: vertical > 0 ? vertical * ry * 0.2 : vertical * ry,
  }
}

/**
 * Feather silhouette in local XY: +Y runs along the bone, +X is the breadth
 * (aimed at the sky). Scallops along the top edge read as separate feathers.
 */
function featherShape(length: number, reach: number, from = 0): Shape {
  const shape = new Shape()
  const y0 = length * from
  shape.moveTo(0.0, y0)
  shape.lineTo(0.018, length * (from + (1 - from) * 0.35))
  shape.lineTo(0.03, length * 0.72)
  shape.lineTo(0.055, length)
  shape.lineTo(reach * 0.92, length * 0.8)
  shape.lineTo(reach * 0.42, length * 0.7)
  shape.lineTo(reach, length * 0.5)
  shape.lineTo(reach * 0.38, length * 0.36)
  shape.lineTo(reach * 0.78, length * Math.max(from + 0.08, 0.18))
  shape.lineTo(reach * 0.22, y0 + length * 0.04)
  shape.closePath()
  return shape
}

function extrudeFeather(length: number, reach: number, from = 0): BufferGeometry {
  const geo = new ExtrudeGeometry(featherShape(length, reach, from), {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 1,
    curveSegments: 6,
  })
  geo.translate(0, 0, -0.01)
  return geo
}

function makeWeb(material: Material): Mesh {
  const shape = new Shape()
  shape.moveTo(0, -0.02)
  shape.bezierCurveTo(0.055, -0.012, 0.072, 0.02, 0.048, 0.048)
  shape.quadraticCurveTo(0.028, 0.062, 0.012, 0.046)
  shape.quadraticCurveTo(0.006, 0.07, 0, 0.05)
  shape.quadraticCurveTo(-0.006, 0.07, -0.012, 0.046)
  shape.quadraticCurveTo(-0.028, 0.062, -0.048, 0.048)
  shape.bezierCurveTo(-0.072, 0.02, -0.055, -0.012, 0, -0.02)
  const geo = new ExtrudeGeometry(shape, {
    depth: 0.016,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 10,
  })
  geo.translate(0, 0, -0.008)
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, -0.012, -0.012)
  return shaded(geo, material)
}

function makeEye(materials: Materials, x: number): { group: Group; pupil: Mesh } {
  const group = new Group()
  group.position.set(x, 0.035, -0.09)
  const white = new Mesh(new SphereGeometry(0.022, 14, 12), materials.eyeWhite)
  white.scale.set(1, 1, 0.72)
  const pupil = new Mesh(new SphereGeometry(0.012, 12, 10), materials.pupil)
  pupil.position.set(0, 0, -0.012)
  const hi = new Mesh(new SphereGeometry(0.0045, 8, 6), materials.highlight)
  hi.position.set(-0.005, 0.006, -0.018)
  group.add(white, pupil, hi)
  return { group, pupil }
}

function orientLimb(pivot: Object3D, from: Vector3, to: Vector3, restLength: number): void {
  boneDir.subVectors(to, from)
  const len = boneDir.length()
  pivot.position.copy(from)
  if (len < 1e-5) {
    pivot.scale.set(1, 1, 1)
    return
  }
  boneDir.multiplyScalar(1 / len)
  pivot.quaternion.setFromUnitVectors(worldUp, boneDir)
  pivot.scale.set(1, len / restLength, 1)
}

/** Flat feathers stay upright: local +X (the feather's breadth) aims at the sky. */
function orientWing(pivot: Object3D, from: Vector3, to: Vector3, restLength: number): void {
  boneDir.subVectors(to, from)
  const len = boneDir.length()
  pivot.position.copy(from)
  if (len < 1e-5) {
    pivot.scale.set(1, 1, 1)
    return
  }
  boneDir.multiplyScalar(1 / len)
  widthAxis.copy(worldUp).addScaledVector(boneDir, -worldUp.dot(boneDir))
  if (widthAxis.lengthSq() < 1e-6) widthAxis.set(1, 0, 0)
  widthAxis.normalize()
  thickAxis.crossVectors(widthAxis, boneDir).normalize()
  basis.makeBasis(widthAxis, boneDir, thickAxis)
  pivot.quaternion.setFromRotationMatrix(basis)
  pivot.scale.set(1, len / restLength, 1)
}

export class Rider {
  readonly group = new Group()

  private readonly body = new Group()
  private readonly neck = new Group()
  private readonly head = new Group()
  private readonly pouch: Mesh
  private readonly eyeL: Group
  private readonly eyeR: Group
  private readonly pupilL: Mesh
  private readonly pupilR: Mesh

  private readonly hipMarkL = new Object3D()
  private readonly hipMarkR = new Object3D()
  private readonly shoulderMarkL = new Object3D()
  private readonly shoulderMarkR = new Object3D()

  private readonly thighL = new Group()
  private readonly thighR = new Group()
  private readonly shinL = new Group()
  private readonly shinR = new Group()
  private readonly wingL = new Group()
  private readonly wingR = new Group()
  private readonly wingTipL = new Group()
  private readonly wingTipR = new Group()
  private readonly footL = new Group()
  private readonly footR = new Group()
  private readonly kneeCapL: Mesh
  private readonly kneeCapR: Mesh

  private nextBlink = 2.2
  private blinkClock = -1

  constructor(materials: Materials) {
    this.body.position.set(0, BODY_Y, BODY_Z)
    this.group.add(this.body)

    const profile = [
      new Vector2(0.001, -0.2),
      new Vector2(0.055, -0.16),
      new Vector2(0.11, -0.08),
      new Vector2(0.15, 0.0),
      new Vector2(0.148, 0.07),
      new Vector2(0.1, 0.13),
      new Vector2(0.055, 0.17),
    ]
    const belly = shaded(new LatheGeometry(profile, 36), materials.feather)
    belly.scale.set(1.02, 1, 1.06)
    this.body.add(belly)

    const breast = new Mesh(new SphereGeometry(0.09, 22, 16), materials.feather)
    breast.scale.set(0.95, 0.82, 0.85)
    breast.position.set(0, 0.04, -0.1)
    breast.castShadow = true
    this.body.add(breast)

    this.addTail(materials)

    this.neck.position.set(0, 0.1, -0.03)
    this.body.add(this.neck)
    const neckCurve = [
      new Vector3(0, 0.0, 0.0),
      new Vector3(0, 0.06, 0.055),
      new Vector3(0, 0.14, 0.07),
      new Vector3(0, 0.22, 0.01),
      new Vector3(0, 0.3, -0.08),
      new Vector3(0, 0.36, -0.16),
    ]
    const neckMesh = shaded(
      buildNeck(neckCurve, (t) => {
        if (t < 0.25) return 0.072 - t * 0.06
        if (t < 0.7) return 0.05
        return 0.05 + (t - 0.7) * 0.02
      }),
      materials.feather,
    )
    this.neck.add(neckMesh)

    const headAnchor = neckCurve[neckCurve.length - 1]
    this.head.position.copy(headAnchor)
    this.neck.add(this.head)

    const skull = new Mesh(new SphereGeometry(0.1, 28, 22), materials.feather)
    skull.scale.set(0.94, 0.9, 1.05)
    skull.position.set(0, 0.02, -0.035)
    skull.castShadow = true
    this.head.add(skull)

    for (let i = 0; i < 3; i++) {
      const crest = new Mesh(new ConeGeometry(0.012, 0.055, 7), materials.featherShade)
      crest.position.set((i - 1) * 0.016, 0.1, 0.01 + i * 0.008)
      crest.rotation.x = -0.7
      crest.rotation.z = (i - 1) * 0.25
      crest.castShadow = true
      this.head.add(crest)
    }

    const billRoot = new Mesh(new SphereGeometry(0.055, 18, 14), materials.beak)
    billRoot.scale.set(1.25, 0.72, 1.15)
    billRoot.position.set(0, 0.0, -0.1)
    billRoot.castShadow = true
    this.head.add(billRoot)

    const upperBill = shaded(
      buildLoft(
        [
          { y: 0.02, z: -0.05, rx: 0.072, ry: 0.034 },
          { y: 0.026, z: -0.14, rx: 0.064, ry: 0.026 },
          { y: 0.02, z: -0.26, rx: 0.05, ry: 0.018 },
          { y: 0.01, z: -0.38, rx: 0.032, ry: 0.012 },
          { y: -0.006, z: -0.48, rx: 0.016, ry: 0.007 },
          { y: -0.03, z: -0.54, rx: 0.005, ry: 0.0035 },
        ],
        ellipseSection,
      ),
      materials.beak,
    )
    const lowerBill = shaded(
      buildLoft(
        [
          { y: -0.008, z: -0.06, rx: 0.062, ry: 0.02 },
          { y: -0.004, z: -0.18, rx: 0.05, ry: 0.014 },
          { y: -0.008, z: -0.32, rx: 0.036, ry: 0.01 },
          { y: -0.016, z: -0.44, rx: 0.018, ry: 0.006 },
          { y: -0.03, z: -0.54, rx: 0.005, ry: 0.0035 },
        ],
        ellipseSection,
      ),
      materials.beakDeep,
    )
    this.head.add(upperBill, lowerBill)

    const throat = new Mesh(new SphereGeometry(0.05, 16, 12), materials.pouch)
    throat.scale.set(1.15, 0.85, 1.2)
    throat.position.set(0, -0.045, -0.11)
    throat.castShadow = true
    this.head.add(throat)

    this.pouch = shaded(
      buildLoft(
        [
          { y: -0.02, z: -0.08, rx: 0.058, ry: 0.045 },
          { y: -0.028, z: -0.18, rx: 0.064, ry: 0.075 },
          { y: -0.032, z: -0.28, rx: 0.06, ry: 0.09 },
          { y: -0.026, z: -0.38, rx: 0.042, ry: 0.06 },
          { y: -0.018, z: -0.46, rx: 0.02, ry: 0.028 },
        ],
        pouchSection,
      ),
      materials.pouch,
    )
    this.head.add(this.pouch)

    const leftEye = makeEye(materials, -0.055)
    const rightEye = makeEye(materials, 0.055)
    this.eyeL = leftEye.group
    this.eyeR = rightEye.group
    this.pupilL = leftEye.pupil
    this.pupilR = rightEye.pupil
    this.head.add(this.eyeL, this.eyeR)

    this.hipMarkL.position.set(-0.06, -0.14, -0.02)
    this.hipMarkR.position.set(0.06, -0.14, -0.02)
    this.shoulderMarkL.position.set(-0.12, 0.05, -0.04)
    this.shoulderMarkR.position.set(0.12, 0.05, -0.04)
    this.body.add(this.hipMarkL, this.hipMarkR, this.shoulderMarkL, this.shoulderMarkR)

    this.thighL.add(limbMesh(0.05, 0.04, THIGH, materials.feather))
    this.thighR.add(limbMesh(0.05, 0.04, THIGH, materials.feather))
    this.shinL.add(limbMesh(0.034, 0.024, SHIN, materials.leg))
    this.shinR.add(limbMesh(0.034, 0.024, SHIN, materials.leg))

    this.dressWing(this.wingL, materials, false)
    this.dressWing(this.wingR, materials, false)
    this.dressWing(this.wingTipL, materials, true)
    this.dressWing(this.wingTipR, materials, true)

    this.kneeCapL = this.joint(0.042, materials.leg)
    this.kneeCapR = this.joint(0.042, materials.leg)
    this.footL.add(makeWeb(materials.leg))
    this.footR.add(makeWeb(materials.leg))
    const ankleL = this.joint(0.022, materials.leg)
    const ankleR = this.joint(0.022, materials.leg)
    this.footL.add(ankleL)
    this.footR.add(ankleR)

    this.group.add(
      this.thighL,
      this.thighR,
      this.shinL,
      this.shinR,
      this.wingL,
      this.wingR,
      this.wingTipL,
      this.wingTipR,
      this.kneeCapL,
      this.kneeCapR,
      this.footL,
      this.footR,
    )
  }

  private addTail(materials: Materials): void {
    const fans = [
      { x: -0.045, z: 0.1, len: 0.16 },
      { x: 0, z: 0.11, len: 0.2 },
      { x: 0.045, z: 0.1, len: 0.16 },
    ]
    for (const fan of fans) {
      const feather = shaded(
        buildLoft(
          [
            { y: 0.02, z: 0.02, rx: 0.04, ry: 0.016 },
            { y: 0.035, z: fan.len * 0.55, rx: 0.028, ry: 0.01 },
            { y: 0.02, z: fan.len, rx: 0.008, ry: 0.004 },
          ],
          ellipseSection,
          12,
        ),
        materials.featherShade,
      )
      feather.position.set(fan.x, 0.0, fan.z)
      this.body.add(feather)
    }
  }

  private dressWing(wing: Group, materials: Materials, darkTip: boolean): void {
    const length = darkTip ? FORE_WING : UPPER_WING
    const reach = darkTip ? 0.15 : 0.18
    const main = shaded(extrudeFeather(length, reach), materials.wing)
    const under = shaded(extrudeFeather(length, reach * 0.72), materials.featherShade)
    under.position.z = 0.012
    under.position.x = 0.012
    wing.add(main, under)
    if (darkTip) {
      const tip = shaded(extrudeFeather(length, reach * 0.85, 0.58), materials.wingTip)
      tip.position.z = 0.006
      wing.add(tip)
    }
  }

  private joint(radius: number, material: Material): Mesh {
    const mesh = new Mesh(new SphereGeometry(radius, 14, 12), material)
    mesh.castShadow = true
    return mesh
  }

  update(frame: RiderFrame): void {
    const { phase, time } = frame
    const sway = Math.sin(phase) * 0.045
    const bob = Math.abs(Math.sin(phase * 2)) * 0.012

    this.body.position.y = BODY_Y + bob
    this.body.rotation.z = sway * 0.25
    this.body.rotation.x = -0.1
    this.neck.rotation.x = Math.sin(phase * 2) * 0.07 + Math.sin(time * 1.2) * 0.02
    this.neck.rotation.z = -sway * 0.35
    this.head.rotation.y = Math.sin(time * 0.4) * 0.05
    this.head.rotation.x = Math.sin(phase * 2) * 0.035
    const jiggle = 1 + Math.sin(phase * 2) * 0.045 + Math.sin(time * 3.2) * 0.02
    this.pouch.scale.set(1, jiggle, 1)

    this.updateBlink(time, frame.dt)
    const look = Math.sin(time * 0.4) * 0.003
    this.pupilL.position.x = look
    this.pupilR.position.x = look

    this.group.updateMatrixWorld(true)

    this.hipMarkL.getWorldPosition(hipL)
    this.hipMarkR.getWorldPosition(hipR)
    this.shoulderMarkL.getWorldPosition(shoulderL)
    this.shoulderMarkR.getWorldPosition(shoulderR)
    this.group.worldToLocal(hipL)
    this.group.worldToLocal(hipR)
    this.group.worldToLocal(shoulderL)
    this.group.worldToLocal(shoulderR)

    targetL.copy(frame.leftPedal)
    targetR.copy(frame.rightPedal)
    targetL.y += 0.03
    targetR.y += 0.03
    this.group.worldToLocal(targetL)
    this.group.worldToLocal(targetR)

    poleL.set(-0.55, 0.15, -0.55).add(hipL)
    poleR.set(0.55, 0.15, -0.55).add(hipR)
    solveTwoBone(hipL, targetL, poleL, THIGH, SHIN, kneeL)
    solveTwoBone(hipR, targetR, poleR, THIGH, SHIN, kneeR)
    orientLimb(this.thighL, hipL, kneeL, THIGH)
    orientLimb(this.thighR, hipR, kneeR, THIGH)
    orientLimb(this.shinL, kneeL, targetL, SHIN)
    orientLimb(this.shinR, kneeR, targetR, SHIN)
    this.kneeCapL.position.copy(kneeL)
    this.kneeCapR.position.copy(kneeR)
    this.footL.position.copy(targetL)
    this.footR.position.copy(targetR)
    this.footL.rotation.set(0.15, 0.08, 0.15)
    this.footR.rotation.set(0.15, -0.08, -0.15)
    this.footL.scale.setScalar(1.25)
    this.footR.scale.setScalar(1.25)

    const gripL = targetL.copy(frame.leftGrip)
    const gripR = targetR.copy(frame.rightGrip)
    this.group.worldToLocal(gripL)
    this.group.worldToLocal(gripR)

    poleL.set(-0.7, 0.25, -0.05).add(shoulderL)
    poleR.set(0.7, 0.25, -0.05).add(shoulderR)
    solveTwoBone(shoulderL, gripL, poleL, UPPER_WING, FORE_WING, elbowL)
    solveTwoBone(shoulderR, gripR, poleR, UPPER_WING, FORE_WING, elbowR)
    orientWing(this.wingL, shoulderL, elbowL, UPPER_WING)
    orientWing(this.wingR, shoulderR, elbowR, UPPER_WING)
    orientWing(this.wingTipL, elbowL, gripL, FORE_WING)
    orientWing(this.wingTipR, elbowR, gripR, FORE_WING)
  }

  private updateBlink(time: number, dt: number): void {
    if (this.blinkClock < 0 && time >= this.nextBlink) {
      this.blinkClock = 0
      this.nextBlink = time + 2.8 + Math.random() * 2.4
    }
    let closed = 0
    if (this.blinkClock >= 0) {
      this.blinkClock += dt
      const t = this.blinkClock / 0.14
      closed = t < 1 ? Math.sin(t * Math.PI) : 0
      if (t >= 1) this.blinkClock = -1
    }
    const y = Math.max(0.08, 1 - closed * 0.9)
    this.eyeL.scale.set(1, y, 1)
    this.eyeR.scale.set(1, y, 1)
  }
}
