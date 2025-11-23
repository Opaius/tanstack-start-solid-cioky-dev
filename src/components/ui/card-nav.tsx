/**
 * @file card-nav.tsx
 * @description A responsive, animated navigation component for SolidJS.
 * FIXED: Re-introduced `isExpanded` state to prevent menu from vanishing
 * instantly on close. `isOpen` controls logic, `isExpanded` controls visibility.
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
} from "solid-js";
import { LucideArrowUpRight } from "lucide-solid";
import { gsap } from "gsap";
import { createDeviceSize } from "../../lib/createDeviceSize";
import { cn } from "../../lib/utils";
import type { Accessor, JSXElement, ParentComponent } from "solid-js";

// --- Constants ---
const TOP_BAR_HEIGHT = 60;
const PADDING = 16;
const ANIMATION_DURATION = 0.4;
const DESKTOP_HEIGHT = 260;
const EASE = "power2.out";

// --- Type Definitions ---

type CardNavLink = {
  label: string;
  href: string;
  ariaLabel: string;
  icon?: JSXElement;
};

export type CardNavItem = {
  label: string;
  bg: string;
  textColor: string;
  links: Array<CardNavLink>;
};

export interface CardNavProps {
  logo: string | JSXElement;
  button: JSXElement;
  items: Array<CardNavItem>;
  class?: string;
  /** Optional: Controlled state for opening the menu */
  isOpen?: Accessor<boolean>;
  /** Optional: Callback when the open state changes */
  onIsOpenChange?: (isOpen: boolean) => void;
}

