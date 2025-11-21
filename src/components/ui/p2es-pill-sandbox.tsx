import { Index, createEffect, createMemo, onCleanup, onMount } from 'solid-js'
import clsx from 'clsx'
import { Body, Capsule, RaycastResult, World, vec2 } from 'p2-es'
import { createDeviceSize } from '../../lib/createDeviceSize'
import type { Component, JSX } from 'solid-js'

const SCALE = 15
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
    density: props.physicsOptions?.density ?? 0.5,
    linearDamping: props.physicsOptions?.linearDamping ?? 0.1,
    tiltFactor: props.physicsOptions?.tiltFactor ?? 0.05,
    maxVisualRotation:
      props.physicsOptions?.maxVisualRotation ?? (Math.PI / 180) * 15,
  }))

  const categoryColorMap = createMemo(() => {
    const map = new Map<string, string>()
    props.categories.forEach((cat) => map.set(cat.name, cat.color))
    return map
  })

  createEffect(() => {
    // dependency
    widthDependency()

    if (!containerRef) return

    const { clientWidth, clientHeight } = containerRef
    const w = clientWidth / SCALE
    const h = clientHeight / SCALE

    const options = physicsOptions()

    const world = new World({ gravity: [0, 0] })

    // walls
    const addWall = (x: number, y: number, W: number, H: number) => {
      const b = new Body({ mass: 0, position: [x, y] })
      b.addShape(new Capsule({ length: W, radius: H / 2 })) // wide flat wall
      world.addBody(b)
    }

    addWall(w / 2, -0.05, w, 0.1)
    addWall(w / 2, h + 0.05, w, 0.1)
    addWall(-0.05, h / 2, 0.1, h)
    addWall(w + 0.05, h / 2, 0.1, h)

    // pills
    const pills: Array<P2Pill> = []

    pillRefs.forEach((el) => {
      const width = el.offsetWidth / SCALE
      const height = el.offsetHeight / SCALE
      const radius = height / 2

      const len = Math.max(width - height, 0.0001)

      const body = new Body({
        mass: options.density,
        position: [
          w / 2 + (Math.random() - 0.5) * w * 0.5,
          h / 2 + (Math.random() - 0.5) * h * 0.5,
        ],
        damping: options.linearDamping,
        angularDamping: 1,
        fixedRotation: true,
      })

      const capsule = new Capsule({ length: len, radius })

      // rotate vertical pills
      if (height > width) capsule.angle = Math.PI / 2

      body.addShape(capsule)

      const angle = Math.random() * 2 * Math.PI
      body.velocity[0] = Math.cos(angle) * 3
      body.velocity[1] = Math.sin(angle) * 3

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
      const hitBodies = world.hitTest(
        pos,
        pills.map((p) => p.body),
      )

      if (hitBodies.length > 0) {
        dragging = true
        draggingBody = hitBodies[0]
        draggingBody.velocity[0] = draggingBody.velocity[1] = 0

        target[0] = pos[0]
        target[1] = pos[1]
        e.preventDefault()
      }
    }

    const pointerMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging || !draggingBody) return
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
    containerRef.addEventListener('touchstart', pointerDown, {
      passive: false,
    })
    containerRef.addEventListener('touchmove', pointerMove, {
      passive: false,
    })
    window.addEventListener('touchend', pointerUp)

    // loop
    let frameId: number
    const tiltFactor = options.tiltFactor
    const maxRot = options.maxVisualRotation

    const loop = () => {
      if (dragging && draggingBody) {
        const b = draggingBody
        const dx = target[0] - b.position[0]
        const dy = target[1] - b.position[1]

        // Move towards the target with a proportional velocity (simple spring)
        const springStrength = 10
        b.velocity[0] = dx * springStrength
        b.velocity[1] = dy * springStrength
      }

      world.step(STEP)

      for (const pill of pills) {
        const b = pill.body

        const px = b.position[0] * SCALE - (pill.width * SCALE) / 2
        const py = b.position[1] * SCALE - (pill.height * SCALE) / 2

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

      <div
        ref={containerRef}
        class={clsx(
          'physics-container relative w-full h-full overflow-hidden',
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
