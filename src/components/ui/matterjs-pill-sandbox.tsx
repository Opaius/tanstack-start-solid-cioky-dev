/**
 * @file PillSandbox.tsx
 * @description A SolidJS implementation of the "Who Am I" physics sandbox.
 * Includes robust collision detection to prevent clipping and configurable physics options.
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
  /** Bounciness (0-1). Default 0.7 */
  restitution?: number
  /** Friction (0-1). Default 0.1 */
  friction?: number
  /** Air resistance. Default 0.01 */
  frictionAir?: number
  /** Mouse drag stiffness (0-1). Higher = snappier. Default 0.2 */
  dragStiffness?: number
}

type PillSandboxProps = {
  pills: Array<Pill>
  categories: Array<Category>
  containerClass?: string
  pillClass?: string
  physicsOptions?: PhysicsOptions
}

/**
 * Internal state to track visual rotation for smoothing
 */
type VisualState = {
  currentRotation: number
}

export const PillSandbox: Component<PillSandboxProps> = (props) => {
  // --- Refs ---
  let containerRef: HTMLDivElement | undefined
  // We use a standard array for refs. In Solid <Index>, indices are stable.
  const pillRefs: Array<HTMLDivElement | undefined> = []

  // --- Device Size Hook ---
  const deviceSize = createDeviceSize()
  // We track width to trigger a physics reset on resize so pills don't get lost off-screen
  const widthDependency = createMemo(() => deviceSize.size())

  // --- Options Memo ---
  const options = createMemo(() => ({
    restitution: props.physicsOptions?.restitution ?? 0.7,
    friction: props.physicsOptions?.friction ?? 0.1,
    frictionAir: props.physicsOptions?.frictionAir ?? 0.01,
    dragStiffness: props.physicsOptions?.dragStiffness ?? 0.2,
  }))

  // --- Color Map ---
  const categoryColorMap = createMemo(() => {
    const map = new Map<string, string>()
    props.categories.forEach((cat) => map.set(cat.name, cat.color))
    return map
  })

  // --- Physics Effect ---
  createEffect(() => {
    // Depend on window width to re-initialize on resize (responsive walls)
    widthDependency()

    let cleanup: (() => void) | undefined

    onMount(() => {
      if (!containerRef) return
      const container = containerRef
      const { clientWidth: width, clientHeight: height } = container

      // 1. --- Matter.js Module Destructuring ---
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

      // 2. --- Create Engine ---
      // increased iterations to prevent objects from passing through walls (tunneling)
      const engine = Engine.create({
        positionIterations: 10, // Default is 6
        velocityIterations: 10, // Default is 4
      })
      const world = engine.world

      // Zero gravity for "top-down table" effect
      engine.gravity.x = 0
      engine.gravity.y = 0

      // 3. --- Create Walls ---
      // We make walls extremely thick so high-velocity objects can't clip through
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
        ), // Top
        Bodies.rectangle(
          width / 2,
          height + wallThickness / 2,
          width,
          wallThickness,
          wallOptions,
        ), // Bottom
        Bodies.rectangle(
          -wallThickness / 2,
          height / 2,
          wallThickness,
          height,
          wallOptions,
        ), // Left
        Bodies.rectangle(
          width + wallThickness / 2,
          height / 2,
          wallThickness,
          height,
          wallOptions,
        ), // Right
      ]
      Composite.add(world, walls)

      // 4. --- Create Bodies for Pills ---
      const matterPills: Array<{
        dom: HTMLDivElement
        body: Matter.Body
        visual: VisualState
      }> = []

      pillRefs.forEach((pillEl) => {
        if (!pillEl) return

        const { offsetWidth, offsetHeight } = pillEl
        const radius = offsetHeight / 2 // Perfect pill shape

        // Random start position (padded away from walls)
        const padding = 50
        const startX = padding + Math.random() * (width - padding * 2)
        const startY = padding + Math.random() * (height - padding * 2)

        const body = Bodies.rectangle(
          startX,
          startY,
          offsetWidth,
          offsetHeight,
          {
            chamfer: { radius }, // Rounds the corners physically
            restitution: options().restitution,
            friction: options().friction,
            frictionAir: options().frictionAir,
            inertia: Infinity, // Locks physics rotation (we handle visual rotation manually)
            render: { visible: false },
          },
        )

        // Apply initial random "burst" force
        const force = 0.05 * body.mass // Scale force by mass for consistent feel
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

      // 5. --- Mouse/Touch Interaction ---
      const mouse = Mouse.create(container)

      // Remove default capture events to prevent blocking standard scrolling unless interacting
      // @ts-expect-error Matter.js internal handling
      mouse.element.removeEventListener('wheel', mouse.mousewheel)
      // @ts-expect-error
      mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel)
      // @ts-expect-error
      mouse.element.removeEventListener('touchmove', mouse.mousemove)
      // @ts-expect-error
      mouse.element.removeEventListener('touchstart', mouse.mousedown)
      // @ts-expect-error
      mouse.element.removeEventListener('touchend', mouse.mouseup)

      // Custom event handling to allow scrolling on mobile UNLESS touching a pill
      const handleTouchStart = (e: TouchEvent) => {
        if ((e.target as HTMLElement).closest('.pill')) {
          // @ts-expect-error Accessing internal Matter mouse handler
          mouse.mousedown(e)
        }
      }
      const handleTouchMove = (e: TouchEvent) => {
        if ((e.target as HTMLElement).closest('.pill')) {
          e.preventDefault() // Stop scroll only if dragging pill
          // @ts-expect-error
          mouse.mousemove(e)
        }
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

      // 6. --- Sync Loop ---
      let frameId: number
      const maxVisualRotation = (Math.PI / 180) * 30 // 30 degrees
      const tiltFactor = 0.005 // Sensitivity of tilt to velocity
      const rotationSmoothing = 0.1 // Lerp factor

      const syncLoop = () => {
        matterPills.forEach(({ dom, body, visual }) => {
          const { x, y } = body.position
          const { x: velX } = body.velocity

          // 1. Position
          const translateX = x - dom.offsetWidth / 2
          const translateY = y - dom.offsetHeight / 2

          // 2. Smoothed Tilt Rotation
          const targetRotation = velX * tiltFactor
          const clampedTarget = Common.clamp(
            targetRotation,
            -maxVisualRotation,
            maxVisualRotation,
          )

          // Lerp current to target
          visual.currentRotation +=
            (clampedTarget - visual.currentRotation) * rotationSmoothing

          // Apply using translate3d for GPU acceleration
          dom.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) rotate(${visual.currentRotation}rad)`
        })

        frameId = requestAnimationFrame(syncLoop)
      }

      // 7. --- Start ---
      const runner = Runner.create()
      Runner.run(runner, engine)
      syncLoop()

      // 8. --- Cleanup ---
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

  /**
   * Prevent default text selection when clicking a pill
   */
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
        // Prevent native touch actions (scrolling/zooming) on the container
        style={{ 'touch-action': 'none' }}
        onMouseDown={handleMouseDown}
      >
        <Index each={props.pills}>
          {(item, index) => (
            <div
              // Assign ref to array at index
              ref={(el) => (pillRefs[index] = el)}
              class={clsx(
                'pill absolute will-change-transform',
                'font-medium leading-none rounded-full select-none',
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
                // Hide initially to prevent flash before physics kicks in
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
