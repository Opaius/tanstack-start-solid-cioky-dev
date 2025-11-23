import {
  Show,
  createContext,
  createSignal,
  createUniqueId,
  splitProps,
  useContext,
} from 'solid-js'
import gsap from 'gsap'
import Flip from 'gsap/Flip'
import type { JSX, ParentProps } from 'solid-js'

// --- Types ---

interface CardContextValue {
  isOpen: () => boolean
  toggle: () => void
  cardId: string
}

interface CardProps extends ParentProps<JSX.HTMLAttributes<HTMLDivElement>> {
  /** Controlled state: is the card open? */
  isOpen?: boolean
  /** Event handler for state changes */
  onOpenChange?: (isOpen: boolean) => void
  /** Classes for the outer container */
  class?: string
  /** Classes for the inner warping container (the background) */
  contentClass?: string
}

interface CardSubComponentProps
  extends ParentProps<JSX.HTMLAttributes<HTMLDivElement>> {
  /** Optional close button for the Content view */
  showClose?: boolean
}

interface CardSharedElementProps
  extends ParentProps<JSX.HTMLAttributes<HTMLDivElement>> {
  /** The unique ID linking the small element to the big element (e.g., "title", "avatar") */
  id: string
}

// --- Context ---

const CardContext = createContext<CardContextValue>()

const useCardContext = () => {
  const context = useContext(CardContext)
  if (!context) {
    throw new Error('MorphCard components must be used within a <Card>')
  }
  return context
}

// --- Components ---

export function Card(props: CardProps) {
  // Split custom props from standard HTML props
  const [local, rest] = splitProps(props, [
    'isOpen',
    'onOpenChange',
    'class',
    'contentClass',
    'children',
  ])

  // Internal state for uncontrolled usage
  const [internalOpen, setInternalOpen] = createSignal(false)

  // Derived accessor: use prop if provided, otherwise internal state
  const isOpen = () =>
    local.isOpen !== undefined ? local.isOpen : internalOpen()

  const cardId = createUniqueId()
  let containerRef: HTMLDivElement | undefined

  const toggle = () => {
    const nextState = !isOpen()

    if (!containerRef) return

    // 1. Capture State
    // We select all elements inside this specific card instance that have a flip-id
    const elements = containerRef.querySelectorAll(
      `[data-flip-id^="${cardId}"]`,
    )
    const state = Flip.getState(elements)

    // 2. Update State
    if (local.onOpenChange) {
      local.onOpenChange(nextState)
    } else {
      setInternalOpen(nextState)
    }

    // 3. Animate
    // requestAnimationFrame ensures Solid has painted the DOM updates
    requestAnimationFrame(() => {
      if (!containerRef) return

      Flip.from(state, {
        targets: containerRef.querySelectorAll(`[data-flip-id^="${cardId}"]`),
        duration: 0.6,
        ease: 'power3.inOut',
        absolute: true, // Crucial for layout warping
        zIndex: 10,
        // Simple crossfade logic for elements entering/leaving
        onEnter: (elements) =>
          gsap.fromTo(elements, { opacity: 0 }, { opacity: 1, duration: 0.3 }),
        onLeave: (elements) => gsap.to(elements, { opacity: 0, duration: 0.2 }),
      })
    })
  }

  return (
    <CardContext.Provider value={{ isOpen, toggle, cardId }}>
      <div
        ref={containerRef}
        class={local.class}
        {...rest} // Spread standard div props (onClick, style, id, etc.)
      >
        {/* The Background Wrapper that handles the main shape morph */}
        <div
          data-flip-id={`${cardId}-bg`}
          class={`relative overflow-hidden transition-colors ${local.contentClass || 'bg-gray-800 rounded-xl'}`}
        >
          {local.children}
        </div>
      </div>
    </CardContext.Provider>
  )
}

export function CardHeader(props: CardSubComponentProps) {
  const { isOpen, toggle } = useCardContext()
  const [local, rest] = splitProps(props, ['children', 'class'])

  return (
    <Show when={!isOpen()}>
      <div
        onClick={toggle}
        class={`cursor-pointer ${local.class || ''}`}
        {...rest}
      >
        {local.children}
      </div>
    </Show>
  )
}

export function CardContent(props: CardSubComponentProps) {
  const { isOpen, toggle } = useCardContext()
  const [local, rest] = splitProps(props, ['children', 'class', 'showClose'])

  return (
    <Show when={isOpen()}>
      <div class={`h-full w-full ${local.class || ''}`} {...rest}>
        <Show when={local.showClose}>
          <button
            onClick={(e) => {
              e.stopPropagation() // Prevent triggering parent clicks
              toggle()
            }}
            class="absolute top-4 right-4 z-20 text-white/50 hover:text-white transition-colors"
            aria-label="Close card"
          >
            {/* Simple X icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </Show>
        {local.children}
      </div>
    </Show>
  )
}

export function CardSharedElement(props: CardSharedElementProps) {
  const { cardId } = useCardContext()
  const [local, rest] = splitProps(props, ['id', 'children', 'class'])

  return (
    <div
      // We namespace the ID with the cardId to prevent conflicts between different cards
      data-flip-id={`${cardId}-${local.id}`}
      class={local.class}
      {...rest}
    >
      {local.children}
    </div>
  )
}
