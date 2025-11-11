import { Index, createEffect, createMemo, onCleanup, onMount } from 'solid-js'
import clsx from 'clsx'
import { Box, Circle, Math, Vec2, World } from 'planck'
import { createDeviceSize } from '../../lib/createDeviceSize'
import type { Body } from 'planck'
import type { Component, JSX } from 'solid-js'

const SCALE_FACTOR = 50
const TIME_STEP = 1 / 60

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

type PlanckPill = {
  dom: HTMLDivElement
  body: Body
  rotation: number
}

export const PillSandbox: Component<PillSandboxProps> = (props) => {
  let containerRef: HTMLDivElement | undefined
  const pillRefs: Array<HTMLDivElement> = []
  const deviceSize = createDeviceSize()
  const widthDependency = createMemo(() => deviceSize.size())

  // Memoize physics options
  const physicsOptions = createMemo(() => ({
    restitution: props.physicsOptions?.restitution ?? 0.7,
    friction: props.physicsOptions?.friction ?? 0.1,
    density: props.physicsOptions?.density ?? 0.5,
    linearDamping: props.physicsOptions?.linearDamping ?? 0.1,
    tiltFactor: props.physicsOptions?.tiltFactor ?? 0.05,
    maxVisualRotation:
      props.physicsOptions?.maxVisualRotation ?? (Math.PI / 180) * 15,
  }))

  // Memoize category color lookup
  const categoryColorMap = createMemo(() => {
    const map = new Map<string, string>()
    props.categories.forEach((cat) => map.set(cat.name, cat.color))
    return map
  })

  createEffect(() => {
    widthDependency()
    let cleanup: (() => void) | undefined

    onMount(() => {
      if (!containerRef) return
      const container = containerRef
      const { clientWidth, clientHeight } = container
      const w = clientWidth / SCALE_FACTOR
      const h = clientHeight / SCALE_FACTOR

      // Create World
      const world = new World({ gravity: { x: 0, y: 0 } })
      const options = physicsOptions()

      // Create Walls
      const wallBody = world.createBody().setStatic()
      const wallFixture = {
        restitution: options.restitution,
        friction: options.friction,
      }

      wallBody.createFixture(
        new Box(w / 2, 0.1, new Vec2(w / 2, 0.05), 0),
        wallFixture,
      ) // Top
      wallBody.createFixture(
        new Box(w / 2, 0.1, new Vec2(w / 2, h - 0.05), 0),
        wallFixture,
      ) // Bottom
      wallBody.createFixture(
        new Box(0.1, h / 2, new Vec2(0.05, h / 2), 0),
        wallFixture,
      ) // Left
      wallBody.createFixture(
        new Box(0.1, h / 2, new Vec2(w - 0.05, h / 2), 0),
        wallFixture,
      ) // Right

      // Create Dynamic Bodies for Pills
      const planckPills: Array<PlanckPill> = []
      const fixtureProps = {
        restitution: options.restitution,
        friction: options.friction,
        density: options.density,
      }

      pillRefs.forEach((pillEl) => {
        const { offsetWidth, offsetHeight } = pillEl
        const width = offsetWidth / SCALE_FACTOR
        const height = offsetHeight / SCALE_FACTOR
        const radius = height / 2
        const startX = w / 2 + (Math.random() - 0.5) * w * 0.5
        const startY = h / 2 + (Math.random() - 0.5) * h * 0.5

        const body = world.createDynamicBody({
          position: { x: startX, y: startY },
        })
        body.setFixedRotation(true)
        body.setLinearDamping(options.linearDamping)

        // Capsule shape logic
        if (width > height) {
          const rectWidth = width - height
          body.createFixture(new Box(rectWidth / 2, radius), fixtureProps)
          body.createFixture(
            new Circle(new Vec2(-rectWidth / 2, 0), radius),
            fixtureProps,
          )
          body.createFixture(
            new Circle(new Vec2(rectWidth / 2, 0), radius),
            fixtureProps,
          )
        } else {
          body.createFixture(new Circle(radius), fixtureProps)
        }

        // Apply initial impulse
        const forceMagnitude = 3
        const angle = Math.random() * Math.PI * 2
        body.applyLinearImpulse(
          new Vec2(
            Math.cos(angle) * forceMagnitude,
            Math.sin(angle) * forceMagnitude,
          ),
          body.getPosition(),
        )

        planckPills.push({ dom: pillEl, body, rotation: 0 })
      })

      // Mouse/Touch Interaction with spring-based dragging
      let mouseBody: Body | null = null
      let isDragging = false
      let targetMousePos = new Vec2(0, 0)
      const springStiffness = 30
      const springDamping = 10

      const getPointerPosition = (
        e: MouseEvent | TouchEvent,
      ): { x: number; y: number } => {
        const rect = container.getBoundingClientRect()
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        return {
          x: (clientX - rect.left) / SCALE_FACTOR,
          y: (clientY - rect.top) / SCALE_FACTOR,
        }
      }

      const handlePointerDown = (e: MouseEvent | TouchEvent) => {
        const pos = getPointerPosition(e)

        planckPills.forEach(({ body, dom }) => {
          const rect = dom.getBoundingClientRect()
          const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
          const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

          // Check if pointer is within pill's visual bounds
          if (
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom
          ) {
            mouseBody = body
            isDragging = true
            targetMousePos = new Vec2(pos.x, pos.y)
            body.setLinearVelocity(new Vec2(0, 0))
          }
        })
      }

      const handlePointerMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging || !mouseBody) return

        const pos = getPointerPosition(e)
        targetMousePos = new Vec2(pos.x, pos.y)
      }

      const handlePointerUp = () => {
        isDragging = false
        mouseBody = null
      }

      container.addEventListener('mousedown', handlePointerDown)
      container.addEventListener('mousemove', handlePointerMove)
      container.addEventListener('mouseup', handlePointerUp)
      container.addEventListener('mouseleave', handlePointerUp)
      container.addEventListener('touchstart', handlePointerDown, {
        passive: true,
      })
      container.addEventListener('touchmove', handlePointerMove, {
        passive: true,
      })
      container.addEventListener('touchend', handlePointerUp)

      // Optimized Sync Loop with smooth dragging
      let frameId: number
      const rotationSmoothing = 0.1
      const maxRotation = options.maxVisualRotation
      const tiltFactor = options.tiltFactor

      const syncLoop = () => {
        world.step(TIME_STEP)

        // Apply spring force for dragging
        if (isDragging && mouseBody) {
          const bodyPos = mouseBody.getPosition()
          const bodyVel = mouseBody.getLinearVelocity()

          // Spring force calculation
          const dx = targetMousePos.x - bodyPos.x
          const dy = targetMousePos.y - bodyPos.y

          // Apply smooth spring force with damping
          const forceX = dx * springStiffness - bodyVel.x * springDamping
          const forceY = dy * springStiffness - bodyVel.y * springDamping

          mouseBody.applyForceToCenter(new Vec2(forceX, forceY))
        }

        planckPills.forEach((pill) => {
          const pos = pill.body.getPosition()
          const vel = pill.body.getLinearVelocity()

          // Calculate transform
          const translateX = pos.x * SCALE_FACTOR - pill.dom.offsetWidth / 2
          const translateY = pos.y * SCALE_FACTOR - pill.dom.offsetHeight / 2

          // Update rotation with smoothing
          const targetRotation = Math.max(
            Math.min(vel.x * tiltFactor, maxRotation),
            -maxRotation,
          )
          pill.rotation += (targetRotation - pill.rotation) * rotationSmoothing

          // Apply transform
          pill.dom.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${pill.rotation}rad)`
        })

        frameId = requestAnimationFrame(syncLoop)
      }
      syncLoop()

      cleanup = () => {
        cancelAnimationFrame(frameId)
        container.removeEventListener('mousedown', handlePointerDown)
        container.removeEventListener('mousemove', handlePointerMove)
        container.removeEventListener('mouseup', handlePointerUp)
        container.removeEventListener('mouseleave', handlePointerUp)
        container.removeEventListener('touchstart', handlePointerDown)
        container.removeEventListener('touchmove', handlePointerMove)
        container.removeEventListener('touchend', handlePointerUp)
      }
    })

    onCleanup(() => {
      if (cleanup) cleanup()
    })
  })

  const handleMouseDown: JSX.EventHandler<HTMLDivElement, MouseEvent> = (e) => {
    if ((e.target as HTMLElement).closest('.pill')) {
      e.preventDefault()
    }
  }

  return (
    <div
      class={clsx(
        'relative flex flex-wrap w-full items-center justify-center',
        props.containerClass,
      )}
    >
      {' '}
      <div class="*:p-4 *:bg-gray-600/50 flex items-center justify-center gap-5 w-full">
        <div class="rounded-full text-center p-4 bg-gray-600/50">GuideMap</div>
        {props.categories.map((category) => (
          <div class="rounded-full justify-center w-max capitalize flex items-center gap-2">
            {category.name.replace(/_/g, ' ')}
            <div
              class="w-5 h-5 rounded-full"
              style={{ background: category.color }}
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
        style={{
          height: deviceSize.compare('<', 'md') ? '80vh' : '150vh',
        }}
      >
        <Index each={props.pills}>
          {(item, index) => (
            <div
              ref={(el) => (pillRefs[index] = el)}
              class={clsx(
                'pill absolute will-change-transform',
                'font-medium leading-none rounded-full',
                'transition-[background,border-radius,font-family] duration-300 ease-in-out',
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
