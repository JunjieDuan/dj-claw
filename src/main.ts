import './style.css'
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TOUCH,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createBicycle } from './bicycle.ts'
import { GEAR_RATIO, WHEEL_RADIUS } from './constants.ts'
import { createMaterials } from './materials.ts'
import { Rider } from './rider.ts'
import { createWorld } from './world.ts'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('缺少 #app')

const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = PCFSoftShadowMap
renderer.outputColorSpace = SRGBColorSpace
renderer.toneMapping = ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
app.appendChild(renderer.domElement)

const scene = new Scene()
scene.fog = new Fog(0xf4e7cf, 18, 58)

const camera = new PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 200)
camera.position.set(2.35, 1.52, -3.2)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 1.16, 0.02)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.enablePan = false
controls.minDistance = 1.7
controls.maxDistance = 8.5
controls.minPolarAngle = 0.35
controls.maxPolarAngle = Math.PI / 2 - 0.08
controls.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE }
controls.update()

if (new URLSearchParams(location.search).has('debug')) {
  Object.assign(window, { __camera: camera, __controls: controls })
}

const hemi = new HemisphereLight(0xc5e4ff, 0x8fbf72, 0.55)
scene.add(hemi)

const sun = new DirectionalLight(0xfff3e2, 2.05)
sun.position.set(3.4, 7.6, -4.2)
sun.target.position.set(0, 0.7, 0)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 0.5
sun.shadow.camera.far = 24
sun.shadow.camera.left = -7
sun.shadow.camera.right = 7
sun.shadow.camera.top = 7
sun.shadow.camera.bottom = -7
sun.shadow.bias = -0.0003
sun.shadow.normalBias = 0.03
sun.shadow.radius = 2.5
scene.add(sun, sun.target)

const fill = new DirectionalLight(0xd7e7ff, 0.42)
fill.position.set(-4.2, 3.2, 3.5)
scene.add(fill)

const rim = new DirectionalLight(0xffe0c0, 0.32)
rim.position.set(-1.5, 3.4, 5.5)
scene.add(rim)

const sky = new Mesh(
  new SphereGeometry(80, 24, 16),
  new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new Color(0x79c4f6) },
      horizonColor: { value: new Color(0xf4e7cf) },
      bottomColor: { value: new Color(0x8ec4d8) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      varying vec3 vDir;
      void main() {
        float h = normalize(vDir).y;
        vec3 col = mix(horizonColor, topColor, smoothstep(0.0, 0.62, h));
        col = mix(col, bottomColor, smoothstep(0.08, -0.35, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  }),
)
sky.frustumCulled = false
sky.renderOrder = -1
scene.add(sky)

const sunMesh = new Mesh(
  new SphereGeometry(1.6, 20, 16),
  new MeshBasicMaterial({ color: 0xfff6d8, fog: false }),
)
sunMesh.position.set(6.5, 8.2, 4.5)
scene.add(sunMesh)

const glowCanvas = document.createElement('canvas')
glowCanvas.width = 128
glowCanvas.height = 128
const glowCtx = glowCanvas.getContext('2d')
if (glowCtx) {
  const grd = glowCtx.createRadialGradient(64, 64, 6, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255, 246, 214, 0.95)')
  grd.addColorStop(0.35, 'rgba(255, 214, 150, 0.35)')
  grd.addColorStop(1, 'rgba(255, 214, 150, 0)')
  glowCtx.fillStyle = grd
  glowCtx.fillRect(0, 0, 128, 128)
}
const sunGlow = new Sprite(
  new SpriteMaterial({
    map: new CanvasTexture(glowCanvas),
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: AdditiveBlending,
  }),
)
sunGlow.position.copy(sunMesh.position)
sunGlow.scale.set(16, 16, 1)
scene.add(sunGlow)

const materials = createMaterials()
const world = createWorld(materials)
scene.add(world.group)

const ride = new Group()
scene.add(ride)

const bicycle = createBicycle(materials)
const rider = new Rider(materials)
ride.add(bicycle.group, rider.group)

const toggleEl = document.querySelector<HTMLButtonElement>('#toggle')
const speedEl = document.querySelector<HTMLInputElement>('#speed')
const speedOutEl = document.querySelector<HTMLOutputElement>('#speed-out')
if (!toggleEl || !speedEl || !speedOutEl) throw new Error('控制条缺失')
const toggle = toggleEl
const speedInput = speedEl
const speedOut = speedOutEl

let playing = true
let speed = Number(speedInput.value)
let phase = 0.4

const leftPedal = new Vector3()
const rightPedal = new Vector3()
const leftGrip = new Vector3()
const rightGrip = new Vector3()

function paceLabel(value: number, isPlaying: boolean): string {
  const num = `${value.toFixed(1)} m/s`
  if (!isPlaying) return `暂停 · ${num}`
  if (value < 0.15) return `停下 · ${num}`
  if (value < 1.4) return `漫步 · ${num}`
  if (value < 2.6) return `兜风 · ${num}`
  if (value < 4) return `巡游 · ${num}`
  if (value < 5.2) return `轻快 · ${num}`
  return `飞驰 · ${num}`
}

function renderSpeed(): void {
  speedOut.textContent = paceLabel(speed, playing)
}

function setPlaying(next: boolean): void {
  playing = next
  toggle.textContent = playing ? '暂停' : '继续'
  toggle.setAttribute('aria-pressed', playing ? 'false' : 'true')
  renderSpeed()
}

const controlsBar = document.querySelector<HTMLElement>('.controls')
controlsBar?.addEventListener('pointerdown', (event) => {
  event.stopPropagation()
})

toggle.addEventListener('click', () => setPlaying(!playing))
speedInput.addEventListener('input', () => {
  speed = Number(speedInput.value)
  renderSpeed()
})

window.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat) return
  const tag = (event.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'BUTTON') return
  event.preventDefault()
  setPlaying(!playing)
})

function resize(): void {
  const width = window.innerWidth
  const height = Math.max(window.innerHeight, 1)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

window.addEventListener('resize', resize)
window.visualViewport?.addEventListener('resize', resize)

const clock = { last: performance.now() }

function frame(now: number): void {
  const dt = Math.min((now - clock.last) / 1000, 0.05)
  clock.last = now
  const time = now / 1000
  const velocity = playing ? speed : 0
  const wheelDelta = (velocity / WHEEL_RADIUS) * dt
  phase = (phase + wheelDelta / GEAR_RATIO) % (Math.PI * 2)

  bicycle.frontWheel.rotation.x -= wheelDelta
  bicycle.rearWheel.rotation.x -= wheelDelta
  bicycle.crank.rotation.x = phase
  bicycle.leftPedal.rotation.x = -phase
  bicycle.rightPedal.rotation.x = -phase - Math.PI

  ride.rotation.z = Math.sin(phase) * 0.012
  ride.updateMatrixWorld(true)

  bicycle.leftPedal.getWorldPosition(leftPedal)
  bicycle.rightPedal.getWorldPosition(rightPedal)
  bicycle.leftGrip.getWorldPosition(leftGrip)
  bicycle.rightGrip.getWorldPosition(rightGrip)

  rider.update({ time, dt, phase, leftPedal, rightPedal, leftGrip, rightGrip })
  world.scroll(velocity * dt)

  sky.position.copy(camera.position)
  controls.update()
  renderer.render(scene, camera)
}

renderer.setAnimationLoop(frame)

renderSpeed()
