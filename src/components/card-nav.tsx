/**
 * @file card-nav.tsx
 * @description A responsive, animated navigation component for SolidJS that displays navigation links in a card-based layout.
 *
 * This component features a mobile-first design that transforms from a compact, hamburger-driven menu
 * into an expanded, horizontal card layout on larger screens. It uses GSAP for smooth animations
 * and is built to be accessible and customizable.
 */

import {
  Index,
  Match,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js'
import { LucideArrowUpRight } from 'lucide-solid'
import { gsap } from 'gsap'
import { createDeviceSize } from '../lib/createDeviceSize'
import { cn } from '../lib/utils'
import type { JSXElement, ParentComponent } from 'solid-js'

// --- Constants ---
// Defines fixed heights and animation parameters for the navigation component.
const TOP_BAR_HEIGHT = 60 // The height of the main navigation bar when collapsed.
const PADDING = 16 // Base padding unit used for layout calculations.
const ANIMATION_DURATION = 0.4 // Standard duration for GSAP animations.
const DESKTOP_HEIGHT = 260 // Fixed height of the expanded navigation on desktop screens.
const EASE = 'power2.out' // Default easing function for animations.

// --- Type Definitions ---

/**
 * Represents a single, clickable navigation link displayed within a card.
 * @property {string} label - The visible text of the link.
 * @property {string} href - The URL the link points to.
 * @property {string} ariaLabel - An accessible label for screen readers.
 * @property {JSXElement} [icon] - An optional icon to display next to the link.
 */
type CardNavLink = {
  label: string
  href: string
  ariaLabel: string
  icon?: JSXElement
}

/**
 * Defines the structure and appearance of a single navigation card.
 * @property {string} label - The title of the card.
 * @property {string} bg - The background color of the card.
 * @property {string} textColor - The text color used within the card.
 * @property {Array<CardNavLink>} links - An array of navigation links to display in the card.
 */
export type CardNavItem = {
  label: string
  bg: string
  textColor: string
  links: Array<CardNavLink>
}

/**
 * Defines the props for the main CardNav component.
 * @property {string | JSXElement} logo - The logo to be displayed in the top bar.
 * @property {JSXElement} button - An action button, typically for sign-in or primary CTA.
 * @property {Array<CardNavItem>} items - An array of card items to populate the navigation.
 * @property {string} [className] - Optional CSS classes to apply to the root container.
 */
export interface CardNavProps {
  logo: string | JSXElement
  button: JSXElement
  items: Array<CardNavItem>
  className?: string
}

/**
 * A responsive and animated navigation component that displays links in themed cards.
 *
 * This component provides a mobile-first navigation experience that gracefully
 * transitions to a wide, card-based layout on desktops. It uses GSAP for fluid
 * height and staggering animations.
 */
export const CardNav: ParentComponent<CardNavProps> = (props) => {
  // --- State & Reactivity ---
  // Tracks whether the mobile hamburger menu is in the "open" (X) state.
  const [isHamburgerOpen, setIsHamburgerOpen] = createSignal(false)
  // Tracks whether the navigation is expanded (either on mobile or desktop hover).
  const [isExpanded, setIsExpanded] = createSignal(false)
  // GSAP timeline instance for managing animations.
  let timeline: gsap.core.Timeline | undefined
  // A reactive utility to track device breakpoint changes.
  const device = createDeviceSize()

  // --- DOM Refs ---
  // A ref for the main <nav> element, used as the primary animation target.
  let navRef: HTMLDivElement | undefined
  // An array of refs for each individual card `div`, used for stagger animations.
  const cardsRef: Array<HTMLDivElement> = []
  // A ref for the top-level container, though not actively used in this implementation.
  let containerRef: HTMLDivElement | undefined
  // A signal-based ref for the content container that holds the cards.
  // This is needed to trigger the `mobileHeight` memo when the element is available.
  const [contentRef, setContentRef] = createSignal<HTMLDivElement | undefined>()

  // A helper function to populate the `cardsRef` array.
  const setCardRef = (i: number) => (el: HTMLDivElement | null) => {
    if (el) cardsRef[i] = el
  }

  // --- Memos ---
  /**
   * Caches the expensive mobile height calculation.
   * This memo only re-runs if the content ref changes, preventing DOM-touching
   * logic from running on every resize or state change. It works by temporarily
   * making the content visible to measure its natural height.
   */
  const mobileHeight = createMemo(() => {
    const contentEl = contentRef()
    if (!contentEl) return DESKTOP_HEIGHT // Fallback height

    // --- 1. Snapshot original styles ---
    // We store the element's current styles to restore them after measurement.
    const { visibility, pointerEvents, position, height, flexDirection } =
      contentEl.style

    // --- 2. Mutate styles for measurement ---
    // We must force the element to be visible and auto-sized in the DOM
    // to accurately read its natural `scrollHeight`.
    contentEl.style.visibility = 'visible'
    contentEl.style.pointerEvents = 'auto'
    contentEl.style.position = 'static'
    contentEl.style.height = 'auto'
    contentEl.style.flexDirection = 'column'

    // --- 3. Measure the height ---
    const contentHeight = contentEl.scrollHeight

    // --- 4. Restore original styles ---
    // We clean up our mutations so the element returns to its original state.
    contentEl.style.visibility = visibility
    contentEl.style.pointerEvents = pointerEvents
    contentEl.style.position = position
    contentEl.style.height = height
    contentEl.style.flexDirection = flexDirection

    // The final height is the sum of the top bar, content, and vertical padding.
    return TOP_BAR_HEIGHT + contentHeight + PADDING * 4
  })

  /**
   * Determines the correct target height for the navigation based on the current device size.
   * It reactively switches between the calculated mobile height and the fixed desktop height.
   */
  const calculatedHeight = createMemo(() => {
    const isMobile = device.compare('<', 'md')
    return isMobile ? mobileHeight() : DESKTOP_HEIGHT
  })

  // --- Animations ---
  /**
   * Initializes and returns a GSAP timeline for the expand/collapse animation.
   * The timeline is created in a paused state, ready to be played or reversed.
   */
  const createTimeline = () => {
    if (!navRef) return

    // Set initial animation states before creating the timeline.
    gsap.set(navRef, { height: TOP_BAR_HEIGHT, overflow: 'hidden' })
    gsap.set(cardsRef, { y: TOP_BAR_HEIGHT - PADDING, opacity: 0 })

    // Create the main timeline.
    const tl = gsap.timeline({ paused: true })
    tl.to(navRef, {
      height: calculatedHeight(),
      duration: ANIMATION_DURATION,
      ease: EASE,
    })
    // Stagger the card animations for a more dynamic effect.
    tl.to(
      cardsRef,
      {
        y: 0,
        opacity: 1,
        duration: ANIMATION_DURATION,
        ease: EASE,
        stagger: 0.08,
      },
      '-=0.1', // Overlap with the height animation for a smoother transition.
    )

    return tl
  }

  // --- Effects ---
  // Create and clean up the GSAP timeline when the component mounts and unmounts.
  onMount(() => {
    timeline = createTimeline()
    onCleanup(() => {
      if (timeline) timeline.kill() // Prevent memory leaks.
    })
  })

  // This effect re-creates the timeline if the calculated height changes (e.g., on resize)
  // or if the expanded state is toggled, ensuring the animation targets are always correct.
  createEffect(() => {
    if (!timeline || !navRef) return
    const newHeight = calculatedHeight() // Depend on calculatedHeight to re-run on change.

    // `untrack` prevents this effect from re-running when `isExpanded` changes inside here.
    untrack(() => {
      if (!timeline) return

      // If the menu is already open, we need to instantly adjust the height
      // and fast-forward the animation to its end state.
      if (isExpanded()) {
        gsap.set(navRef, { height: newHeight })
        timeline.kill()
        timeline = createTimeline()
        timeline?.progress(1) // Jump to the end of the new animation.
      } else {
        // If closed, just recreate the timeline with the new height for the next interaction.
        timeline.kill()
        timeline = createTimeline()
      }
    })
  })

  /**
   * Toggles the mobile menu's open and close state, controlling the animations.
   */
  const toggleMenu = () => {
    if (!timeline) return

    if (!isExpanded()) {
      // --- Open the menu ---
      setIsHamburgerOpen(true)
      setIsExpanded(true)
      timeline.play(0) // Play the animation from the beginning.
    } else {
      // --- Close the menu ---
      setIsHamburgerOpen(false)
      // Use a callback to set `isExpanded` to false only after the animation completes.
      // This prevents the content from disappearing abruptly.
      timeline.eventCallback('onReverseComplete', () => {
        setIsExpanded(false)
      })
      timeline.reverse()
    }
  }

  return (
    <div
      class={cn(
        'fixed w-full flex justify-center z-99 top-[1.2em]',
        props.className,
      )}
      ref={containerRef}
    >
      <nav
        ref={navRef}
        class="block h-[60px] w-[90%] max-w-[800px] p-0 rounded-xl shadow-md relative overflow-hidden will-change-[height] bg-card"
      >
        {/* Top bar containing the logo, hamburger button, and action button. */}
        <div class="absolute inset-x-0 top-0 h-[60px] flex items-center justify-between p-2 pl-[1.1rem] z-2">
          {/* Hamburger menu button for mobile */}
          <div
            class="group h-full flex flex-col items-center justify-center cursor-pointer gap-[6px] order-2 md:order-0"
            role="button"
            aria-label={isExpanded() ? 'Close menu' : 'Open menu'}
            tabIndex={0}
            onClick={toggleMenu}
          >
            {/* The two lines of the hamburger icon, animated to form an 'X'. */}
            <div
              class={cn(
                'w-[30px] h-[2px] bg-current transition-all duration-300 ease-linear origin-[50%_50%]',
                isHamburgerOpen() ? 'translate-y-[4px] rotate-45' : '',
                'group-hover:opacity-75',
              )}
            />
            <div
              class={cn(
                'w-[30px] h-[2px] bg-current transition-all duration-300 ease-linear origin-[50%_50%]',
                isHamburgerOpen() ? '-translate-y-[4px] -rotate-45' : '',
                'group-hover:opacity-75',
              )}
            />
          </div>

          {/* Logo: Centered on desktop, left-aligned on mobile. */}
          <div class="flex items-center md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 order-1 md:order-0">
            {props.logo}
          </div>

          {/* Action button (e.g., "Sign In") */}
          {props.button}
        </div>

        {/* Container for the navigation cards. Visibility is toggled based on expanded state. */}
        <div
          ref={(el) => setContentRef(el)}
          class={`absolute left-0 right-0 top-[60px] bottom-0 p-2 flex flex-col items-stretch gap-2 justify-start z-1 ${
            isExpanded()
              ? 'visible pointer-events-auto'
              : 'invisible pointer-events-none'
          } md:flex-row md:items-end md:gap-[12px]`}
          aria-hidden={!isExpanded()}
        >
          {/* Dynamically render the navigation cards from props. */}
          <Index each={props.items}>
            {(item, index) => (
              <div
                ref={setCardRef(index)}
                class="flex flex-col gap-2 p-[12px_16px] rounded-[calc(0.75rem-0.2rem)] min-w-0 flex-[1_1_auto] min-h-[60px] h-full md:min-h-0 md:flex-[1_1_0%] z-50 relative"
                style={{
                  'background-color': item().bg,
                  color: item().textColor,
                }}
              >
                <div class="font-normal tracking-[-0.5px] text-[18px] md:text-[22px]">
                  {item().label}
                </div>
                <div class="mt-auto flex flex-col gap-[2px]">
                  {/* Render the links within each card. */}
                  <Index each={item().links}>
                    {(link) => (
                      <a
                        href={link().href}
                        class="inline-flex items-center gap-[6px] no-underline cursor-pointer transition-opacity duration-300 hover:opacity-75 text-[15px] md:text-[16px]"
                        aria-label={link().ariaLabel}
                      >
                        <Switch>
                          <Match when={link().icon}>{link().icon}</Match>
                          <Match when={!link().icon}>
                            <LucideArrowUpRight
                              class="shrink-0"
                              aria-hidden="true"
                            />
                          </Match>
                        </Switch>
                        {link().label}
                      </a>
                    )}
                  </Index>
                </div>
              </div>
            )}
          </Index>
        </div>
      </nav>
    </div>
  )
}