import {
  Index,
  createEffect,
  createSignal,
  mergeProps,
  onCleanup,
} from 'solid-js'
import gsap from 'gsap'
import { cn } from '../../lib/utils'
import { createDeviceSize } from '../../lib/createDeviceSize'

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

  const device = createDeviceSize() // <-- used instead of window resize

  let containerRef: HTMLDivElement | undefined
  const dotsRef: Array<HTMLDivElement> = []

  const [maxDotts, setMaxDotts] = createSignal(0)
  const [progressDotts, setProgressDotts] = createSignal(0)

  // Recalculate when:
  // - progress changes
  // - device size changes
  // - container width changes
  createEffect(() => {
    device.size() // <= track updates

    const container = containerRef
    if (!container) return

    const width = container.offsetWidth

    const maxDots = Math.max(
      1,
      Math.floor((width + merged.gap) / (merged.dottSize + merged.gap)),
    )

    setMaxDotts(maxDots)
    setProgressDotts((maxDots * merged.progress) / 100)
  })

  function calcDottColor(index: number) {
    const p = progressDotts() - index

    if (p >= 1) {
      return `linear-gradient(90deg,
        ${merged.progressColor} 0%,
        ${merged.progressColor} 100%)`
    }

    if (p > 0) {
      const pct = p * 100
      return `linear-gradient(90deg,
        ${merged.progressColor} 0%,
        ${merged.progressColor} ${pct}%,
        ${merged.dottColor} ${pct}%,
        ${merged.dottColor} 100%)`
    }

    return merged.dottColor
  }

  // GSAP animation when dots or progress change
  createEffect(() => {
    const elements = dotsRef
    progressDotts()
    if (!elements.length) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        elements,
        { y: 20 },
        {
          y: 0,
          duration: 0.4,
          stagger: 0.1,
          ease: 'back.out',
        },
      )
    }, containerRef)

    onCleanup(() => ctx.revert())
  })

  return (
    <div
      class={cn('flex items-center w-full justify-center', merged.class)}
      style={{
        height: `${merged.dottSize}px`,
        gap: `${merged.gap}px`,
        'min-width': `${merged.dottSize * 2 + merged.gap}px`,
      }}
      ref={containerRef}
    >
      <Index each={Array.from({ length: maxDotts() })}>
        {(_, index) => (
          <div
            ref={(el) => (dotsRef[index] = el)}
            class="rounded-full"
            style={{
              width: `${merged.dottSize}px`,
              height: `${merged.dottSize}px`,
              background: calcDottColor(index),
              padding: '1px',
              'border-radius': '50%',
              transition:
                'opacity 0.3s ease-in-out, background-image 0.3s ease-in-out, background-color 0.3s ease-in-out',
            }}
          />
        )}
      </Index>
    </div>
  )
}
