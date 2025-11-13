import {
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
} from 'solid-js'

// --- TYPES ---

interface Icon {
  x: number
  y: number
  z: number
  scale: number
  opacity: number
  id: number
}

interface IconCloudProps {
  /**
   * Array of raw SVG strings.
   * E.g. ['<svg ...>...</svg>', '<svg ...>...</svg>']
   */
  icons?: Array<string>
  /**
   * Array of image URLs.
   * E.g. ['/img1.png', '/img2.png']
   */
  images?: Array<string>
  onIconChange?: (icon: string) => void
  width?: number
  height?: number
  focusedIcon?: string | null
  /**
   * Rendering quality. Higher is sharper but more demanding.
   * @default 2
   */
  quality?: number
}

/**
 * Easing function for smooth animations.
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * A SolidJS component to render an interactive 3D icon cloud.
 */
export function IconCloud(props: IconCloudProps) {
  // --- PROPS & DEFAULTS ---

  const mergedProps = mergeProps({ width: 400, height: 400, quality: 2 }, props)

  // --- REFS & STATE ---

  let canvasRef: HTMLCanvasElement | undefined
  const [iconPositions, setIconPositions] = createSignal<Array<Icon>>([])
  let isDragging = false
  const [lastMousePos, setLastMousePos] = createSignal({ x: 0, y: 0 })
  let mousePos = { x: 0, y: 0 }
  const [targetRotation, setTargetRotation] = createSignal<{
    x: number
    y: number
    startX: number
    startY: number
    distance: number
    startTime: number
    duration: number
  } | null>(null)

  let animationFrame = 0
  let rotation = { x: 0, y: 0 }
  let iconCanvases: Array<HTMLCanvasElement> = []
  let imagesLoaded: Array<boolean> = []

  // --- MEMOS (Derived State) ---

  /**
   * Calculate scale factor based on 400x400 reference
   */
  const scaleFactor = createMemo(() => {
    const baseSize = 400
    const avgSize = (mergedProps.width + mergedProps.height) / 2
    return avgSize / baseSize
  })

  /**
   * Memoize the list of items (icons or images).
   */
  const items = createMemo(() => props.icons || props.images || [])

  /**
   * Memoize dynamic sizes based on scale factor.
   */
  const derivedValues = createMemo(() => {
    // Base values for 400x400 canvas
    const baseSphereRadius = 120
    const baseIconSize = 50
    const baseDepthScale = 1.0

    const sf = scaleFactor() // Access memoized value

    // Scale everything proportionally
    const sphereRadius = baseSphereRadius * sf
    const iconSize = baseIconSize * sf
    const hitRadius = iconSize * 0.6
    const depthScale = baseDepthScale * sf

    return { sphereRadius, iconSize, hitRadius, depthScale }
  })

  // --- EFFECTS (Lifecycle & Reactions) ---

  /**
   * EFFECT 1: Create icon canvases
   * Re-runs when icons, images, icon size, or quality changes.
   */
  createEffect(() => {
    const currentItems = items()
    const { iconSize: currentIconSize } = derivedValues()
    const currentQuality = mergedProps.quality

    if (!currentItems.length) return

    imagesLoaded = new Array(currentItems.length).fill(false)

    const newIconCanvases = currentItems.map((item, index) => {
      const offscreen = document.createElement('canvas')
      offscreen.width = currentIconSize * currentQuality
      offscreen.height = currentIconSize * currentQuality
      const offCtx = offscreen.getContext('2d')

      if (offCtx) {
        offCtx.scale(currentQuality, currentQuality)

        if (props.images) {
          // Handle image URLs
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = item
          img.onload = () => {
            offCtx.clearRect(0, 0, offscreen.width, offscreen.height)
            // Create circular clipping path
            offCtx.beginPath()
            offCtx.arc(
              currentIconSize / 2,
              currentIconSize / 2,
              currentIconSize / 2,
              0,
              Math.PI * 2,
            )
            offCtx.closePath()
            offCtx.clip()
            // Draw the image
            offCtx.drawImage(img, 0, 0, currentIconSize, currentIconSize)
            imagesLoaded[index] = true
          }
        } else if (props.icons) {
          // Handle SVG strings
          const svgString = item
          const img = new Image()
          // Scale down the SVG to fit, matching original logic
          offCtx.scale(0.4 * scaleFactor(), 0.4 * scaleFactor())
          img.src = 'data:image/svg+xml;base64,' + btoa(svgString)
          img.onload = () => {
            offCtx.clearRect(0, 0, offscreen.width, offscreen.height)
            offCtx.drawImage(img, 0, 0)
            imagesLoaded[index] = true
          }
        }
      }
      return offscreen
    })

    iconCanvases = newIconCanvases
  })

  /**
   * EFFECT 2: Generate initial icon positions on a sphere
   * Re-runs when items or sphere radius changes.
   */
  createEffect(() => {
    const currentItems = items()
    const currentNumIcons = currentItems.length || 20
    const { sphereRadius: currentSphereRadius } = derivedValues()

    const newIcons: Array<Icon> = []
    // Fibonacci sphere parameters
    const offset = 2 / currentNumIcons
    const increment = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < currentNumIcons; i++) {
      const y = i * offset - 1 + offset / 2
      const r = Math.sqrt(1 - y * y)
      const phi = i * increment

      const x = Math.cos(phi) * r
      const z = Math.sin(phi) * r

      newIcons.push({
        x: x * currentSphereRadius,
        y: y * currentSphereRadius,
        z: z * currentSphereRadius,
        scale: 1,
        opacity: 1,
        id: i,
      })
    }
    setIconPositions(newIcons)
  })

  /**
   * EFFECT 3: Main animation and rendering loop
   * Re-runs when icon positions or target rotation changes.
   */
  createEffect(() => {
    if (!canvasRef) return
    const canvas = canvasRef
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Track dependencies
    const positions = iconPositions()
    const rotationTarget = targetRotation()
    const { iconSize: currentIconSize, depthScale: currentDepthScale } =
      derivedValues()

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY)
      const dx = mousePos.x - centerX
      const dy = mousePos.y - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const speed = 0.003 + (distance / maxDistance) * 0.01

      // Animate to target rotation (e.g., on click)
      if (rotationTarget) {
        const elapsed = performance.now() - rotationTarget.startTime
        const progress = Math.min(1, elapsed / rotationTarget.duration)
        const easedProgress = easeOutCubic(progress)

        rotation = {
          x:
            rotationTarget.startX +
            (rotationTarget.x - rotationTarget.startX) * easedProgress,
          y:
            rotationTarget.startY +
            (rotationTarget.y - rotationTarget.startY) * easedProgress,
        }

        if (progress >= 1) {
          setTargetRotation(null)
        }
      } else if (!isDragging) {
        // Apply passive rotation based on mouse position
        rotation = {
          x: rotation.x + (dy / canvas.height) * speed,
          y: rotation.y + (dx / canvas.width) * speed,
        }
      }

      // Draw each icon
      positions.forEach((icon, index) => {
        const cosX = Math.cos(rotation.x)
        const sinX = Math.sin(rotation.x)
        const cosY = Math.cos(rotation.y)
        const sinY = Math.sin(rotation.y)

        // 3D rotation logic
        const rotatedX = icon.x * cosY - icon.z * sinY
        const rotatedZ = icon.x * sinY + icon.z * cosY
        const rotatedY = icon.y * cosX + rotatedZ * sinX

        // Scaling and opacity based on depth (rotatedZ)
        const scale =
          0.7 + (rotatedZ + 120 * currentDepthScale) / (400 * currentDepthScale)
        const opacity = Math.max(
          0.4,
          Math.min(
            1,
            (rotatedZ + 100 * currentDepthScale) / (180 * currentDepthScale),
          ),
        )

        ctx.save()
        ctx.translate(canvas.width / 2 + rotatedX, canvas.height / 2 + rotatedY)
        ctx.scale(scale, scale)
        ctx.globalAlpha = opacity

        if (props.icons || props.images) {
          // Draw the pre-rendered icon/image
          if (iconCanvases[index] && imagesLoaded[index]) {
            ctx.drawImage(
              iconCanvases[index],
              -currentIconSize / 2,
              -currentIconSize / 2,
              currentIconSize,
              currentIconSize,
            )
          }
        } else {
          // Fallback: Show numbered circles if no icons/images are provided
          ctx.beginPath()
          ctx.arc(0, 0, currentIconSize / 2, 0, Math.PI * 2)
          ctx.fillStyle = '#4444ff'
          ctx.fill()
          ctx.fillStyle = 'white'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.font = `${Math.max(12, currentIconSize / 3)}px Arial`
          ctx.fillText(`${icon.id + 1}`, 0, 0)
        }

        ctx.restore()
      })

      animationFrame = requestAnimationFrame(animate)
    }

    // Start the animation loop
    animate()

    // Cleanup: cancel the animation frame when effect re-runs or unmounts
    onCleanup(() => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    })
  })

  /**
   * EFFECT 4: Handle focusing/un-focusing on an icon
   * Re-runs when focusedIcon or iconPositions changes.
   */
  let prevFocusedIcon: string | null | undefined = props.focusedIcon

  createEffect(() => {
    const currentFocusedIcon = props.focusedIcon
    const currentIconPositions = iconPositions() // Read dependency

    // Phase 1: Check if we are UN-FOCUSING
    if (!currentFocusedIcon && prevFocusedIcon) {
      const currentX = rotation.x
      const currentY = rotation.y
      setTargetRotation({
        x: currentX,
        y: currentY,
        startX: currentX,
        startY: currentY,
        distance: 0,
        startTime: performance.now(),
        duration: 500,
      })
    }
    // Phase 2: Check if we are FOCUSING
    else if (currentFocusedIcon && currentFocusedIcon !== prevFocusedIcon) {
      // Assume focusing only works with images, as per original logic
      const currentItems = props.images || []
      const index = currentItems.findIndex(
        (icon) => icon === currentFocusedIcon,
      )
      const icon = currentIconPositions[index]

      // Calculate target rotation to center the icon
      const targetX = -Math.atan2(
        icon.y,
        Math.sqrt(icon.x * icon.x + icon.z * icon.z),
      )
      const targetY = Math.atan2(icon.x, icon.z)

      const currentX = rotation.x
      const currentY = rotation.y
      const distance = Math.sqrt(
        Math.pow(targetX - currentX, 2) + Math.pow(targetY - currentY, 2),
      )

      const duration = Math.min(2000, Math.max(800, distance * 1000))

      setTargetRotation({
        x: targetX,
        y: targetY,
        startX: currentX,
        startY: currentY,
        distance,
        startTime: performance.now(),
        duration,
      })
    }

    // Update prev value *after* logic
    prevFocusedIcon = currentFocusedIcon
  })

  // --- EVENT HANDLERS ---

  const handleMouseDown = (e: MouseEvent) => {
    if (!canvasRef) return
    const rect = canvasRef.getBoundingClientRect()

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const { hitRadius: currentHitRadius, depthScale: currentDepthScale } =
      derivedValues()

    // Check if an icon was clicked
    iconPositions().forEach((icon) => {
      const cosX = Math.cos(rotation.x)
      const sinX = Math.sin(rotation.x)
      const cosY = Math.cos(rotation.y)
      const sinY = Math.sin(rotation.y)

      const rotatedX = icon.x * cosY - icon.z * sinY
      const rotatedZ = icon.x * sinY + icon.z * cosY
      const rotatedY = icon.y * cosX + rotatedZ * sinX

      const scale =
        0.7 + (rotatedZ + 120 * currentDepthScale) / (400 * currentDepthScale)
      const radius = currentHitRadius * scale
      const dx = x - (canvasRef.width / 2 + rotatedX)
      const dy = y - (canvasRef.height / 2 + rotatedY)

      // Click hit detection
      if (dx * dx + dy * dy < radius * radius) {
        const targetX = -Math.atan2(
          icon.y,
          Math.sqrt(icon.x * icon.x + icon.z * icon.z),
        )
        const targetY = Math.atan2(icon.x, icon.z)

        const currentX = rotation.x
        const currentY = rotation.y
        const distance = Math.sqrt(
          Math.pow(targetX - currentX, 2) + Math.pow(targetY - currentY, 2),
        )
        const duration = Math.min(2000, Math.max(800, distance * 1000))

        // Notify parent of click
        props.onIconChange?.(props.images?.[icon.id] || '')

        // Set animation target
        setTargetRotation({
          x: targetX,
          y: targetY,
          startX: currentX,
          startY: currentY,
          distance,
          startTime: performance.now(),
          duration,
        })
        return
      }
    })

    isDragging = true
    setLastMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (props.focusedIcon) return // Don't rotate if focused
    if (!canvasRef) return
    const rect = canvasRef.getBoundingClientRect()

    // Update mouse position for passive rotation
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    mousePos = { x, y }

    // Handle drag rotation
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos().x
      const deltaY = e.clientY - lastMousePos().y

      rotation = {
        x: rotation.x + deltaY * 0.002,
        y: rotation.y + deltaX * 0.002,
      }

      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    if (props.focusedIcon) return
    isDragging = false
  }

  // --- RENDER ---

  return (
    <canvas
      ref={canvasRef} // Assign the ref
      width={mergedProps.width}
      height={mergedProps.height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      class="rounded-lg w-full h-full"
      aria-label="Interactive 3D Icon Cloud"
      role="img"
    />
  )
}
