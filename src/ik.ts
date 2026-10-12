import { Object3D, Vector3 } from 'three'

const dir = new Vector3()
const toPole = new Vector3()
const side = new Vector3()
const yAxis = new Vector3(0, 1, 0)

/**
 * Two-bone IK. Writes the joint (knee / elbow) that keeps both bone lengths
 * and bends toward `pole`.
 */
export function solveTwoBone(
  hip: Vector3,
  target: Vector3,
  pole: Vector3,
  upperLen: number,
  lowerLen: number,
  outJoint: Vector3,
): void {
  dir.subVectors(target, hip)
  const raw = dir.length()
  if (raw < 1e-5) dir.set(0, -1, 0)
  else dir.multiplyScalar(1 / raw)

  const max = upperLen + lowerLen - 1e-4
  const min = Math.abs(upperLen - lowerLen) + 1e-4
  const reach = Math.min(Math.max(raw < 1e-5 ? min : raw, min), max)

  const along = (reach * reach + upperLen * upperLen - lowerLen * lowerLen) / (2 * reach)
  const height = Math.sqrt(Math.max(0, upperLen * upperLen - along * along))

  toPole.subVectors(pole, hip)
  side.copy(toPole).addScaledVector(dir, -toPole.dot(dir))
  if (side.lengthSq() < 1e-8) {
    side.set(1, 0, 0)
    if (Math.abs(dir.dot(side)) > 0.9) side.set(0, 0, 1)
    side.addScaledVector(dir, -dir.dot(side))
  }
  side.normalize()

  outJoint.copy(hip).addScaledVector(dir, along).addScaledVector(side, height)
}

const delta = new Vector3()

/** Points an object's local +Y from `from` toward `to`, stretching to fit. */
export function orientLimb(pivot: Object3D, from: Vector3, to: Vector3, restLength: number): void {
  delta.subVectors(to, from)
  const len = delta.length()
  pivot.position.copy(from)
  if (len < 1e-5) {
    pivot.scale.set(1, 1, 1)
    return
  }
  delta.multiplyScalar(1 / len)
  pivot.quaternion.setFromUnitVectors(yAxis, delta)
  pivot.scale.set(1, len / restLength, 1)
}
