import { DoubleSide, MeshStandardMaterial } from 'three'

function mat(color: number, roughness = 0.62, metalness = 0): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness, metalness })
}

function bird(color: number, roughness = 0.52): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness, metalness: 0.02 })
}

export function createMaterials() {
  return {
    feather: bird(0xfff6ee, 0.58),
    featherShade: bird(0xe4ddd2, 0.62),
    wing: new MeshStandardMaterial({
      color: 0xf4f1ea,
      roughness: 0.6,
      metalness: 0.02,
      side: DoubleSide,
    }),
    wingTip: bird(0x242a31, 0.55),
    beak: bird(0xf6b12e, 0.38),
    beakDeep: bird(0xd9841c, 0.42),
    pouch: bird(0xf6c48a, 0.48),
    leg: bird(0xf07428, 0.46),
    eyeWhite: mat(0xf7f4ee, 0.4),
    pupil: mat(0x1c140e, 0.35),
    highlight: new MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      emissive: 0xfff6ea,
      emissiveIntensity: 0.25,
    }),
    frame: mat(0x3c8ad9, 0.38),
    gold: mat(0xf2c14e, 0.42),
    tire: mat(0x2a2a2e, 0.92),
    wall: mat(0xf3f0ea, 0.7),
    rim: mat(0xd5dee6, 0.35),
    spoke: mat(0xc5ced6, 0.4),
    saddle: mat(0x8d5a3c, 0.62),
    grip: mat(0xf2c14e, 0.55),
    pedal: mat(0x3e434c, 0.48),
    basket: mat(0xf6e6cc, 0.7),
    cherry: mat(0xff5d6c, 0.42),
    leaf: mat(0x3e9a55, 0.75),
    trunk: mat(0x8a5a3a, 0.8),
    road: mat(0x5c6572, 0.9),
    dash: mat(0xf7f3ea, 0.7),
    sand: mat(0xf0d7a4, 0.92),
    sandDeep: mat(0xe4c48a, 0.94),
    sea: mat(0x3e9ec4, 0.45),
    seaDeep: mat(0x2b7eab, 0.4),
    foam: mat(0xf7fbff, 0.7),
    wood: mat(0xc4925a, 0.78),
    woodDark: mat(0x8a5a34, 0.8),
    cloud: mat(0xfffcf8, 0.95),
    dune: mat(0xe7c98a, 0.95),
    flowerPink: mat(0xff8fab, 0.55),
  }
}

export type Materials = ReturnType<typeof createMaterials>
