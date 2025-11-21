import { Index, createEffect, createMemo, onCleanup } from 'solid-js'
import clsx from 'clsx'
// 1. Import Box shape
import { Body, Box, Capsule, World, vec2 } from 'p2-es'
import { createDeviceSize } from '../../lib/createDeviceSize'
import type { Component, JSX } from 'solid-js'

const SCALE = 50 // Increased scale slightly for better stability
const STEP = 1 / 60

export type Pill = {
  text: string
  category: string
  size: 'sm' | 'md' | 'lg'
}

export type Category = {
  name: string
  color: string
}

type PillSandboxProps = {
  pills: Array<Pill>
  categories: Array<Category>
  containerClass?: string
  pillClass?: string
  physicsOptions?: {
    restitution?: number
    friction?: number
    density?: number
    linearDamping?: number
    tiltFactor?: number
    maxVisualRotation?: number
  }
}

type P2Pill = {
  dom: HTMLDivElement
  body: Body
  width: number
  height: number
}

export const PillSandbox: Component<PillSandboxProps> = (props) => {
  let containerRef: HTMLDivElement | undefined
  const pillRefs: Array<HTMLDivElement> = []
  const deviceSize = createDeviceSize()

  const widthDependency = createMemo(() => deviceSize.size())

  const physicsOptions = createMemo(() => ({
    restitution: props.physicsOptions?.restitution ?? 0.7,
    friction: props.physicsOptions?.friction ?? 0.1,
    density: props.physicsOptions?.density ?? 1.5,
    linearDamping: props.physicsOptions?.linearDamping ?? 1.5, // Higher damping stops infinite sliding
    tiltFactor: props.physicsOptions?.tiltFactor ?? 0.1,
    maxVisualRotation:
      props.physicsOptions?.maxVisualRotation ?? (Math.PI / 180) * 15,
  }))

  const categoryColorMap = createMemo(() => {
    const map = new Map<string, string>()
    props.categories.forEach((cat) => map.set(cat.name, cat.color))
    return map
  })

  createEffect(() => {
    widthDependency()

    if (!containerRef) return

    const { clientWidth, clientHeight } = containerRef
    const w = clientWidth / SCALE
    const h = clientHeight / SCALE

    const options = physicsOptions()

    const world = new World({ gravity: [0, 0] })

    // 2. FIXED: Use Box for walls.
    // This ensures walls are flat planes, not bulging capsules.
    const addWall = (x: number, y: number, width: number, height: number) => {
      // Mass 0 = Static body
      const b = new Body({ mass: 0, position: [x, y] })
      b.addShape(new Box({ width, height }))
      world.addBody(b)
    }

    const thickness = 10 // Make walls thick so fast objects don't tunnel through

    // Top (Center X, Y = just above 0)
    addWall(w / 2, -thickness / 2, w + thickness * 2, thickness)
    // Bottom (Center X, Y = just below height)
    addWall(w / 2, h + thickness / 2, w + thickness * 2, thickness)
    // Left (X = just left of 0, Center Y)
    addWall(-thickness / 2, h / 2, thickness, h + thickness * 2)
    // Right (X = just right of width, Center Y)
    addWall(w + thickness / 2, h / 2, thickness, h + thickness * 2)

    // pills
    const pills: Array<P2Pill> = []

    pillRefs.forEach((el) => {
      const width = el.offsetWidth / SCALE
      const height = el.offsetHeight / SCALE
      const radius = height / 2

      // Capsule length is distance between foci (Total Width - 2 * Radius)
      const len = Math.max(width - height, 0)

      const body = new Body({
        mass: options.density,
        position: [
          w / 2 + (Math.random() - 0.5) * w * 0.5,
          h / 2 + (Math.random() - 0.5) * h * 0.5,
        ],
        damping: options.linearDamping,
        angularDamping: 1, // Prevents endless spinning
        fixedRotation: true, // We handle rotation visually
      })

      const capsule = new Capsule({ length: len, radius })

      // Material settings
      capsule.material = new (world.defaultMaterial.constructor as any)()
      // (p2-es material setup can be implicit, but setting direct properties on contact materials is often easier in simple setups,
      // here we rely on the body damping mostly, but can add contact material if needed for bounce)

      // Rotate vertical pills (if height > width)
      if (height > width) {
        capsule.angle = Math.PI / 2
      }

      body.addShape(capsule)

      const angle = Math.random() * 2 * Math.PI
      body.velocity[0] = Math.cos(angle) * 2
      body.velocity[1] = Math.sin(angle) * 2

      world.addBody(body)

      pills.push({ dom: el, body, width, height })
    })

    // dragging
    let dragging = false
    let draggingBody: Body | null = null
    const target = vec2.create()

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = containerRef.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      return [(clientX - rect.left) / SCALE, (clientY - rect.top) / SCALE] as [
        number,
        number,
      ]
    }

    const pointerDown = (e: MouseEvent | TouchEvent) => {
      const pos = getPos(e)

      // Simple Hit Test
      // Check if mouse is inside any pill body
      const hitBodies = world.hitTest(
        pos,
        pills.map((p) => p.body),
        5, // pixel tolerance
      )

      if (hitBodies.length > 0) {
        dragging = true
        draggingBody = hitBodies[0]

        // Stop it immediately so we can control it
        draggingBody.velocity[0] = 0
        draggingBody.velocity[1] = 0
        // Wake it up if it was sleeping
        draggingBody.wakeUp()

        target[0] = pos[0]
        target[1] = pos[1]
        e.preventDefault()
      }
    }

    const pointerMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging || !draggingBody) return
      e.preventDefault() // prevent scroll on mobile
      const [x, y] = getPos(e)
      target[0] = x
      target[1] = y
    }

    const pointerUp = () => {
      dragging = false
      draggingBody = null
    }

    containerRef.addEventListener('mousedown', pointerDown)
    containerRef.addEventListener('mousemove', pointerMove)
    window.addEventListener('mouseup', pointerUp)
    containerRef.addEventListener('touchstart', pointerDown, { passive: false })
    containerRef.addEventListener('touchmove', pointerMove, { passive: false })
    window.addEventListener('touchend', pointerUp)

    // loop
    let frameId: number
    const tiltFactor = options.tiltFactor
    const maxRot = options.maxVisualRotation

    const loop = () => {
      // Apply spring force for dragging
      if (dragging && draggingBody) {
        const b = draggingBody
        const dx = target[0] - b.position[0]
        const dy = target[1] - b.position[1]

        const springStrength = 15 // Tight spring
        b.velocity[0] = dx * springStrength
        b.velocity[1] = dy * springStrength
      }

      // Step Physics
      world.step(STEP)

      // Sync DOM
      for (const pill of pills) {
        const b = pill.body

        // Convert Physics Coordinates -> Pixels
        const px = b.position[0] * SCALE - (pill.width * SCALE) / 2
        const py = b.position[1] * SCALE - (pill.height * SCALE) / 2

        // Visual Tilt based on velocity
        const targetRot = Math.max(
          Math.min(b.velocity[0] * tiltFactor, maxRot),
          -maxRot,
        )

        pill.dom.style.transform = `translate(${px}px, ${py}px) rotate(${targetRot}rad)`
      }

      frameId = requestAnimationFrame(loop)
    }

    loop()

    onCleanup(() => {
      cancelAnimationFrame(frameId)
      containerRef.removeEventListener('mousedown', pointerDown)
      containerRef.removeEventListener('mousemove', pointerMove)
      window.removeEventListener('mouseup', pointerUp)
      containerRef.removeEventListener('touchstart', pointerDown)
      containerRef.removeEventListener('touchmove', pointerMove)
      window.removeEventListener('touchend', pointerUp)
    })
  })

  const handleMouseDown: JSX.EventHandler<HTMLDivElement, MouseEvent> = (e) => {
    if ((e.target as HTMLElement).closest('.pill')) e.preventDefault()
  }

  return (
    <div class={clsx('relative', props.containerClass)}>
      {/* Category Legend */}
      <div class="*:p-4 *:bg-gray-600/50 flex flex-wrap items-center justify-center gap-5 w-full">
        <div class="rounded-full text-center">GuideMap</div>
        {props.categories.map((cat) => (
          <div class="rounded-full w-max flex items-center gap-2 capitalize">
            {cat.name.replace(/_/g, ' ')}
            <div
              class="w-5 h-5 rounded-full"
              style={{ background: cat.color }}
            />
          </div>
        ))}
      </div>

      {/* Physics Container */}
      <div
        ref={containerRef}
        class={clsx(
          'physics-container relative w-full h-full overflow-hidden select-none',
          props.containerClass,
        )}
        onMouseDown={handleMouseDown}
      >
        <Index each={props.pills}>
          {(item, idx) => (
            <div
              ref={(el) => (pillRefs[idx] = el)}
              class={clsx(
                'pill absolute will-change-transform',
                'font-medium leading-none rounded-full',
                'border border-white/20 backdrop-blur-md shadow-xl',
                'cursor-grab active:cursor-grabbing',
                {
                  'text-2xl lg:text-3xl px-7 py-4 lg:px-9 lg:py-5':
                    item().size === 'lg',
                  'text-base lg:text-lg px-5 py-3 lg:px-6 lg:py-3':
                    item().size === 'md',
                  'text-xs lg:text-sm px-4 py-2 lg:px-5 lg:py-2':
                    item().size === 'sm',
                },
                props.pillClass,
              )}
              style={{
                background: categoryColorMap().get(item().category),
                color: 'var(--color-secondary-foreground)',
              }}
            >
              {item().text}
            </div>
          )}
        </Index>
      </div>
    </div>
  )
}
