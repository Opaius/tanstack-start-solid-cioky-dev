import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  splitProps,
  useContext, // Import createMemo
} from 'solid-js'
import { Dynamic, Portal } from 'solid-js/web'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getComputedColor } from '../../lib/utils'
import type { Component, JSX, ParentProps } from 'solid-js'

/**
 * Registers ScrollTrigger if it hasn't been already.
 * We call this inside the component to ensure it runs
 * only if the component is actually used.
 */

// --- Define Color and Trigger Types ---

type RgbaColor = {
  r: number
  g: number
  b: number
  a: number
}

// Hardcoded "ultimate" fallback
const TRANSPARENT_BLACK: RgbaColor = { r: 0, g: 0, b: 0, a: 0 }

export type TriggerData = {
  element: HTMLElement
  computedBgStart: RgbaColor
  computedBgEnd: RgbaColor
}

export type BgControllerContextType = {
  registerTrigger: (data: {
    element: HTMLElement
    bgStart?: string
    bgEnd?: string
  }) => void
  deregisterTrigger: (element: HTMLElement) => void
}
export const BgControllerContext = createContext<BgControllerContextType>()

// --- BgContainer (No changes) ---

type BgContainerProps = ParentProps<{
  bgStart?: string
  bgEnd?: string
  class?: string
  style?: string | JSX.CSSProperties
  as?: keyof JSX.IntrinsicElements
}>

export const BgContainer: Component<BgContainerProps> = (props) => {
  const [local, others] = splitProps(props, [
    'bgStart',
    'bgEnd',
    'children',
    'class',
    'as',
  ])
  const componentTag = () => local.as || 'section'
  const controller = useContext(BgControllerContext)
  let elementRef!: HTMLElement

  onMount(() => {
    if (!controller) {
      console.warn('BgContainer must be a child of BgController')
      return
    }
    controller.registerTrigger({
      element: elementRef,
      bgStart: local.bgStart,
      bgEnd: local.bgEnd,
    })
  })

  onCleanup(() => {
    if (controller) {
      controller.deregisterTrigger(elementRef)
    }
  })

  return (
    <Dynamic
      component={componentTag()}
      ref={elementRef}
      class={local.class}
      {...others}
    >
      {local.children}
    </Dynamic>
  )
}

// --- Optimized BgController Component ---

type BgControllerProps = ParentProps<{
  /**
   * ✅ Optimization 1: Set a default background color.
   * Accepts any valid CSS color string (e.g., "#FFF", "rgba(20, 20, 50, 1)").
   * Defaults to transparent.
   */
  defaultBg?: string
  options?: {
    start?: string
    end?: string
    duration?: number
    ease?: string
    /**
     * ✅ Optimization 6: Expose GSAP's overwrite strategy.
     * 'auto' is safest, but `true` can be used.
     */
    overwrite?: boolean | 'auto'
  }
}>

/**
 * Helper to compute a color string into an RGBA object.
 * Falls back to the provided fallbackColor if the string is undefined or invalid.
 */
const computeColor = (
  colorString: string | undefined,
  fallbackColor: RgbaColor,
): RgbaColor => {
  if (!colorString) {
    return fallbackColor
  }
  try {
    const [r, g, b] = gsap.utils.splitColor(getComputedColor(colorString))
    // Assume full alpha if a color is provided
    return { r, g, b, a: 1 }
  } catch (e) {
    console.warn(`Invalid color value: ${colorString}. Using fallback.`, e)
    return fallbackColor
  }
}