export const CardNav: ParentComponent<CardNavProps> = (props) => {
  // --- State Management ---

  // 1. Logical State (Controlled vs Uncontrolled)
  // Determines if the menu "should" be open (e.g. for Hamburger icon state)
  const [internalOpen, setInternalOpen] = createSignal(false);
  const isOpen = createMemo(() =>
    props.isOpen ? props.isOpen() : internalOpen(),
  );

  // 2. Visual State
  // Determines if the content container is visible in the DOM.
  // This stays TRUE while the closing animation plays.
  const [isExpanded, setIsExpanded] = createSignal(false);

  // --- Other State ---
  let timeline: gsap.core.Timeline | undefined;
  const device = createDeviceSize();

  // --- DOM Refs ---
  let navRef: HTMLDivElement | undefined;
  const cardsRef: Array<HTMLDivElement> = [];
  let containerRef: HTMLDivElement | undefined;
  const [contentRef, setContentRef] = createSignal<
    HTMLDivElement | undefined
  >();

  const setCardRef = (i: number) => (el: HTMLDivElement | null) => {
    if (el) cardsRef[i] = el;
  };

  // --- Memos ---
  const mobileHeight = createMemo(() => {
    const contentEl = contentRef();
    if (!contentEl) return DESKTOP_HEIGHT;

    const { visibility, pointerEvents, position, height, flexDirection } =
      contentEl.style;

    contentEl.style.visibility = "visible";
    contentEl.style.pointerEvents = "auto";
    contentEl.style.position = "static";
    contentEl.style.height = "auto";
    contentEl.style.flexDirection = "column";

    const contentHeight = contentEl.scrollHeight;

    contentEl.style.visibility = visibility;
    contentEl.style.pointerEvents = pointerEvents;
    contentEl.style.position = position;
    contentEl.style.height = height;
    contentEl.style.flexDirection = flexDirection;

    return TOP_BAR_HEIGHT + contentHeight + PADDING * 4;
  });

  const calculatedHeight = createMemo(() => {
    const isMobile = device.compare("<", "md");
    return isMobile ? mobileHeight() : DESKTOP_HEIGHT;
  });

  // --- Animations ---
  const createTimeline = () => {
    if (!navRef) return;

    gsap.set(navRef, { height: TOP_BAR_HEIGHT, overflow: "hidden" });
    gsap.set(cardsRef, { y: TOP_BAR_HEIGHT - PADDING, opacity: 0 });

    // Ensure we turn off visibility ONLY after the reverse animation finishes
    const tl = gsap.timeline({
      paused: true,
      onReverseComplete: () => {
        setIsExpanded(false);
      },
    });

    tl.to(navRef, {
      height: calculatedHeight(),
      duration: ANIMATION_DURATION,
      ease: EASE,
    });
    tl.to(
      cardsRef,
      {
        y: 0,
        opacity: 1,
        duration: ANIMATION_DURATION,
        ease: EASE,
        stagger: 0.08,
      },
      "-=0.1",
    );

    return tl;
  };

  // --- Effects ---
  onMount(() => {
    timeline = createTimeline();
    onCleanup(() => {
      if (timeline) timeline.kill();
    });
  });

  // Resize / Height Update Effect
  createEffect(() => {
    if (!timeline || !navRef) return;
    const newHeight = calculatedHeight();

    untrack(() => {
      if (!timeline) return;

      // If logically open, force visual expansion and jump to end state
      if (isOpen()) {
        setIsExpanded(true);
        gsap.set(navRef, { height: newHeight });
        timeline.kill();
        timeline = createTimeline();
        timeline?.progress(1);
      } else {
        timeline.kill();
        timeline = createTimeline();
      }
    });
  });

  // Animation Trigger Effect
  createEffect(() => {
    const open = isOpen();
    untrack(() => {
      if (!timeline) return;
      if (open) {
        // Make visible BEFORE playing animation
        setIsExpanded(true);
        timeline.play();
      } else {
        // Play reverse; isExpanded turns false in onReverseComplete
        timeline.reverse();
      }
    });
  });

  // --- Handlers ---
  const toggleMenu = () => {
    const nextState = !isOpen();
    props.onIsOpenChange?.(nextState);
    if (!props.isOpen) {
      setInternalOpen(nextState);
    }
  };

  return (
    <div
      class={cn("fixed top-[1.2em] z-99 flex w-full justify-center")}
      ref={containerRef}
    >
      <nav
        ref={navRef}
        class={cn(
          "bg-card relative block h-[60px] w-[90%] max-w-[800px] overflow-hidden rounded-xl p-0 shadow-md will-change-[height]",
          props.class,
        )}
      >
        <div class="absolute inset-x-0 top-0 z-2 flex h-[60px] items-center justify-between p-2 pl-[1.1rem]">
          {/* Hamburger Button (Uses isOpen for immediate feedback) */}
          <div
            class="group order-2 flex h-full cursor-pointer flex-col items-center justify-center gap-[6px] md:order-0"
            role="button"
            aria-label={isOpen() ? "Close menu" : "Open menu"}
            tabIndex={0}
            onClick={toggleMenu}
          >
            <div
              class={cn(
                "h-[2px] w-[30px] origin-[50%_50%] bg-current transition-all duration-300 ease-linear",
                isOpen() ? "translate-y-[4px] rotate-45" : "",
                "group-hover:opacity-75",
              )}
            />
            <div
              class={cn(
                "h-[2px] w-[30px] origin-[50%_50%] bg-current transition-all duration-300 ease-linear",
                isOpen() ? "-translate-y-1 -rotate-45" : "",
                "group-hover:opacity-75",
              )}
            />
          </div>

          <div class="order-1 flex items-center md:absolute md:top-1/2 md:left-1/2 md:order-0 md:-translate-x-1/2 md:-translate-y-1/2">
            {props.logo}
          </div>

          {props.button}
        </div>

        {/* Content Container (Uses isExpanded for animation visibility) */}
        <div
          ref={(el) => setContentRef(el)}
          class={`absolute top-[60px] right-0 bottom-0 left-0 z-1 flex flex-col items-stretch justify-start gap-2 p-2 ${
            isExpanded()
              ? "pointer-events-auto visible"
              : "pointer-events-none invisible"
          } md:flex-row md:items-end md:gap-[12px]`}
          aria-hidden={!isExpanded()}
        >
          <Index each={props.items}>
            {(item, index) => (
              <div
                ref={setCardRef(index)}
                class="relative z-50 flex h-full min-h-[60px] min-w-0 flex-[1_1_auto] flex-col gap-2 rounded-[calc(0.75rem-0.2rem)] p-[12px_16px] md:min-h-0 md:flex-[1_1_0%]"
                style={{
                  "background-color": item().bg,
                  color: item().textColor,
                }}
              >
                <div class="text-[18px] font-normal tracking-[-0.5px] md:text-[22px]">
                  {item().label}
                </div>
                <div class="mt-auto flex flex-col gap-[2px]">
                  <Index each={item().links}>
                    {(link) => (
                      <a
                        href={link().href}
                        class="inline-flex cursor-pointer items-center gap-[6px] text-[15px] no-underline transition-opacity duration-300 hover:opacity-75 md:text-[16px]"
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
  );
};
