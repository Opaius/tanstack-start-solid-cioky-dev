import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  splitProps,
  useContext,
} from 'solid-js'
import { Dynamic, Portal } from 'solid-js/web'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getComputedColor } from '../../lib/utils'
import type { Component, JSX, ParentProps } from 'solid-js'

// --- Type Definitions ---

/**
 * @type {RgbaColor}
 * @description Represents a color in RGBA format.
 * @property {number} r - Red channel (0-255).
 * @property {number} g - Green channel (0-255).
 * @property {number} b - Blue channel (0-255).
 * @property {number} a - Alpha channel (0-1).
 */
type RgbaColor = {
  r: number
  g: number
  b: number
  a: number
}

/**
 * @const {RgbaColor} TRANSPARENT_BLACK
 * @description A hardcoded fallback color used when no other color is available.
 * This ensures that color computations never fail.
 */
const TRANSPARENT_BLACK: RgbaColor = { r: 0, g: 0, b: 0, a: 0 }

/**
 * @type {TriggerData}
 * @description Holds the necessary data for a single background transition trigger.
 * @property {HTMLElement} element - The DOM element that triggers the background change.
 * @property {RgbaColor} computedBgStart - The computed RGBA color for the start of the gradient.
 * @property {RgbaColor} computedBgEnd - The computed RGBA color for the end of the gradient.
 */
export type TriggerData = {
  element: HTMLElement
  computedBgStart: RgbaColor
  computedBgEnd: RgbaColor
}

/**
 * @type {BgControllerContextType}
 * @description Defines the shape of the context used to communicate between `BgController` and `BgContainer`.
 * @property {function} registerTrigger - A function for `BgContainer` to register itself with the controller.
 * @property {function} deregisterTrigger - A function for `BgContainer` to remove itself upon cleanup.
 */
export type BgControllerContextType = {
  registerTrigger: (data: {
    element: HTMLElement
    bgStart?: string
    bgEnd?: string
  }) => void
  deregisterTrigger: (element: HTMLElement) => void
}

/**
 * @const {Context<BgControllerContextType>} BgControllerContext
 * @description A SolidJS context that allows child `BgContainer` components to register with a parent `BgController`.
 */
export const BgControllerContext = createContext<BgControllerContextType>()

// --- Components ---

type BgContainerProps = ParentProps<{
  /** The starting color of the gradient for this section. Can be any valid CSS color string. */
  bgStart?: string
  /** The ending color of the gradient for this section. Can be any valid CSS color string. */
  bgEnd?: string
  /** CSS class to apply to the container. */
  class?: string
  /** Inline styles to apply to the container. */
  style?: string | JSX.CSSProperties
  /** The HTML tag to render the container as. Defaults to 'section'. */
  as?: keyof JSX.IntrinsicElements
}>