export const BgController: Component<BgControllerProps> = (props) => {
  const {
    start = 'top 70%',
    end = 'top 69.9%',
    duration = 0.4,
    ease = 'power1.inOut',
    // ✅ Optimization 6: Destructure overwrite prop
    overwrite = 'auto',
  } = props.options || {}

  const [triggers, setTriggers] = createSignal<Array<TriggerData>>([])
  let backgroundRef!: HTMLDivElement

  // ✅ Optimization 1: Create a memo for the user's default color.
  // This reacts to prop changes and provides the base color.
  const userDefaultColor = createMemo(() =>
    computeColor(props.defaultBg, TRANSPARENT_BLACK),
  )

  const contextValue: BgControllerContextType = {
    registerTrigger: (data) => {
      // Get the *current* default color to use as the fallback
      const defaultForThisTrigger = userDefaultColor()

      const newTrigger: TriggerData = {
        element: data.element,
        computedBgStart: computeColor(data.bgStart, defaultForThisTrigger),
        computedBgEnd: computeColor(data.bgEnd, defaultForThisTrigger),
      }
      setTriggers((prev) => [...prev, newTrigger])
    },
    deregisterTrigger: (element: HTMLElement) => {
      setTriggers((prev) => prev.filter((t) => t.element !== element))
    },
  }

  let allScrollTriggers: Array<ScrollTrigger> = []
  let effectTimeoutId: NodeJS.Timeout | number | undefined

  createEffect(() => {
    const currentTriggers = triggers()
    // Read the current default color *inside* the effect
    const currentDefaultColor = userDefaultColor()

    if (effectTimeoutId) {
      clearTimeout(effectTimeoutId)
    }

    onCleanup(() => {
      allScrollTriggers.forEach((st) => st.kill())
      if (effectTimeoutId) clearTimeout(effectTimeoutId)
    })

    // Debounce the GSAP logic
    effectTimeoutId = setTimeout(() => {
      allScrollTriggers = []

      // ✅ Optimization 4: Handle empty trigger list
      if (currentTriggers.length === 0) {
        // Reset the background to the user's default color
        const { r, g, b, a } = currentDefaultColor
        gsap.to(backgroundRef, {
          '--grad-r': r,
          '--grad-g': g,
          '--grad-b': b,
          '--grad-a': a,
          '--grad-rs': r, // Use default for *both* start and end
          '--grad-gs': g,
          '--grad-bs': b,
          '--grad-as': a,
          duration,
          ease,
          overwrite, // Use prop
        })
        return
      }

      const sortedTriggers = [...currentTriggers].sort((a, b) =>
        a.element.compareDocumentPosition(b.element) & 4 ? 1 : -1,
      )

      sortedTriggers.forEach((trigger, index) => {
        const { computedBgStart, computedBgEnd } = trigger

        // Get the *previous* trigger's colors,
        // or the user default if this is the first item.
        let prevColorStart = currentDefaultColor
        let prevColorEnd = currentDefaultColor

        if (index > 0) {
          prevColorStart = sortedTriggers[index - 1].computedBgStart
          prevColorEnd = sortedTriggers[index - 1].computedBgEnd
        }

        const st = ScrollTrigger.create({
          trigger: trigger.element,
          start,
          end,
          onEnter: () => {
            gsap.to(backgroundRef, {
              '--grad-r': computedBgEnd.r,
              '--grad-g': computedBgEnd.g,
              '--grad-b': computedBgEnd.b,
              '--grad-a': computedBgEnd.a,
              '--grad-rs': computedBgStart.r,
              '--grad-gs': computedBgStart.g,
              '--grad-bs': computedBgStart.b,
              '--grad-as': computedBgStart.a,
              duration,
              ease,
              overwrite, // Use prop
            })
          },
          onLeaveBack: () => {
            gsap.to(backgroundRef, {
              '--grad-r': prevColorEnd.r,
              '--grad-g': prevColorEnd.g,
              '--grad-b': prevColorEnd.b,
              '--grad-a': prevColorEnd.a,
              '--grad-rs': prevColorStart.r,
              '--grad-gs': prevColorStart.g,
              '--grad-bs': prevColorStart.b,
              '--grad-as': prevColorStart.a,
              duration,
              ease,
              overwrite, // Use prop
            })
          },
        })

        allScrollTriggers.push(st)
      })
    }, 0)
  })

  // Use a JSX Style Object
  const backgroundStyle: JSX.CSSProperties = {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100vh',
    'z-index': -1,
    // CSS variables default to 0, matching TRANSPARENT_BLACK
    '--grad-r': 0,
    '--grad-g': 0,
    '--grad-b': 0,
    '--grad-a': 0,
    '--grad-rs': 0,
    '--grad-gs': 0,
    '--grad-bs': 0,
    '--grad-as': 0,
    background:
      'linear-gradient(180deg, rgba(var(--grad-rs), var(--grad-gs), var(--grad-bs), var(--grad-as)), rgba(var(--grad-r), var(--grad-g), var(--grad-b), var(--grad-a)))',
  }
  onMount(() => {
    gsap.registerPlugin(ScrollTrigger)
  })

  return (
    <BgControllerContext.Provider value={contextValue}>
      {props.children}
      <Portal mount={document.body}>
        <div ref={backgroundRef} style={backgroundStyle} />
      </Portal>
    </BgControllerContext.Provider>
  )
}
