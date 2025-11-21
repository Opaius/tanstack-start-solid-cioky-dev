/**
 * @file PillSandbox.tsx
 * @description A SolidJS implementation of the "Who Am I" physics sandbox.
 * FIXED: Allows page scrolling when touching the background, but locks scroll
 * when dragging a pill.
 */
import { Index, createEffect, createMemo, onCleanup, onMount } from 'solid-js'
import clsx from 'clsx'
import Matter from 'matter-js'
import { createDeviceSize } from '../../lib/createDeviceSize'
import type { Component, JSX } from 'solid-js'

// --- Types ---

export type Pill = {
  text: string
  category: string
  size: 'sm' | 'md' | 'lg'
}

export type Category = {
  name: string
  color: string
}

type PhysicsOptions = {
  restitution?: number
  friction?: number
  frictionAir?: number
  dragStiffness?: number
}

type PillSandboxProps = {
  pills: Array<Pill>
  categories: Array<Category>
  containerClass?: string
  pillClass?: string
  physicsOptions?: PhysicsOptions
}

type VisualState = {
  currentRotation: number
}

export const PillSandbox: Component<PillSandboxProps> = (props) => {
  let containerRef: HTMLDivElement | undefined
  const pillRefs: Array<HTMLDivElement | undefined> = []
  const deviceSize = createDeviceSize()
  const widthDependency = createMemo(() => deviceSize.size())

  const options = createMemo(() => ({
    restitution: props.physicsOptions?.restitution ?? 0.7,
    friction: props.physicsOptions?.friction ?? 0.1,
    frictionAir: props.physicsOptions?.frictionAir ?? 0.01,
    dragStiffness: props.physicsOptions?.dragStiffness ?? 0.2,
  }))

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
      const { clientWidth: width, clientHeight: height } = container

      const {
        Engine,
        Runner,
        Composite,
        Bodies,
        Body,
        Mouse,
        MouseConstraint,
        Common,
      } = Matter

      // 1. Setup Engine
      const engine = Engine.create({
        positionIterations: 10,
        velocityIterations: 10,
      })
      const world = engine.world

      engine.gravity.x = 0
      engine.gravity.y = 0

      // 2. Walls
      const wallThickness = 300
      const wallOptions = {
        isStatic: true,
        render: { visible: false },
        restitution: options().restitution,
        friction: options().friction,
      }

      const walls = [
        Bodies.rectangle(
          width / 2,
          -wallThickness / 2,
          width,
          wallThickness,
          wallOptions,
        ),
        Bodies.rectangle(
          width / 2,
          height + wallThickness / 2,
          width,
          wallThickness,
          wallOptions,
        ),
        Bodies.rectangle(
          -wallThickness / 2,
          height / 2,
          wallThickness,
          height,
          wallOptions,
        ),
        Bodies.rectangle(
          width + wallThickness / 2,
          height / 2,
          wallThickness,
          height,
          wallOptions,
        ),
      ]
      Composite.add(world, walls)

      // 3. Pills
      const matterPills: Array<{
        dom: HTMLDivElement
        body: Matter.Body
        visual: VisualState
      }> = []

      pillRefs.forEach((pillEl) => {
        if (!pillEl) return

        const { offsetWidth, offsetHeight } = pillEl
        const radius = offsetHeight / 2
        const padding = 50
        const startX = padding + Math.random() * (width - padding * 2)
        const startY = padding + Math.random() * (height - padding * 2)

        const body = Bodies.rectangle(
          startX,
          startY,
          offsetWidth,
          offsetHeight,
          {
            chamfer: { radius },
            restitution: options().restitution,
            friction: options().friction,
            frictionAir: options().frictionAir,
            inertia: Infinity,
            render: { visible: false },
          },
        )

        const force = 0.05 * body.mass
        const angle = Math.random() * Math.PI * 2
        Body.applyForce(body, body.position, {
          x: Math.cos(angle) * force,
          y: Math.sin(angle) * force,
        })

        matterPills.push({
          dom: pillEl,
          body,
          visual: { currentRotation: 0 },
        })
      })

      Composite.add(
        world,
        matterPills.map((p) => p.body),
      )

      // 4. Interaction
      const mouse = Mouse.create(container)

      // Remove Matter.js default handlers to prevent it from hijacking all inputs
      // @ts-expect-error
      mouse.element.removeEventListener('wheel', mouse.mousewheel)
      // @ts-expect-error
      mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel)
      // @ts-expect-error
      mouse.element.removeEventListener('touchmove', mouse.mousemove)
      // @ts-expect-error
      mouse.element.removeEventListener('touchstart', mouse.mousedown)
      // @ts-expect-error
      mouse.element.removeEventListener('touchend', mouse.mouseup)

      // --- FIXED TOUCH HANDLERS ---
      const handleTouchStart = (e: TouchEvent) => {
        // Only activate physics drag if touching a pill
        if ((e.target as HTMLElement).closest('.pill')) {
          // @ts-expect-error
          mouse.mousedown(e)
        }
      }

      const handleTouchMove = (e: TouchEvent) => {
        // Check if the touch originated on a pill
        if ((e.target as HTMLElement).closest('.pill')) {
          // CRITICAL: Prevent scrolling ONLY if dragging a pill
          e.preventDefault()
          // @ts-expect-error
          mouse.mousemove(e)
        }
        // If touching background, we do NOT preventDefault, allowing scroll.
      }

      const handleTouchEnd = (e: TouchEvent) => {
        // @ts-expect-error
        mouse.mouseup(e)
      }

      mouse.element.addEventListener('touchstart', handleTouchStart, {
        passive: false,
      })
      mouse.element.addEventListener('touchmove', handleTouchMove, {
        passive: false,
      })
      mouse.element.addEventListener('touchend', handleTouchEnd, {
        passive: true,
      })

      const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
          stiffness: options().dragStiffness,
          render: { visible: false },
        },
      })
      Composite.add(world, mouseConstraint)

      // 5. Loop
      let frameId: number
      const maxVisualRotation = (Math.PI / 180) * 30
      const tiltFactor = 0.005
      const rotationSmoothing = 0.1

      const syncLoop = () => {
        matterPills.forEach(({ dom, body, visual }) => {
          const { x, y } = body.position
          const { x: velX } = body.velocity
          const translateX = x - dom.offsetWidth / 2
          const translateY = y - dom.offsetHeight / 2
          const targetRotation = velX * tiltFactor
          const clampedTarget = Common.clamp(
            targetRotation,
            -maxVisualRotation,
            maxVisualRotation,
          )
          visual.currentRotation +=
            (clampedTarget - visual.currentRotation) * rotationSmoothing
          dom.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) rotate(${visual.currentRotation}rad)`
        })
        frameId = requestAnimationFrame(syncLoop)
      }

      const runner = Runner.create()
      Runner.run(runner, engine)
      syncLoop()

      cleanup = () => {
        cancelAnimationFrame(frameId)
        Runner.stop(runner)
        Engine.clear(engine)
        Composite.clear(world, false, true)
        mouse.element.removeEventListener('touchstart', handleTouchStart)
        mouse.element.removeEventListener('touchmove', handleTouchMove)
        mouse.element.removeEventListener('touchend', handleTouchEnd)
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
    <div class={clsx('relative', props.containerClass)}>
      {/* Legend */}
      <div class="*:p-4 *:bg-gray-600/50 flex flex-wrap items-center justify-center gap-5 w-full">
        <div class="rounded-full text-center">GuideMap</div>
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

      {/* Physics Container */}
      <div
        ref={containerRef}
        class={clsx(
          'physics-container relative w-full overflow-hidden',
          props.containerClass,
        )}
        // REMOVED: 'touch-action': 'none' from here to allow background scrolling
        onMouseDown={handleMouseDown}
      >
        <Index each={props.pills}>
          {(item, index) => (
            <div
              ref={(el) => (pillRefs[index] = el)}
              class={clsx(
                'pill absolute will-change-transform',
                'font-medium leading-none rounded-full select-none',
                'transition-[background,border-radius,font-family] duration-300 ease-in-out',
                'border border-white/20 backdrop-blur-md shadow-xl',
                'cursor-grab active:cursor-grabbing',
                // ADDED: touch-none here prevents the browser from scrolling ONLY when dragging this pill
                'touch-none',
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
                top: 0,
                left: 0,
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