/**
 * A container component that defines a section of the page with a specific background gradient.
 * It must be used as a child of `BgController`. It registers its element and desired colors
 * with the parent controller, which then orchestrates the background transitions.
 *
 * @param {BgContainerProps} props - The component's properties.
 * @returns {JSX.Element} A container element that will trigger a background change on scroll.
 */
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

  // --- Effects ---
  onMount(() => {
    // A `BgContainer` is useless without a controller to manage it.
    if (!controller) {
      console.warn('BgContainer must be a child of BgController')
      return
    }
    // Register this container's element and colors with the parent controller.
    controller.registerTrigger({
      element: elementRef,
      bgStart: local.bgStart,
      bgEnd: local.bgEnd,
    })
  })

  onCleanup(() => {
    // When this container is removed from the DOM, it must deregister itself
    // to prevent memory leaks and ensure the controller doesn't track stale elements.
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

type BgControllerProps = ParentProps<{
  /**
   * The default background color to use when no `BgContainer` is active.
   * Accepts any valid CSS color string (e.g., "#FFF", "rgba(20, 20, 50, 1)").
   * Defaults to transparent.
   */
  defaultBg?: string
  /** GSAP ScrollTrigger and animation options. */
  options?: {
    /** The start position of the trigger. See GSAP ScrollTrigger docs for values. Defaults to 'top 70%'. */
    start?: string
    /** The end position of the trigger. See GSAP ScrollTrigger docs for values. Defaults to 'top 69.9%'. */
    end?: string
    /** The duration of the color transition animation in seconds. Defaults to 0.4. */
    duration?: number
    /** The easing function for the animation. Defaults to 'power1.inOut'. */
    ease?: string
    /**
     * GSAP's overwrite strategy. 'auto' is safest, but `true` can be used.
     * Determines how conflicting animations are handled.
     */
    overwrite?: boolean | 'auto'
  }
}>

/**
 * Helper to compute a color string into an RGBA object.
 * It uses a fallback color if the provided string is invalid or undefined.
 *
 * @param {string | undefined} colorString - The CSS color string to parse.
 * @param {RgbaColor} fallbackColor - The color to return if parsing fails.
 * @returns {RgbaColor} The computed RGBA color object.
 */
const computeColor = (
  colorString: string | undefined,
  fallbackColor: RgbaColor,
): RgbaColor => {
  if (!colorString) {
    return fallbackColor
  }
  try {
    // `getComputedColor` resolves CSS variables, and `gsap.utils.splitColor` parses it.
    const [r, g, b, a] = gsap.utils.splitColor(getComputedColor(colorString))
    return { r, g, b, a: a !== undefined ? a : 1 }
  } catch (e) {
    console.warn(`Invalid color value: ${colorString}. Using fallback.`, e)
    return fallbackColor
  }
}

/**
 * The main controller component that manages the animated background gradient.
 * It creates a fixed-position background element and uses GSAP ScrollTrigger to animate
 * its gradient based on the scroll position relative to child `BgContainer` components.
 *
 * @param {BgControllerProps} props - The component's properties.
 * @returns {JSX.Element} A context provider and the fixed background element.
 */
export const BgController: Component<BgControllerProps> = (props) => {
  // --- Props and Defaults ---
  const {
    start = 'top 70%',
    end = 'top 69.9%',
    duration = 0.4,
    ease = 'power1.inOut',
    overwrite = 'auto',
  } = props.options || {}

  // --- State ---
  /**
   * A signal holding an array of all registered trigger elements and their computed colors.
   * This is the central piece of state that drives the background animations.
   */
  const [triggers, setTriggers] = createSignal<Array<TriggerData>>([])
  let backgroundRef!: HTMLDivElement

  // --- Memos ---
  /**
   * Caches the computed default background color.
   * This memo ensures that we only re-calculate the color when the `defaultBg` prop changes,
   * and provides a stable fallback for all trigger computations.
   */
  const userDefaultColor = createMemo(() =>
    computeColor(props.defaultBg, TRANSPARENT_BLACK),
  )

  // --- Context ---
  const contextValue: BgControllerContextType = {
    registerTrigger: (data) => {
      // When a new trigger registers, compute its start and end colors immediately.
      // Use the current default color as a fallback if the trigger doesn't specify one.
      const defaultForThisTrigger = userDefaultColor()
      const newTrigger: TriggerData = {
        element: data.element,
        computedBgStart: computeColor(data.bgStart, defaultForThisTrigger),
        computedBgEnd: computeColor(data.bgEnd, defaultForThisTrigger),
      }
      setTriggers((prev) => [...prev, newTrigger])
    },
    deregisterTrigger: (element: HTMLElement) => {
      // Remove the trigger from the list to update the scroll animations.
      setTriggers((prev) => prev.filter((t) => t.element !== element))
    },
  }

  // --- Effects ---
  let allScrollTriggers: Array<ScrollTrigger> = []
  let effectTimeoutId: NodeJS.Timeout | number | undefined

  createEffect(() => {
    const currentTriggers = triggers()
    const currentDefaultColor = userDefaultColor()

    // Debounce the effect to prevent rapid-fire re-calculations during registration.
    // A timeout of 0 pushes the execution to the next tick, allowing multiple triggers
    // to register in the same frame without causing multiple GSAP setups.
    if (effectTimeoutId) {
      clearTimeout(effectTimeoutId)
    }

    onCleanup(() => {
      // Kill all existing ScrollTrigger instances to prevent memory leaks and duplicate triggers.
      allScrollTriggers.forEach((st) => st.kill())
      if (effectTimeoutId) clearTimeout(effectTimeoutId)
    })

    effectTimeoutId = setTimeout(() => {
      allScrollTriggers = []

      // If no triggers are registered, reset the background to the default color.
      if (currentTriggers.length === 0) {
        const { r, g, b, a } = currentDefaultColor
        gsap.to(backgroundRef, {
          '--grad-r': r,
          '--grad-g': g,
          '--grad-b': b,
          '--grad-a': a,
          '--grad-rs': r, // Use default for both start and end of gradient
          '--grad-gs': g,
          '--grad-bs': b,
          '--grad-as': a,
          duration,
          ease,
          overwrite,
        })
        return
      }

      // Sort triggers by their vertical position on the page. This is crucial
      // to ensure the background transitions occur in the correct order as the user scrolls.
      const sortedTriggers = [...currentTriggers].sort((a, b) => {
        const aRect = a.element.getBoundingClientRect()
        const bRect = b.element.getBoundingClientRect()
        return aRect.top - bRect.top
      })

      // Create a ScrollTrigger for each registered container.
      sortedTriggers.forEach((trigger, index) => {
        const { computedBgStart, computedBgEnd } = trigger

        // Determine the previous section's colors. If this is the first trigger,
        // use the user's default color. This is needed for the `onLeaveBack` animation.
        const prevColorStart =
          index > 0
            ? sortedTriggers[index - 1].computedBgStart
            : currentDefaultColor
        const prevColorEnd =
          index > 0
            ? sortedTriggers[index - 1].computedBgEnd
            : currentDefaultColor

        const st = ScrollTrigger.create({
          trigger: trigger.element,
          start,
          end,
          // When scrolling down and entering a new section, animate to its colors.
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
              overwrite,
            })
          },
          // When scrolling up and leaving a section, animate back to the previous section's colors.
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
              overwrite,
            })
          },
        })

        allScrollTriggers.push(st)
      })
    }, 0)
  })

  // --- Styles ---
  const backgroundStyle: JSX.CSSProperties = {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100vh',
    'z-index': -1,
    // Define CSS variables that GSAP will animate.
    // They default to 0, matching the TRANSPARENT_BLACK fallback.
    '--grad-r': 0,
    '--grad-g': 0,
    '--grad-b': 0,
    '--grad-a': 0,
    '--grad-rs': 0, // 's' for start of gradient
    '--grad-gs': 0,
    '--grad-bs': 0,
    '--grad-as': 0,
    // The background is a linear gradient constructed from the animated CSS variables.
    background:
      'linear-gradient(180deg, rgba(var(--grad-rs), var(--grad-gs), var(--grad-bs), var(--grad-as)), rgba(var(--grad-r), var(--grad-g), var(--grad-b), var(--grad-a)))',
  }

  onMount(() => {
    // Register the GSAP ScrollTrigger plugin. This is done on mount
    // to ensure it only runs in the browser and if the component is used.
    gsap.registerPlugin(ScrollTrigger)
  })

  return (
    <BgControllerContext.Provider value={contextValue}>
      {props.children}
      {/* The background element is portaled to the body to ensure it covers the entire viewport
          without being affected by the stacking context of its parent components. */}
      <Portal mount={document.body}>
        <div ref={backgroundRef} style={backgroundStyle} />
      </Portal>
    </BgControllerContext.Provider>
  )
}
