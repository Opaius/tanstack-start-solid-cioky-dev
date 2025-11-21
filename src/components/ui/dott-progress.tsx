import {
  Index,
  createEffect,
  createSignal,
  mergeProps,
  onCleanup,
  onMount,
} from 'solid-js'
import gsap from 'gsap'
import { cn } from '../../lib/utils'

type DottProgressProps = {
  progress: number
  class?: string
  dottSize?: number
  gap?: number
  dottColor?: string
  progressColor?: string
}

export function DottProgress(props: DottProgressProps) {
  const merged = mergeProps(
    {
      dottSize: 20,
      gap: 20,
      dottColor: 'white',
      progressColor: 'black',
    },
    props,
  )

  let containerRef: HTMLDivElement | undefined
  const dotsRef: Array<HTMLDivElement> = []

  // We use 0 as a temporary state to allow the container to shrink
  const [maxDots, setMaxDots] = createSignal(0)

  // Derived calculation for the exact progress value (e.g., 5.5 dots)
  const progressValue = () => (maxDots() * merged.progress) / 100

  // Ported Color Logic
  function calcDottColor(index: number) {
    const currentProgress = progressValue()
    const p = currentProgress - index

    // Full Dot
    if (p >= 1) {
      return `linear-gradient(90deg, 
        ${merged.progressColor} 0%, 
        ${merged.progressColor} 100%)`
    }

    // Partial Dot
    if (p > 0) {
      const pct = p * 100
      return `linear-gradient(90deg, 
        ${merged.progressColor} 0%, 
        ${merged.progressColor} ${pct}%, 
        ${merged.dottColor} ${pct}%, 
        ${merged.dottColor} 100%)`
    }

    // Empty Dot
    return merged.dottColor
  }

  // --- Core Resize Logic ---
  const calculateDots = () => {
    if (!containerRef) return
    const width = containerRef.offsetWidth

    // Calculate max dots based on current container width
    const count = Math.max(
      1,
      Math.floor((width + merged.gap) / (merged.dottSize + merged.gap)),
    )
    setMaxDots(count)
  }

  const handleResize = () => {
    // 1. CLEAR the dots. This empties the container.
    setMaxDots(0)

    // 2. Wait for the browser to paint the empty state (shrinking the flex container)
    // requestAnimationFrame ensures this runs after the layout update.
    requestAnimationFrame(() => {
      calculateDots()
    })
  }

  onMount(() => {
    // Initial calculation
    calculateDots()

    window.addEventListener('resize', handleResize)
    onCleanup(() => window.removeEventListener('resize', handleResize))
  })

  // --- Animation Logic ---
  createEffect(() => {
    // Depend on maxDots to trigger animation when count changes
    const count = maxDots()
    if (count === 0) return // Don't animate clearing

    // Small timeout ensures DOM elements are rendered before GSAP grabs them
    setTimeout(() => {
      // Filter out null refs in case of rapid updates
      const elements = dotsRef.filter(Boolean)

      if (elements.length) {
        gsap.fromTo(
          elements,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1, // We handle specific opacity in style, but this ensures fade-in
            duration: 0.4,
            stagger: 0.1,
            ease: 'back.out',
            overwrite: 'auto',
          },
        )
      }
    }, 10)
  })

  return (
    <div
      class={cn(
        'flex items-center w-full justify-center min-w-0',
        merged.class,
      )}
      style={{
        height: `${merged.dottSize}px`,
        gap: `${merged.gap}px`,
        // We set min-width to just 1 dot to allow aggressive shrinking if needed
        'min-width': `${merged.dottSize}px`,
      }}
      ref={containerRef}
    >
      <Index each={Array.from({ length: maxDots() })}>
        {(_, index) => (
          <div
            ref={(el) => (dotsRef[index] = el!)}
            class="rounded-full shrink-0"
            style={{
              width: `${merged.dottSize}px`,
              height: `${merged.dottSize}px`,
              background: calcDottColor(index),

              'border-radius': '50%',
              // Match React's opacity logic: Full opacity if active or partial, 0.5 if empty
              opacity: index < progressValue() ? 1 : 0.5,
              transition:
                'opacity 0.3s ease-in-out, background-image 0.3s ease-in-out, background-color 0.3s ease-in-out',
            }}
          />
        )}
      </Index>
    </div>
  )
}
