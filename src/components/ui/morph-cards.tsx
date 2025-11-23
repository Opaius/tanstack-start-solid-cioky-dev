import {
  For,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  onMount,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn, getComputedColor } from "../../lib/utils";
import type {
  Accessor,
  Component,
  JSX,
  JSXElement,
  ParentComponent,
  Setter,
} from "solid-js";

type RenderProps = {
  isActive: Accessor<boolean>;
  activeIndex: Accessor<number>;
  index: Accessor<number>;
  distanceFromActive: Accessor<number>;
};

export type MorphCard = {
  header: (props: RenderProps) => JSXElement;
  content: (props: RenderProps) => JSXElement;
  mainColor?: string;
};

type MorphCardProps = {
  items: Array<MorphCard>;
  setActiveIndex?: (setter: Setter<number>) => void;
};

const resolveHeader = (source: MorphCard["header"], args: RenderProps) => {
  if (typeof source === "function") {
    return source(args);
  }
  return source;
};

const resolveContent = (source: MorphCard["content"], args: RenderProps) => {
  if (typeof source === "function") {
    return source(args);
  }
  return source;
};

export const MorphCards: Component<MorphCardProps> = (props) => {
  const [activeIndex, setActiveIndex] = createSignal(0);
  let triggerRef: HTMLDivElement | undefined;
  let cardsRef: HTMLDivElement | undefined;

  props.setActiveIndex?.(setActiveIndex);

  // CONSTANTS FOR SYNCING
  const SIZE_DURATION = 400;
  const OPACITY_DURATION = 300;

  // --- 1. Auto-Center Logic ---
  // Updated to handle scrolling DOWN by calculating the 'future' top position
  // rather than relying on the current DOM state which might still be expanded.
  createEffect(() => {
    const index = activeIndex();

    if (cardsRef && triggerRef) {
      const cardElements = Array.from(cardsRef.children) as Array<HTMLElement>;
      const activeCard = cardElements[index];
      const containerHeight = triggerRef.offsetHeight;
      const gap = 16; // gap-4 is 1rem (16px)

      // Calculate the projected top offset by summing the heights of
      // previous cards AS IF they were collapsed.
      // This solves the issue where scrolling down (0->1) reads Card 0's
      // expanded height before it collapses, causing a massive layout jump.
      let accumulatedTop = 0;

      for (let i = 0; i < index; i++) {
        const prevCard = cardElements[i];
        // The header wrapper is the first child.
        // Collapsed height ≈ Header Height + Parent Borders (8px)
        const headerPart = prevCard.firstElementChild as HTMLElement;
        const h = headerPart.offsetHeight;
        accumulatedTop += h + 8 + gap;
      }

      // We center based on this stable projected top + half of the active card's current height
      const currentH = activeCard.offsetHeight;
      const targetY = containerHeight / 2 - accumulatedTop - currentH / 2;

      gsap.to(cardsRef, {
        y: targetY,
        duration: 0.6,
        ease: "power3.out",
        overwrite: "auto",
      });
    }
  });

  // --- 2. GSAP Scroll Pinning Logic ---
  onMount(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Duration per card (in pixels of scroll)
    const SCROLL_PER_CARD = 700;
    const totalScroll = props.items.length * SCROLL_PER_CARD;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: triggerRef,
        start: "center center",
        end: `+=${totalScroll}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const index = Math.floor(self.progress * props.items.length);
          const clampedIndex = Math.min(index, props.items.length - 1);
          setActiveIndex(clampedIndex);
        },
      });

      ScrollTrigger.refresh();
    }, triggerRef);

    onCleanup(() => ctx.revert());
  });

  return (
    <div
      ref={triggerRef}
      class="flex h-screen items-center justify-center overflow-hidden py-10"
    >
      <div
        ref={cardsRef}
        class="relative flex w-[300px] flex-col items-center gap-4 will-change-transform md:w-[500px]"
      >
        <For each={props.items}>
          {(item, index) => {
            const isActive = createMemo(() => index() === activeIndex());
            const distanceFromActive = createMemo(() =>
              Math.abs(index() - activeIndex()),
            );

            const headerStyles = createMemo(() => {
              if (isActive()) return "w-full";
              const distance = distanceFromActive();
              if (distance === 1) return "w-3/4";
              if (distance >= 2) return "w-1/2";
            });

            const resolvedColor = getComputedColor(item.mainColor || "");

            return (
              <div
                class={cn(
                  "shrink-0 overflow-hidden rounded-2xl bg-slate-800",
                  headerStyles(),
                )}
                style={{
                  border: `4px solid color-mix(in srgb, ${resolvedColor}, transparent 60%)`,
                  "box-shadow": `0 4px 6px -1px ${resolvedColor}, 0 2px 4px -1px ${resolvedColor}`,
                  transition:
                    "width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), border-color 0.3s ease",
                }}
              >
                <div class="relative overflow-visible p-4">
                  <div
                    class={`absolute bottom-1/5 left-1/2 aspect-square ${isActive() ? "h-40" : "h-50"} -translate-x-1/2 overflow-visible`}
                    style={{
                      "background-image": `radial-gradient(circle at center, color-mix(in srgb, ${resolvedColor}, transparent), transparent 70%)`,
                    }}
                  />
                  <div
                    class="absolute inset-0 h-[200%] w-full"
                    style={{
                      opacity: `${isActive() ? 1 : 0}`,
                      transition: `opacity ${OPACITY_DURATION}ms ease, all ${SIZE_DURATION}ms ease`,
                      "background-image": `linear-gradient(180deg, color-mix(in srgb, ${resolvedColor}, transparent), transparent 80%)`,
                    }}
                  />
                  {resolveHeader(item.header, {
                    isActive,
                    activeIndex,
                    index,
                    distanceFromActive,
                  })}
                </div>

                {/* --- HEIGHT ANIMATION LOGIC --- */}
                <div
                  class={cn(
                    "grid w-[300px] transition-[grid-template-rows] ease-in-out md:w-[500px]",
                    isActive() ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                  style={{
                    "transition-duration": `${SIZE_DURATION}ms`,
                  }}
                >
                  <div class="overflow-hidden">
                    <div
                      class="flex flex-col gap-2 p-4 pt-0"
                      style={{
                        opacity: isActive() ? 1 : 0,
                        transition: `opacity ${OPACITY_DURATION}ms ease ${isActive() ? SIZE_DURATION - OPACITY_DURATION : 0}ms`,
                      }}
                    >
                      <div class="w-full">
                        {resolveContent(item.content, {
                          isActive,
                          activeIndex,
                          index,
                          distanceFromActive,
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                {/* --- END HEIGHT ANIMATION --- */}
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};

type SharedTypes = {
  id: string;
  index: string;
  as?: keyof JSX.IntrinsicElements;
};
export const MorphShared: ParentComponent<SharedTypes> = (props) => {
  const merged = mergeProps({ as: "div" }, props);
  return (
    <Dynamic
      component={merged.as}
      data-flip-id={`${merged.id}-${merged.index}`}
    >
      {merged.children}
    </Dynamic>
  );
};
