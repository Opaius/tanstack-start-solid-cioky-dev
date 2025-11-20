/**
 * @file PillSandbox.tsx
 * @description A SolidJS component that renders "pills" (tags, skills, etc.)
 * in a 2D physics sandbox using Planck.js. The pills are interactive,
 * can be dragged, and collide with each other and the container walls.
 */
import { Index, createEffect, createMemo, onCleanup, onMount } from 'solid-js'
import clsx from 'clsx'
import { Box, Circle, Math, Vec2, World } from 'planck'
import { createDeviceSize } from '../../lib/createDeviceSize'
import type { Body } from 'planck'
import type { Component, JSX } from 'solid-js'

// --- Constants ---

/**
 * The scale factor to convert between physics world coordinates and pixel coordinates.
 * Planck.js works best with small values, so we scale down our pixel dimensions.
 * @type {number}
 */
const SCALE_FACTOR = 50

/**
 * The time step for the physics simulation, in seconds.
 * A value of 1/60 corresponds to a 60 FPS update rate.
 * @type {number}
 */
const TIME_STEP = 1 / 60

// --- Types ---

/**
 * Represents a single pill to be displayed in the sandbox.
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
    /** The bounciness of objects (0-1). */
    restitution?: number
    /** The friction between objects (0-1). */
    friction?: number
    /** The mass of objects. */
    density?: number
    /** Damps linear velocity over time, simulating air resistance. */
    linearDamping?: number
    /** How much the pill tilts based on its horizontal velocity. */
    tiltFactor?: number
    /** The maximum visual rotation of a pill in radians. */
    maxVisualRotation?: number
  }
}

/**
 * Internal type to link a DOM element to its corresponding Planck.js physics body.
 */
type PlanckPill = {
  dom: HTMLDivElement
  body: Body
  /** The current visual rotation in radians, smoothed for visual appeal. */
  rotation: number
}

type CachedPill = PlanckPill & { width: number; height: number; radius: number }

/**
 * A SolidJS component that creates an interactive 2D physics sandbox for "pills".
 * It uses Planck.js for the physics simulation and synchronizes the state of the
 * physics bodies with the DOM elements.
 *
 * @param {PillSandboxProps} props - The component props.
 * @returns {JSX.Element} The rendered physics sandbox container and pills.
 */
