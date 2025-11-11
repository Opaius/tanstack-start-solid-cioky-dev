/**
 * @file pill-sandbox.tsx
 * @description A SolidJS component that renders a physics-based "sandbox" of interactive "pills".
 *
 * This component uses the `planck.js` physics engine to simulate a 2D world where pills (representing skills,
 * topics, etc.) float around and can be dragged by the user. It's designed to be a visually engaging way
 * to display a collection of items. The simulation is responsive and re-initializes on window resize.
 */

import { Index, createEffect, createMemo, onCleanup, onMount } from 'solid-js'
import clsx from 'clsx'
import { Box, Circle, Math, Vec2, World } from 'planck'
import { createDeviceSize } from '../../lib/createDeviceSize'
import type { Body } from 'planck'
import type { Component, JSX } from 'solid-js'

// --- CONSTANTS ---
/**
 * The scale factor to convert between physics world units and pixel units.
 * Planck.js works best with small values, so we scale down our pixel dimensions.
 */
const SCALE_FACTOR = 50
/**
 * The time step for the physics simulation, aiming for 60 updates per second.
 */
const TIME_STEP = 1 / 60

// --- TYPES ---
/**
 * Represents a single pill to be rendered in the sandbox.
 */
export type Pill = {
  text: string
  category: string
  size: 'sm' | 'md' | 'lg'
}

/**
 * Represents a category for pills, defining its name and associated color.
 */
export type Category = {
  name: string
  color: string
}

/**
 * Props for the PillSandbox component.
 */
type PillSandboxProps = {
  pills: Array<Pill>
  categories: Array<Category>
  containerClass?: string
  pillClass?: string
  /** Fine-tune the physics simulation parameters. */
  physicsOptions?: {
    restitution?: number // Bounciness
    friction?: number // Surface friction
    density?: number // Mass
    linearDamping?: number // How much pills slow down over time
    tiltFactor?: number // How much pills tilt based on velocity
    maxVisualRotation?: number // Maximum visual tilt in radians
  }
}

/**
 * Internal type to link a DOM element with its corresponding physics body.
 */
type PlanckPill = {
  dom: HTMLDivElement
  body: Body
  rotation: number // Visual rotation, separate from physics rotation
}

/**
 * A SolidJS component that creates an interactive, physics-based sandbox for displaying "pills".
 *
 * @param {PillSandboxProps} props - The component's properties.
 * @returns {JSX.Element} A container with floating, draggable pills.
 */
