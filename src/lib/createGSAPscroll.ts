import { batch, createSignal, onCleanup, onMount } from 'solid-js'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import gsap from 'gsap'

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

interface ScrollState {
  progress: number
  scroll: number
}

/**
 * Creates a reactive scroll tracker using GSAP's ScrollTrigger
 * @returns An object containing scroll progress (0-1) and scroll position (pixels)
 */
export function createGsapScroll(): ScrollState {
  const [progress, setProgress] = createSignal<number>(0)
  const [scroll, setScroll] = createSignal<number>(0)
  let scrollTrigger: ScrollTrigger | null = null

  onMount(() => {
    if (typeof ScrollTrigger === 'undefined') {
      console.warn('GSAP ScrollTrigger is not available')
      return
    }

    scrollTrigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self: ScrollTrigger) => {
        batch(() => {
          setProgress(Number(self.progress.toFixed(2))) // Limit to 2 decimal places
          setScroll(Math.round(self.scroll())) // Round to nearest pixel
        })
      },
    })
  })
  onCleanup(() => {
    if (scrollTrigger) {
      scrollTrigger.kill()
      scrollTrigger = null
    }
  })

  return {
    get progress() {
      return progress()
    },
    get scroll() {
      return scroll()
    },
  }
}
