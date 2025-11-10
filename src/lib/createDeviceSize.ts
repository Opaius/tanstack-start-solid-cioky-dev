/**
 * @file createDeviceSize.ts
 * @description A SolidJS primitive for reactively tracking window dimensions and breakpoint changes.
 *
 * This utility provides a `createDeviceSize` primitive that returns reactive signals for window width,
 * height, and the current responsive breakpoint (e.g., 'sm', 'md', 'lg'). It debounces resize
 * events to optimize performance while providing immediate breakpoint updates for responsive UI rendering.
 * It also includes a `compare` utility to easily check the current breakpoint against others.
 */

import { createSignal, onCleanup, onMount } from 'solid-js'
import { isServer } from 'solid-js/web'

// --- BREAKPOINT DEFINITIONS ---
/**
 * Breakpoint values in pixels for responsive design.
 * Keys are breakpoint names, and values are the *minimum* width for that breakpoint.
 * This follows a mobile-first approach.
 */
const BREAKPOINTS = {
  '2xl': 1536, // For extra-large screens, typically 1080p monitors and above.
  xl: 1280, // For large desktops.
  lg: 1024, // For standard desktops and landscape tablets.
  md: 768, // For portrait tablets and large phones.
  sm: 640, // For standard mobile phones.
  base: 0, // The default, mobile-first breakpoint.
}

/**
 * Defines the logical order of breakpoints from smallest to largest.
 * This array is crucial for comparison operations, allowing checks like "is the screen larger than 'md'?"
 */
export const BREAKPOINT_ORDER: Array<keyof typeof BREAKPOINTS> = [
  'base',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
]

/**
 * A type representing all possible breakpoint names derived from the BREAKPOINTS object.
 */
export type DeviceSize = keyof typeof BREAKPOINTS

/**
 * Sorts breakpoints in descending order by their pixel value.
 * This optimization allows `getDeviceState` to iterate and find the current
 * breakpoint efficiently by checking from the largest width downwards.
 */
const sortedBreakpoints = Object.entries(BREAKPOINTS).sort(
  ([, a], [, b]) => b - a,
) as Array<[DeviceSize, number]>

/**
 * A pure function that calculates the device state based on the current window dimensions.
 * It is designed to be safe for server-side rendering (SSR) by returning default values.
 *
 * @returns {object} An object containing the window's width, height, and the current breakpoint name.
 */
const getDeviceState = () => {
  // On the server, window is not defined, so we return a default state.
  if (isServer) return { width: 0, height: 0, size: 'base' as DeviceSize }

  const width = window.innerWidth
  const height = window.innerHeight
  let newSize: DeviceSize = 'base'

  // Iterate through the pre-sorted breakpoints to find the first one that matches the current width.
  // Since it's sorted from largest to smallest, the first match is the correct one.
  for (const [size, minWidth] of sortedBreakpoints) {
    if (width >= minWidth) {
      newSize = size
      break
    }
  }

  return { width, height, size: newSize }
}

/**
 * A SolidJS primitive that reactively tracks window dimensions and the current breakpoint.
 * It debounces resize events for performance while updating the breakpoint immediately.
 *
 * @param {number} [debounceMs=100] - The delay in milliseconds to wait after the last resize event before updating the width and height signals.
 * @returns {object} An object containing reactive signals and utilities:
 * - `size`: A signal for the debounced window width.
 * - `height`: A signal for the debounced window height.
 * - `breakpoint`: A signal for the immediate breakpoint name (e.g., 'sm', 'md').
 * - `compare`: A utility function to compare the current breakpoint against a target.
 */
export const createDeviceSize = (debounceMs = 100) => {
  const initialState = getDeviceState()

  // --- State ---
  // A signal that holds the current active breakpoint name (e.g., 'md', 'lg').
  // It updates immediately on resize for responsive rendering.
  const [breakpoint, setBreakpoint] = createSignal<DeviceSize>(
    initialState.size,
  )
  // A signal for the window width, debounced for performance.
  const [size, setSize] = createSignal(initialState.width)
  // A signal for the window height, debounced for performance.
  const [height, setHeight] = createSignal(initialState.height)

  // --- Logic ---
  // A timer variable to manage the debouncing of resize events.
  let debounceTimer: ReturnType<typeof setTimeout>

  /**
   * The event handler for the window's resize event.
   */
  const handleResize = () => {
    // First, immediately check and update the breakpoint.
    // This ensures that UI dependent on the breakpoint (e.g., via <Show> or class toggles)
    // reacts instantly, preventing layout flashes or incorrect component rendering.
    const { size: newBreakpoint } = getDeviceState()
    if (newBreakpoint !== breakpoint()) {
      setBreakpoint(newBreakpoint)
    }

    // Next, debounce the updates for width and height signals.
    // This prevents excessive re-renders and calculations that depend on the exact dimensions,
    // which are often less critical to update instantly than the breakpoint.
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      const {
        width: finalWidth,
        height: finalHeight,
        size: finalBreakpoint,
      } = getDeviceState()

      setSize(finalWidth)
      setHeight(finalHeight)

      // As a final safety check, verify the breakpoint again after the debounce timer.
      // This handles edge cases where the resize might have ended on a different breakpoint
      // than the one captured at the start of the event.
      if (finalBreakpoint !== breakpoint()) {
        setBreakpoint(finalBreakpoint)
      }
    }, debounceMs)
  }

  // --- Effects ---
  // Attach the resize event listener when the component mounts.
  onMount(() => {
    window.addEventListener('resize', handleResize)
    // Clean up the event listener and any pending timers when the component unmounts
    // to prevent memory leaks.
    onCleanup(() => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(debounceTimer)
    })
  })

  /**
   * A utility function to compare the current breakpoint against a target breakpoint.
   * This is useful for conditional rendering based on screen size ranges.
   *
   * @param {'<' | '>' | '<=' | '>=' | '==='} op - The comparison operator.
   * @param {DeviceSize} bp - The target breakpoint to compare against (e.g., 'md').
   * @returns {boolean} `true` if the comparison is valid, otherwise `false`.
   * @example
   * const isDesktop = compare('>=', 'lg'); // Returns true if screen is lg, xl, or 2xl.
   * const isMobile = compare('<', 'md'); // Returns true if screen is sm or base.
   * const isTablet = compare('===', 'md'); // Returns true only if the screen is exactly md.
   */
  const compare = (op: '<' | '>' | '<=' | '>=' | '===', bp: DeviceSize) => {
    const currentIndex = BREAKPOINT_ORDER.indexOf(breakpoint())
    const targetIndex = BREAKPOINT_ORDER.indexOf(bp)
    if (op === '<') return currentIndex < targetIndex
    if (op === '>') return currentIndex > targetIndex
    if (op === '<=') return currentIndex <= targetIndex
    if (op === '>=') return currentIndex >= targetIndex
    return currentIndex === targetIndex // Handles '==='
  }

  // Expose the reactive signals and the compare utility.
  return { size, height, breakpoint, compare }
}
