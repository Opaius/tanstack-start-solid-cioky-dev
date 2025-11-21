/**
 * @file PillSandbox.tsx
 * @description A SolidJS component that renders "pills" in a 2D physics sandbox
 * using Rapier.js.
 * * FIXES:
 * - Uses setLinvel for dragging to prevent force spiraling.
 * - Enables CCD (Continuous Collision Detection) to prevent wall clipping.
 * - Increases wall thickness.
 */
import { Index, createEffect, createMemo, onCleanup } from 'solid-js'
import clsx from 'clsx'
// Ensure you have configured Vite for WASM as discussed previously
import RAPIER, { init } from '@dimforge/rapier2d-compat'
import { createDeviceSize } from '../../lib/createDeviceSize'
import type { Component, JSX } from 'solid-js'

// --- Constants ---

const SCALE_FACTOR = 50

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

type RapierPill = {
  dom: HTMLDivElement
  handle: RAPIER.RigidBodyHandle
  rotation: number
  width: number
  height: number
  radius: number
}

export const PillSandbox: Component<PillSandboxProps> = (props) => {
  let containerRef: HTMLDivElement | undefined
  const pillRefs: Array<HTMLDivElement> = []
  const deviceSize = createDeviceSize()

  const widthDependency = createMemo(() => deviceSize.size())

  const physicsOptions = createMemo(() => ({
    restitution: props.physicsOptions?.restitution ?? 0.7, // Bounciness
    friction: props.physicsOptions?.friction ?? 0.1,
    density: props.physicsOptions?.density ?? 1.5, // Heavier objects are more stable
    linearDamping: props.physicsOptions?.linearDamping ?? 0.5, // Slow down naturally
    tiltFactor: props.physicsOptions?.tiltFactor ?? 0.1,
    maxVisualRotation:
      props.physicsOptions?.maxVisualRotation ?? (Math.PI / 180) * 15,
  }))

  const categoryColorMap = createMemo(() => {
    const map = new Map<string, string>()
    props.categories.forEach((cat) => map.set(cat.name, cat.color))
    return map
  })

  // --- Physics Effect ---

  createEffect(() => {
    widthDependency()
    let cleanup: (() => void) | undefined
    let animationFrameId: number

    const initPhysics = async () => {
      if (!containerRef) return

      await init()

      const container = containerRef
      const { clientWidth, clientHeight } = container
      const w = clientWidth / SCALE_FACTOR
      const h = clientHeight / SCALE_FACTOR

      const gravity = { x: 0.0, y: 0.0 }
      const world = new RAPIER.World(gravity)
      const options = physicsOptions()

      // 1. --- Create Walls (Thicker to prevent tunneling) ---
      const wallThickness = 10.0 // 10 meters thick
      const wallBodyDesc = RAPIER.RigidBodyDesc.fixed()
      const wallBody = world.createRigidBody(wallBodyDesc)

      const addWall = (x: number, y: number, hx: number, hy: number) => {
        world.createCollider(
          RAPIER.ColliderDesc.cuboid(hx, hy).setTranslation(x, y),
          wallBody,
        )
      }

      addWall(w / 2, -wallThickness / 2, w / 2, wallThickness / 2) // Top
      addWall(w / 2, h + wallThickness / 2, w / 2, wallThickness / 2) // Bottom
      addWall(-wallThickness / 2, h / 2, wallThickness / 2, h / 2) // Left
      addWall(w + wallThickness / 2, h / 2, wallThickness / 2, h / 2) // Right

      // 2. --- Create Pills ---
      const rapierPills: Array<RapierPill> = []

      pillRefs.forEach((pillEl) => {
        const { offsetWidth, offsetHeight } = pillEl
        const width = offsetWidth / SCALE_FACTOR
        const height = offsetHeight / SCALE_FACTOR
        const radius = height / 2

        const startX = w / 2 + (Math.random() - 0.5) * w * 0.4
        const startY = h / 2 + (Math.random() - 0.5) * h * 0.4

        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(startX, startY)
          .setLinearDamping(options.linearDamping)
          .setAngularDamping(1.0) // Stop endless spinning
          // FIX: Enable Continuous Collision Detection to stop wall clipping
          .setCcdEnabled(true)
          .lockRotations()

        const body = world.createRigidBody(rigidBodyDesc)

        let colliderDesc: RAPIER.ColliderDesc
        if (width > height) {
          const segmentLength = width - height
          colliderDesc = RAPIER.ColliderDesc.capsule(
            segmentLength / 2,
            radius,
          ).setRotation(Math.PI / 2)
        } else {
          colliderDesc = RAPIER.ColliderDesc.ball(radius)
        }

        colliderDesc
          .setDensity(options.density)
          .setFriction(options.friction)
          .setRestitution(options.restitution)

        world.createCollider(colliderDesc, body)

        // Impulse
        const forceMagnitude = 5.0
        const angle = Math.random() * Math.PI * 2
        body.applyImpulse(
          {
            x: Math.cos(angle) * forceMagnitude,
            y: Math.sin(angle) * forceMagnitude,
          },
          true,
        )

        rapierPills.push({
          dom: pillEl,
          handle: body.handle,
          rotation: 0,
          width,
          height,
          radius,
        })
      })

      // 3. --- Interaction (Velocity Based) ---
      let draggedBodyHandle: RAPIER.RigidBodyHandle | null = null
      let isDragging = false
      let targetMousePos = { x: 0, y: 0 }

      // Controls how "snappy" the drag is. Higher = faster follow.
      const dragSpeed = 10.0

      const getPointerPosition = (e: MouseEvent | TouchEvent) => {
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
        // Find body under cursor
        for (const pill of rapierPills) {
          const body = world.getRigidBody(pill.handle)
          if (!body) continue

          const translation = body.translation()
          const dx = pos.x - translation.x
          const dy = pos.y - translation.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist <= Math.max(pill.width, pill.height) / 2) {
            e.preventDefault()
            draggedBodyHandle = pill.handle
            isDragging = true
            targetMousePos = { x: pos.x, y: pos.y }
            body.wakeUp()
            break
          }
        }
      }

      const handlePointerMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return
        e.preventDefault()
        const pos = getPointerPosition(e)
        targetMousePos = { x: pos.x, y: pos.y }
      }

      const handlePointerUp = () => {
        isDragging = false
        draggedBodyHandle = null
      }

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

      // 4. --- Animation Loop ---
      const maxRotation = options.maxVisualRotation
      const tiltFactor = options.tiltFactor
      const rotationSmoothing = 0.1

      const loop = () => {
        world.step()

        // FIX: Velocity-based Dragging
        // Instead of adding Force, we calculate the velocity needed to reach the mouse
        if (isDragging && draggedBodyHandle !== null) {
          const body = world.getRigidBody(draggedBodyHandle)
          if (body) {
            const pos = body.translation()

            // Calculate vector to mouse
            const dx = targetMousePos.x - pos.x
            const dy = targetMousePos.y - pos.y

            // Set velocity directly (proportional to distance)
            // This prevents "orbiting" or "exploding" because velocity reduces as you get closer
            body.setLinvel(
              {
                x: dx * dragSpeed,
                y: dy * dragSpeed,
              },
              true,
            )
          }
        }

        rapierPills.forEach((pill) => {
          const body = world.getRigidBody(pill.handle)
          if (!body) return
          const pos = body.translation()
          const vel = body.linvel()

          const translateX =
            pos.x * SCALE_FACTOR - (pill.width * SCALE_FACTOR) / 2
          const translateY =
            pos.y * SCALE_FACTOR - (pill.height * SCALE_FACTOR) / 2

          const targetRotation = Math.max(
            Math.min(vel.x * tiltFactor, maxRotation),
            -maxRotation,
          )
          pill.rotation += (targetRotation - pill.rotation) * rotationSmoothing
          pill.dom.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) rotate(${pill.rotation}rad)`
        })

        animationFrameId = requestAnimationFrame(loop)
      }

      loop()

      cleanup = () => {
        cancelAnimationFrame(animationFrameId)
        container.removeEventListener('mousedown', handlePointerDown)
        container.removeEventListener('mousemove', handlePointerMove)
        container.removeEventListener('mouseup', handlePointerUp)
        container.removeEventListener('mouseleave', handlePointerUp)
        container.removeEventListener('touchstart', handlePointerDown)
        container.removeEventListener('touchmove', handlePointerMove)
        container.removeEventListener('touchend', handlePointerUp)
        world.free()
      }
    }

    initPhysics()

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

      <div
        ref={containerRef}
        class={clsx(
          'physics-container relative w-full h-full overflow-hidden select-none',
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
                'cursor-grab active:cursor-grabbing',
                {
                  'text-xl lg:text-2xl px-5 py-2 lg:px-6 lg:py-3':
                    item().size === 'lg',
                  'text-sm lg:text-base px-5 py-2 lg:px-6 lg:py-3':
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
