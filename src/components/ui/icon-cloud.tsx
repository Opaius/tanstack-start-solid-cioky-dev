import { createEffect, createMemo, createSignal, mergeProps } from 'solid-js'
import { renderToString } from 'solid-js/web'
import type { Accessor, JSXElement } from 'solid-js'

interface Icon {
  x: number
  y: number
  z: number
  scale: number
  opacity: number
  id: number
}

type CanvasMouseEvent = MouseEvent & {
  currentTarget: HTMLCanvasElement
  target: Element
}

interface IconCloudProps {
  icons?: Array<JSXElement>
  images?: Array<string>
  onIconChange?: (icon: string) => void
  width: number
  height: number
  focusedIcon?: Accessor<string | null>
  quality?: number
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function IconCloud(props: IconCloudProps) {
  const finalProps = mergeProps(
    {
      width: 400,
      height: 400,
      quality: 2,
    },
    props,
  )
  let canvasElement: HTMLCanvasElement | undefined
  const [iconPositions, setIconPositions] = createSignal<Array<Icon>>([])

  const [targetRotation, setTargetRotation] = createSignal<{
    x: number
    y: number
    startX: number
    startY: number
    distance: number
    startTime: number
    duration: number
  } | null>(null)

  let rotation = { x: 0, y: 0 }
  let dragging = false
  let lastMouse = { x: 0, y: 0 }
  let mousePos = { x: 0, y: 0 }
  let animId: number

  let iconCanvasesRef: Array<HTMLCanvasElement> = []
  const scaledIconCache = new Map<string, Array<HTMLCanvasElement>>()
  let imagesLoadedRef: Array<boolean> = []

  const scaleFactor = createMemo(() => {
    const baseSize = 400
    const avgSize = (finalProps.width + finalProps.height) / 2
    return avgSize / baseSize
  })

  const [prevIcon, setPrevIcon] = createSignal<string | null | undefined>(null)

  const calculatedSizes = createMemo(() => {
    const baseSphereRadius = 120
    const baseIconSize = 50
    const baseDepthScale = 1.0

    const sphereRadius = baseSphereRadius * scaleFactor()
    const iconSize = baseIconSize * scaleFactor()
    const hitRadius = iconSize * 0.6
    const depthScale = baseDepthScale * scaleFactor()
    return { sphereRadius, iconSize, hitRadius, depthScale }
  })
  const numIcons = (finalProps.icons || finalProps.images)?.length || 20
  const baseIconPositions: Array<{ x: number; y: number; z: number }> = []

  const offset = 2 / numIcons
  const increment = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < numIcons; i++) {
    const y = i * offset - 1 + offset / 2
    const r = Math.sqrt(1 - y * y)
    const phi = i * increment

    baseIconPositions.push({
      x: Math.cos(phi) * r,
      y,
      z: Math.sin(phi) * r,
    })
  }

  createEffect(() => {
    if (!finalProps.icons && !finalProps.images) return
    const items = finalProps.icons || finalProps.images || []
    imagesLoadedRef = new Array(items.length).fill(false)
    const newIconCanvases = items.map((item, index) => {
      const offscreen = document.createElement('canvas')
      offscreen.width = calculatedSizes().iconSize * finalProps.quality
      offscreen.height = calculatedSizes().iconSize * finalProps.quality
      const offCtx = offscreen.getContext('2d')

      if (offCtx) {
        offCtx.scale(finalProps.quality, finalProps.quality)
        if (finalProps.images) {
          const image = new Image()
          image.src = finalProps.images[index]
          image.onload = () => {
            offCtx.clearRect(0, 0, offscreen.width, offscreen.height)

            offCtx.beginPath()
            offCtx.arc(
              calculatedSizes().iconSize / 2,
              calculatedSizes().iconSize / 2,
              calculatedSizes().iconSize / 2,
              0,
              Math.PI * 2,
            )
            offCtx.closePath()
            offCtx.clip()
            offCtx.drawImage(
              image,
              0,
              0,
              calculatedSizes().iconSize,
              calculatedSizes().iconSize,
            )

            imagesLoadedRef[index] = true
            scaledIconCache.clear()
          }
        } else {
          offCtx.scale(0.4 * scaleFactor(), 0.4 * scaleFactor())
          const svgString = renderToString(() => item)
          const img = new Image()
          img.src = 'data:image/svg+xml;base64,' + btoa(svgString)
          img.onload = () => {
            offCtx.clearRect(0, 0, offscreen.width, offscreen.height)
            offCtx.drawImage(img, 0, 0)
            imagesLoadedRef[index] = true
            scaledIconCache.clear()
          }
        }
      }
      return offscreen
    })
    iconCanvasesRef = newIconCanvases
    scaledIconCache.clear()
  })