export const PillSandbox: Component<PillSandboxProps> = (props) => {
  // --- REFS & STATE ---
  let containerRef: HTMLDivElement | undefined
  const pillRefs: Array<HTMLDivElement> = []
  const deviceSize = createDeviceSize()
  /**
   * A memo that serves as a dependency for the main `createEffect`.
   * This ensures the physics simulation re-initializes whenever the debounced window size changes,
   * making the component responsive.
   */
  const widthDependency = createMemo(() => deviceSize.size())

  // --- MEMOS ---
  /**
   * Memoizes the physics options, providing default values for any omitted properties.
   * This prevents the physics world from being re-created if the parent component re-renders
   * without changing these specific props.
   */
  const physicsOptions = createMemo(() => ({
    restitution: props.physicsOptions?.restitution ?? 0.7,
    friction: props.physicsOptions?.friction ?? 0.1,
    density: props.physicsOptions?.density ?? 0.5,
    linearDamping: props.physicsOptions?.linearDamping ?? 0.1,
    tiltFactor: props.physicsOptions?.tiltFactor ?? 0.05,
    maxVisualRotation:
      props.physicsOptions?.maxVisualRotation ?? (Math.PI / 180) * 15,
  }))

  /**
   * Creates a fast lookup map for category colors.
   * This is more efficient than searching the `categories` array every time a pill is rendered.
   */
  const categoryColorMap = createMemo(() => {
    const map = new Map<string, string>()
    props.categories.forEach((cat) => map.set(cat.name, cat.color))
    return map
  })

  // --- PHYSICS SIMULATION EFFECT ---
  /**
   * The main effect that sets up and runs the Planck.js physics simulation.
   * It runs on mount and re-runs whenever the `widthDependency` changes (i.e., on resize).
   */
  createEffect(() => {
    widthDependency() // Depend on the debounced window size.
    let cleanup: (() => void) | undefined

    // The simulation setup is wrapped in `onMount` to ensure DOM elements are available.
    // The effect's re-triggering handles the responsive re-initialization.
    onMount(() => {
      if (!containerRef) return
      const container = containerRef
      const { clientWidth, clientHeight } = container
      const w = clientWidth / SCALE_FACTOR
      const h = clientHeight / SCALE_FACTOR

      // 1. Create the physics world with no gravity.
      const world = new World({ gravity: { x: 0, y: 0 } })
      const options = physicsOptions()

      // 2. Create static walls to contain the pills.
      const wallBody = world.createBody().setStatic()
      const wallFixture = {
        restitution: options.restitution,
        friction: options.friction,
      }
      // Top, Bottom, Left, Right walls
      wallBody.createFixture(
        new Box(w / 2, 0.1, new Vec2(w / 2, 0.05), 0),
        wallFixture,
      )
      wallBody.createFixture(
        new Box(w / 2, 0.1, new Vec2(w / 2, h - 0.05), 0),
        wallFixture,
      )
      wallBody.createFixture(
        new Box(0.1, h / 2, new Vec2(0.05, h / 2), 0),
        wallFixture,
      )
      wallBody.createFixture(
        new Box(0.1, h / 2, new Vec2(w - 0.05, h / 2), 0),
        wallFixture,
      )

      // 3. Create dynamic bodies for each pill.
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
        // Start pills in a random position near the center.
        const startX = w / 2 + (Math.random() - 0.5) * w * 0.5
        const startY = h / 2 + (Math.random() - 0.5) * h * 0.5

        const body = world.createDynamicBody({
          position: { x: startX, y: startY },
        })
        body.setFixedRotation(true) // Physics rotation is disabled; we handle visual rotation manually.
        body.setLinearDamping(options.linearDamping)

        // Create a capsule shape for the pill body for more realistic collisions.
        // This is composed of a central rectangle and two circles at the ends.
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
          // If it's not wider than it is tall, just use a circle.
          body.createFixture(new Circle(radius), fixtureProps)
        }

        // Give each pill an initial random push to scatter them.
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

      // 4. Set up mouse/touch interaction for dragging.
      let mouseBody: Body | null = null
      let isDragging = false
      let targetMousePos = new Vec2(0, 0)
      const springStiffness = 30
      const springDamping = 10

      // Helper to get pointer position in physics world coordinates.
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
        // Find which pill (if any) was clicked on.
        planckPills.forEach(({ body, dom }) => {
          const rect = dom.getBoundingClientRect()
          const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
          const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

          if (
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom
          ) {
            mouseBody = body
            isDragging = true
            targetMousePos = new Vec2(pos.x, pos.y)
            body.setLinearVelocity(new Vec2(0, 0)) // Stop the body to "grab" it.
          }
        })
      }

      const handlePointerMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging || !mouseBody) return
        // Just update the target position; the physics loop will apply the force.
        const pos = getPointerPosition(e)
        targetMousePos = new Vec2(pos.x, pos.y)
      }

      const handlePointerUp = () => {
        isDragging = false
        mouseBody = null
      }

      // Add event listeners for both mouse and touch.
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

      // 5. The main animation loop.
      let frameId: number
      const rotationSmoothing = 0.1
      const maxRotation = options.maxVisualRotation
      const tiltFactor = options.tiltFactor

      const syncLoop = () => {
        world.step(TIME_STEP)

        // If dragging, apply a spring force to move the body towards the mouse.
        // This creates a smooth, "springy" dragging effect.
        if (isDragging && mouseBody) {
          const bodyPos = mouseBody.getPosition()
          const bodyVel = mouseBody.getLinearVelocity()
          const dx = targetMousePos.x - bodyPos.x
          const dy = targetMousePos.y - bodyPos.y
          const forceX = dx * springStiffness - bodyVel.x * springDamping
          const forceY = dy * springStiffness - bodyVel.y * springDamping
          mouseBody.applyForceToCenter(new Vec2(forceX, forceY))
        }

        // Sync DOM elements with their physics bodies.
        planckPills.forEach((pill) => {
          const pos = pill.body.getPosition()
          const vel = pill.body.getLinearVelocity()

          // Convert physics coordinates back to pixel coordinates for CSS transform.
          const translateX = pos.x * SCALE_FACTOR - pill.dom.offsetWidth / 2
          const translateY = pos.y * SCALE_FACTOR - pill.dom.offsetHeight / 2

          // Calculate a pleasing visual rotation based on horizontal velocity.
          const targetRotation = Math.max(
            Math.min(vel.x * tiltFactor, maxRotation),
            -maxRotation,
          )
          // Apply smoothing (lerp) to the rotation for a less jerky effect.
          pill.rotation += (targetRotation - pill.rotation) * rotationSmoothing

          pill.dom.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${pill.rotation}rad)`
        })

        frameId = requestAnimationFrame(syncLoop)
      }
      syncLoop()

      // 6. Define the cleanup function.
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

    // This runs when the effect is re-triggered or the component unmounts.
    onCleanup(() => {
      if (cleanup) cleanup()
    })
  })

  /**
   * Prevents the default browser behavior (like text selection) when a drag
   * gesture starts on a pill.
   */
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
      {/* Category Legend */}
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

      {/* Physics Container */}
      <div
        ref={containerRef}
        class={clsx(
          'physics-container relative w-full h-full overflow-hidden',
          props.containerClass,
        )}
        onMouseDown={handleMouseDown}
        style={{
          // Adjust height on mobile for better viewing.
          height: deviceSize.compare('<', 'md') ? '80vh' : '150vh',
        }}
      >
        <Index each={props.pills}>
          {(item, index) => (
            <div
              ref={(el) => (pillRefs[index] = el)}
              class={clsx(
                'pill absolute will-change-transform', // `will-change` is a performance hint for the browser.
                'font-medium leading-none rounded-full',
                'transition-[background,border-radius,font-family] duration-300 ease-in-out',
                'border border-white/20 backdrop-blur-md shadow-xl',
                'cursor-grab active:cursor-grabbing',
                {
                  // Dynamic classes for different pill sizes.
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
                // Use the memoized map for efficient color lookup.
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
