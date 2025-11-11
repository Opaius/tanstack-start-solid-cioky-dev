import { Index, createEffect, createMemo, onCleanup, onMount } from 'solid-js'
import clsx from 'clsx'
import { Box, Circle, MouseJoint, Vec2, World } from 'planck'
import { createDeviceSize } from '../../lib/createDeviceSize'
import type { Body } from 'planck'
import type { Component, JSX } from 'solid-js'

const SCALE_FACTOR = 50

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
}

export const PillSandbox: Component<PillSandboxProps> = (props) => {
  let containerRef: HTMLDivElement | undefined
  const pillRefs: Array<HTMLDivElement> = []
  const deviceSize = createDeviceSize()
  const widthDependency = createMemo(() => deviceSize.size())
  const pillRotations: Map<HTMLDivElement, { current: number }> = new Map()

  // Default physics options
  const defaultPhysicsOptions = {
    restitution: 0.7,
    friction: 0.1,
    density: 0.5,
    linearDamping: 0.1,
    tiltFactor: 0.05,
    maxVisualRotation: (Math.PI / 180) * 15,
  }

  // Merge default options with user-provided options
  const physicsOptions = { ...defaultPhysicsOptions, ...props.physicsOptions }

  createEffect(() => {
    widthDependency()
    let cleanup: (() => void) | undefined

    onMount(() => {
      if (!containerRef) return
      const container = containerRef
      const { clientWidth, clientHeight } = container
      const w = clientWidth / SCALE_FACTOR
      const h = clientHeight / SCALE_FACTOR
      const wallThickness = 100 / SCALE_FACTOR

      // 1. Create World
      const world = new World({ gravity: { x: 0, y: 0 } })
      const groundBody = world.createBody().setStatic()

      // 2. Create Walls
      const wallRestitution = physicsOptions.restitution || 0.5

      // Top wall
      world
        .createBody({ position: { x: w / 2, y: -wallThickness / 2 } })
        .setStatic()
        .createFixture(new Box(w / 2, wallThickness / 2), {
          restitution: wallRestitution,
        })

      // Bottom wall
      world
        .createBody({ position: { x: w / 2, y: h + wallThickness / 2 } })
        .setStatic()
        .createFixture(new Box(w / 2, wallThickness / 2), {
          restitution: wallRestitution,
        })

      // Left wall
      world
        .createBody({ position: { x: -wallThickness / 2, y: h / 2 } })
        .setStatic()
        .createFixture(new Box(wallThickness / 2, h / 2), {
          restitution: wallRestitution,
        })

      // Right wall
      world
        .createBody({ position: { x: w + wallThickness / 2, y: h / 2 } })
        .setStatic()
        .createFixture(new Box(wallThickness / 2, h / 2), {
          restitution: wallRestitution,
        })

      // 3. Create Dynamic Bodies for Pills
      const planckPills: Array<PlanckPill> = []
      pillRotations.clear()

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

        const fixtureProps = {
          restitution: physicsOptions.restitution,
          friction: physicsOptions.friction,
          density: physicsOptions.density,
        }

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

        body.setLinearDamping(physicsOptions.linearDamping || 0.1)

        const forceMagnitude = 3
        const angle = Math.random() * Math.PI * 2
        const impulse = new Vec2(
          Math.cos(angle) * forceMagnitude,
          Math.sin(angle) * forceMagnitude,
        )
        body.applyLinearImpulse(impulse, body.getPosition())

        planckPills.push({ dom: pillEl, body })
        pillRotations.set(pillEl, { current: 0 })
      })

      // 4. Mouse Dragging
      let mouseJoint: MouseJoint | null = null

      const getMousePos = (e: MouseEvent | TouchEvent) => {
        const rect = container.getBoundingClientRect()
        const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX
        const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY
        return new Vec2(
          (clientX - rect.left) / SCALE_FACTOR,
          (clientY - rect.top) / SCALE_FACTOR,
        )
      }

      const mouseUp = () => {
        if (mouseJoint) {
          world.destroyJoint(mouseJoint)
          mouseJoint = null
          document.removeEventListener('mousemove', mouseMove)
          document.removeEventListener('mouseup', mouseUp)
          document.removeEventListener('touchmove', mouseMove)
          document.removeEventListener('touchend', mouseUp)
        }
      }

      const mouseDown = (e: MouseEvent | TouchEvent) => {
        const target = e.target as HTMLElement
        if (!target.closest('.pill')) return
        e.preventDefault()
        const point = getMousePos(e)
        for (const { body } of planckPills) {
          let fixtureAtPoint = false
          let currentFixture = body.getFixtureList()
          while (currentFixture) {
            if (currentFixture.testPoint(point)) {
              fixtureAtPoint = true
              break
            }
            currentFixture = currentFixture.getNext()
          }
          if (fixtureAtPoint) {
            mouseJoint = world.createJoint(
              new MouseJoint({
                bodyA: groundBody,
                bodyB: body,
                target: point,
                maxForce: 1000 * body.getMass(),
              }),
            )
            document.addEventListener('mousemove', mouseMove)
            document.addEventListener('mouseup', mouseUp)
            document.addEventListener('touchmove', mouseMove, {
              passive: false,
            })
            document.addEventListener('touchend', mouseUp)
            return
          }
        }
      }

      const mouseMove = (e: MouseEvent | TouchEvent) => {
        if (mouseJoint) {
          const point = getMousePos(e)
          mouseJoint.setTarget(point)
          e.preventDefault()
        }
      }

      container.addEventListener('mousedown', mouseDown)
      container.addEventListener('touchstart', mouseDown, {
        passive: false,
      })

      // 5. Sync Loop
      let frameId: number
      const TIME_STEP = 1 / 60
      const syncLoop = () => {
        world.step(TIME_STEP)
        planckPills.forEach(({ dom, body }) => {
          const pos = body.getPosition()
          const vel = body.getLinearVelocity()
          const translateX = pos.x * SCALE_FACTOR - dom.offsetWidth / 2
          const translateY = pos.y * SCALE_FACTOR - dom.offsetHeight / 2
          const rotationState = pillRotations.get(dom)
          if (rotationState) {
            const targetRotation = vel.x * (physicsOptions.tiltFactor || 0.05)
            const maxRotation =
              physicsOptions.maxVisualRotation || (Math.PI / 180) * 15
            const clampedTargetRotation = Math.min(
              Math.max(targetRotation, -maxRotation),
              maxRotation,
            )
            const rotationSmoothing = 0.1
            rotationState.current +=
              (clampedTargetRotation - rotationState.current) *
              rotationSmoothing
            dom.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotationState.current}rad)`
            dom.style.willChange = 'transform'
          }
        })
        frameId = requestAnimationFrame(syncLoop)
      }

      syncLoop()

      cleanup = () => {
        cancelAnimationFrame(frameId)
        document.removeEventListener('mousemove', mouseMove)
        document.removeEventListener('mouseup', mouseUp)
        document.removeEventListener('touchmove', mouseMove)
        document.removeEventListener('touchend', mouseUp)
        container.removeEventListener('mousedown', mouseDown)
        container.removeEventListener('touchstart', mouseDown)
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

  // 3. Render JSX
  return (
    <div class={clsx('relative', props.containerClass)}>
      <div class="left-0 top-0 p-6 gap-10">
        <div class="*:p-4 *:bg-gray-600/50 flex flex-wrap items-center justify-center gap-5 w-full">
          <div class="rounded-full text-center">GuideMap</div>
          <Index each={props.categories}>
            {(category) => (
              <div class="rounded-full justify-center w-max capitalize flex items-center gap-2">
                {category().name.replace(/_/g, ' ')}
                <div
                  class="w-5 h-5 rounded-full"
                  style={{ background: category().color }}
                ></div>
              </div>
            )}
          </Index>
        </div>
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
          {(item, index) => (
            <div
              ref={(el) => (pillRefs[index] = el)}
              class={clsx(
                'pill absolute will-change-transform',
                'font-medium leading-none rounded-full',
                'transition-[background,border-radius,font-family] duration-300 ease-in-out',
                'border border-white/20 backdrop-blur-md shadow-xl',
                'cursor-grab',
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
                background: props.categories.find(
                  (cat) => cat.name === item().category,
                )?.color,
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