  const getScaledIconsForSize = (iconSize: number) => {
    const targetKey = `${iconSize}-${finalProps.quality}`
    if (!scaledIconCache.has(targetKey)) {
      const targetResolution = Math.max(
        1,
        Math.round(iconSize * finalProps.quality),
      )
      const scaled = iconCanvasesRef.map((canvas) => {
        if (
          canvas.width === targetResolution &&
          canvas.height === targetResolution
        ) {
          return canvas
        }

        const scaledCanvas = document.createElement('canvas')
        scaledCanvas.width = targetResolution
        scaledCanvas.height = targetResolution
        const ctx = scaledCanvas.getContext('2d')
        if (!ctx) return canvas
        ctx.drawImage(
          canvas,
          0,
          0,
          canvas.width,
          canvas.height,
          0,
          0,
          targetResolution,
          targetResolution,
        )
        return scaledCanvas
      })
      scaledIconCache.set(targetKey, scaled)
    }

    return scaledIconCache.get(targetKey) || []
  }
  createEffect(() => {
    const items = finalProps.icons || finalProps.images || []
    const newIcons: Array<Icon> = []
    const iconCount = items.length || 20

    const goldenOffset = 2 / iconCount
    const goldenIncrement = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < iconCount; i++) {
      const y = i * goldenOffset - 1 + goldenOffset / 2
      const r = Math.sqrt(1 - y * y)
      const phi = i * goldenIncrement

      const x = Math.cos(phi) * r
      const z = Math.sin(phi) * r

      newIcons.push({
        x: x * calculatedSizes().sphereRadius,
        y: y * calculatedSizes().sphereRadius,
        z: z * calculatedSizes().sphereRadius,
        scale: 1,
        opacity: 1,
        id: i,
      })
    }
    setIconPositions(newIcons)
  })
  createEffect(() => {
    if (canvasElement) {
      canvasElement.width = finalProps.width
      canvasElement.height = finalProps.height
    }
  })

  createEffect(() => {
    const ctx = canvasElement?.getContext('2d')
    if (!ctx || !canvasElement) return

    const animate = () => {
      const sizes = calculatedSizes()
      const scaledIcons = getScaledIconsForSize(sizes.iconSize)
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height)

      const centerX = canvasElement.width / 2
      const centerY = canvasElement.height / 2
      const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY)
      const dx = mousePos.x - centerX
      const dy = mousePos.y - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const speed = 0.003 + (distance / maxDistance) * 0.01

      const target = targetRotation()
      if (target) {
        const elapsed = performance.now() - target.startTime
        const progress = Math.min(1, elapsed / target.duration)
        const easedProgress = easeOutCubic(progress)

        rotation = {
          x: target.startX + (target.x - target.startX) * easedProgress,
          y: target.startY + (target.y - target.startY) * easedProgress,
        }

        if (progress >= 1) {
          setTargetRotation(null)
        }
      } else if (dragging) {
        rotation = {
          x: rotation.x + (dy / canvasElement.height) * speed,
          y: rotation.y + (dx / canvasElement.width) * speed,
        }
      }

      iconPositions().forEach((icon, index) => {
        const cosX = Math.cos(rotation.x)
        const sinX = Math.sin(rotation.x)
        const cosY = Math.cos(rotation.y)
        const sinY = Math.sin(rotation.y)

        const rotatedX = icon.x * cosY - icon.z * sinY
        const rotatedZ = icon.x * sinY + icon.z * cosY
        const rotatedY = icon.y * cosX + rotatedZ * sinX

        const scale =
          0.7 + (rotatedZ + 120 * sizes.depthScale) / (400 * sizes.depthScale)
        const opacity = Math.max(
          0.4,
          Math.min(
            1,
            (rotatedZ + 100 * sizes.depthScale) / (180 * sizes.depthScale),
          ),
        )

        ctx.save()
        ctx.translate(
          canvasElement.width / 2 + rotatedX,
          canvasElement.height / 2 + rotatedY,
        )
        ctx.scale(scale, scale)
        ctx.globalAlpha = opacity

        if (imagesLoadedRef[index]) {
          const sprite = scaledIcons[index]

          ctx.drawImage(
            sprite,
            -sizes.iconSize / 2,
            -sizes.iconSize / 2,
            sizes.iconSize,
            sizes.iconSize,
          )
        } else {
          // Show numbered circles if no icons/images are provided
          ctx.beginPath()
          ctx.arc(0, 0, sizes.iconSize / 2, 0, Math.PI * 2)
          ctx.fillStyle = '#4444ff'
          ctx.fill()
          ctx.fillStyle = 'white'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.font = `${Math.max(12, sizes.iconSize / 3)}px Arial`
          ctx.fillText(`${icon.id + 1}`, 0, 0)
        }

        ctx.restore()
      })
      animId = requestAnimationFrame(animate)
    }

    animate()

    return () => cancelAnimationFrame(animId)
  })

  createEffect(() => {
    // Phase 1: Check if we are UN-FOCUSING
    const focusedValue = finalProps.focusedIcon?.()
    if (!focusedValue && !prevIcon()) {
      const currentX = rotation.x
      const currentY = rotation.y

      const targetX = currentX
      const targetY = currentY

      const duration = 500

      setTargetRotation({
        x: targetX,
        y: targetY,
        startX: currentX,
        startY: currentY,
        distance: 0,
        startTime: performance.now(),
        duration: duration,
      })

      setPrevIcon(null)
      return
    }

    // Phase 2: Check if we are FOCUSING
    else if (focusedValue) {
      const index =
        finalProps.images?.findIndex((icon) => icon === focusedValue) ?? -1
      if (index === -1) {
        return
      }

      const icon = iconPositions()[index]

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

    setPrevIcon(focusedValue)
  })

  // Handle mouse events
  // Replace your existing handleMouseDown with this:
  const handleMouseDown = (e: CanvasMouseEvent) => {
    const rect = canvasElement?.getBoundingClientRect()
    if (!rect || !canvasElement) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvasElement.getContext('2d')
    if (!ctx) return

    // FIX: Use for...of instead of forEach so we can return from the parent function
    const icons = iconPositions()
    for (const icon of icons) {
      const cosX = Math.cos(rotation.x)
      const sinX = Math.sin(rotation.x)
      const cosY = Math.cos(rotation.y)
      const sinY = Math.sin(rotation.y)

      const rotatedX = icon.x * cosY - icon.z * sinY
      const rotatedZ = icon.x * sinY + icon.z * cosY
      const rotatedY = icon.y * cosX + rotatedZ * sinX

      const scale =
        0.7 +
        (rotatedZ + 120 * calculatedSizes().depthScale) /
          (400 * calculatedSizes().depthScale)
      const radius = calculatedSizes().hitRadius * scale
      const dx = x - (canvasElement.width / 2 + rotatedX)
      const dy = y - (canvasElement.height / 2 + rotatedY)

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

        finalProps.onIconChange?.(finalProps.images?.[icon.id] || '')

        setTargetRotation({
          x: targetX,
          y: targetY,
          startX: currentX,
          startY: currentY,
          distance,
          startTime: performance.now(),
          duration,
        })

        // This return now correctly stops the function before setting dragging=true
        return
      }
    }

    dragging = true
    lastMouse = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: CanvasMouseEvent) => {
    const rect = canvasElement?.getBoundingClientRect()
    if (rect) {
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      mousePos = { x, y }
    }

    // Only stop the DRAG logic if focused
    if (finalProps.focusedIcon) return

    if (dragging) {
      const deltaX = e.clientX - lastMouse.x
      const deltaY = e.clientY - lastMouse.y

      rotation = {
        x: rotation.x + deltaY * 0.002,
        y: rotation.y + deltaX * 0.002,
      }

      lastMouse = { x: e.clientX, y: e.clientY }
    }
  }

  const handleMouseUp = () => {
    dragging = false
  }
  return (
    <canvas
      ref={canvasElement}
      width={finalProps.width}
      height={finalProps.height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      aria-label="Interactive 3D Icon Cloud"
      role="img"  
    />
  )
}