export const PillSandbox: Component<PillSandboxProps> = (props) => {
  // --- Refs and Reactive State ---
  let containerRef: HTMLDivElement | undefined
  const pillRefs: Array<HTMLDivElement> = []
  const deviceSize = createDeviceSize()

  /**
   * A memo that tracks the window width. This is used to trigger a re-run
   * of the physics simulation effect when the window is resized, allowing the
   * sandbox to adapt to new dimensions.
   */
  const widthDependency = createMemo(() => deviceSize.size())

  // --- Memos for Expensive Computations ---

  /**
   * Memoizes the physics options, providing default values for any
   * options that are not provided in the props.
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
   * Memoizes a Map for quick category color lookups.
   * This prevents re-creating the map on every render.
   */
  const categoryColorMap = createMemo(() => {
    const map = new Map<string, string>()
    props.categories.forEach((cat) => map.set(cat.name, cat.color))
    return map
  })

  // --- Core Physics Simulation Effect ---

  /**
   * This effect is the heart of the component. It sets up the Planck.js world,
   * creates physics bodies for each pill, and runs the simulation loop.
   * It re-runs whenever the `widthDependency` changes (i.e., on window resize).
   */
  createEffect(() => {
    // Depend on window width to re-initialize on resize.
    widthDependency()
    let cleanup: (() => void) | undefined

    // The simulation setup runs once the component is mounted.
    onMount(() => {
      if (!containerRef) return
      const container = containerRef
      const { clientWidth, clientHeight } = container
      // Convert container dimensions to physics world scale.
      const w = clientWidth / SCALE_FACTOR
      const h = clientHeight / SCALE_FACTOR

      // 1. --- Create the Physics World ---
      const world = new World({ gravity: { x: 0, y: 0 } }) // No gravity
      const options = physicsOptions()

      // 2. --- Create Static Walls ---
      // Create a single static body to hold all wall fixtures.
      const wallBody = world.createBody().setStatic()
      const wallFixture = {
        restitution: options.restitution,
        friction: options.friction,
      }

      // Add four fixtures (boxes) to the static body to form the walls.
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

      // 3. --- Create Dynamic Bodies for Pills ---
      const planckPills: Array<CachedPill> = []
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
        // Place pills randomly near the center.
        const startX = w / 2 + (Math.random() - 0.5) * w * 0.5
        const startY = h / 2 + (Math.random() - 0.5) * h * 0.5

        const body = world.createDynamicBody({
          position: { x: startX, y: startY },
        })
        // Prevent pills from rotating based on physics collisions, as we control rotation visually.
        body.setFixedRotation(true)
        body.setLinearDamping(options.linearDamping)

        // --- Capsule Shape Logic ---
        // Create a capsule shape for pills wider than they are tall.
        // This is done by combining a central rectangle with a circle at each end.
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
          // For circular pills, a single circle fixture is sufficient.
          body.createFixture(new Circle(radius), fixtureProps)
        }

        // Apply a random initial impulse to scatter the pills.
        const forceMagnitude = 3
        const angle = Math.random() * Math.PI * 2
        body.applyLinearImpulse(
          new Vec2(
            Math.cos(angle) * forceMagnitude,
            Math.sin(angle) * forceMagnitude,
          ),
          body.getPosition(),
        )

        planckPills.push({
          dom: pillEl,
          body,
          rotation: 0,
          width,
          height,
          radius,
        })
      })

      // 4. --- Mouse/Touch Interaction ---
      // This system uses a "spring" force to drag bodies for a smoother feel.
      let mouseBody: Body | null = null
      let isDragging = false
      let targetMousePos = new Vec2(0, 0)
      const springStiffness = 60
      const springDamping = 20

      /** Converts pointer coordinates to physics world coordinates. */
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

        planckPills.forEach((pill) => {
          const dx = pos.x - pill.body.getPosition().x
          const dy = pos.y - pill.body.getPosition().y
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance <= pill.radius) {
            // start dragging
            e.preventDefault() // Prevent scrolling on mobile while dragging.
            mouseBody = pill.body
            isDragging = true
            targetMousePos = new Vec2(pos.x, pos.y)
            pill.body.setLinearVelocity(new Vec2(0, 0))
          }
        })
      }

      const handlePointerMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging || !mouseBody) return

        e.preventDefault() // Prevent scrolling.
        const pos = getPointerPosition(e)
        // Update the target position for the spring force.
        targetMousePos = new Vec2(pos.x, pos.y)
      }

      const handlePointerUp = () => {
        isDragging = false
        mouseBody = null
      }

      // Register all pointer event listeners.
      container.addEventListener('mousedown', handlePointerDown)
      container.addEventListener('mousemove', handlePointerMove)
      container.addEventListener('mouseup', handlePointerUp)
      container.addEventListener('mouseleave', handlePointerUp)
      container.addEventListener('touchstart', handlePointerDown, {
        passive: false,
      })
      container.addEventListener('touchmove', handlePointerMove, {
        passive: false,
      })
      container.addEventListener('touchend', handlePointerUp)

      // 5. --- Sync Loop ---
      // This loop runs on every animation frame to update the physics and sync the DOM.
      let frameId: number
      const rotationSmoothing = 0.1
      const maxRotation = options.maxVisualRotation
      const tiltFactor = options.tiltFactor

      const syncLoop = () => {
        // Advance the physics simulation.
        world.step(TIME_STEP)

        // Apply spring force if a body is being dragged.
        if (isDragging && mouseBody) {
          const bodyPos = mouseBody.getPosition()
          const bodyVel = mouseBody.getLinearVelocity()

          // Calculate the distance between the mouse and the body's center.
          const dx = targetMousePos.x - bodyPos.x
          const dy = targetMousePos.y - bodyPos.y

          // Apply a damped spring force (Hooke's Law) to pull the body towards the mouse.
          const forceX = dx * springStiffness - bodyVel.x * springDamping
          const forceY = dy * springStiffness - bodyVel.y * springDamping

          mouseBody.applyForceToCenter(new Vec2(forceX, forceY))
        }

        // Sync each DOM pill with its physics body.
        planckPills.forEach((pill) => {
          const pos = pill.body.getPosition()
          const vel = pill.body.getLinearVelocity()

          // Calculate the pixel-based transform values.
          const translateX =
            pos.x * SCALE_FACTOR - (pill.width * SCALE_FACTOR) / 2
          const translateY =
            pos.y * SCALE_FACTOR - (pill.height * SCALE_FACTOR) / 2

          // --- Visual Rotation ---
          // Calculate a target rotation based on horizontal velocity for a "tilt" effect.
          const targetRotation = Math.max(
            Math.min(vel.x * tiltFactor, maxRotation),
            -maxRotation,
          )
          // Smoothly interpolate to the target rotation for a less jerky animation.
          pill.rotation += (targetRotation - pill.rotation) * rotationSmoothing

          // Apply the final transform to the DOM element.
          pill.dom.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${pill.rotation}rad)`
        })

        frameId = requestAnimationFrame(syncLoop)
      }
      syncLoop()

      // --- Cleanup ---
      // This function is returned to be called by onCleanup.
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

    // When the effect re-runs (e.g., on resize), clean up the previous simulation.
    onCleanup(() => {
      if (cleanup) cleanup()
    })
  })

  /**
   * Prevents the default browser behavior (like text selection) when a mousedown
   * event originates from a pill, ensuring it doesn't interfere with dragging.
   */
  const handleMouseDown: JSX.EventHandler<HTMLDivElement, MouseEvent> = (e) => {
    if ((e.target as HTMLElement).closest('.pill')) {
      e.preventDefault()
    }
  }

  return (
    <div class={clsx('relative', props.containerClass)}>
      {/* Category Legend */}
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

      {/* Physics Sandbox Container */}
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
                'pill absolute will-change-transform3d',
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
