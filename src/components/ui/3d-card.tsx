// Make sure to run: npm install clsx
import {
  createContext,
  createEffect,
  createSignal,
  mergeProps,
  splitProps,
  useContext,
} from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { cn } from '../../lib/utils'
import type { Component, JSX } from 'solid-js'

// --- Context Setup ---

// The context will provide the signal's [getter, setter] tuple
type MouseEnterContextType = [() => boolean, (v: boolean) => void]

const MouseEnterContext = createContext<MouseEnterContextType | undefined>(
  undefined,
)

// Hook to use the context
export const useMouseEnter = () => {
  const context = useContext(MouseEnterContext)
  if (context === undefined) {
    throw new Error(
      'useMouseEnter must be used within a MouseEnterContext.Provider',
    )
  }
  return context
}

// --- CardContainer Component ---

interface CardContainerProps {
  children?: JSX.Element
  class?: string
  containerclass?: string
}

export const CardContainer: Component<CardContainerProps> = (props) => {
  let containerRef: HTMLDivElement | undefined
  const [isMouseEntered, setIsMouseEntered] = createSignal(false)

  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef) return
    const { left, top, width, height } = containerRef.getBoundingClientRect()
    const x = (e.clientX - left - width / 2) / 25
    const y = (e.clientY - top - height / 2) / 25
    containerRef.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`
  }

  const handleMouseEnter = () => {
    setIsMouseEntered(true)
  }

  const handleMouseLeave = () => {
    if (!containerRef) return
    setIsMouseEntered(false)
    containerRef.style.transform = `rotateY(0deg) rotateX(0deg)`
  }

  return (
    <MouseEnterContext.Provider value={[isMouseEntered, setIsMouseEntered]}>
      <div
        class={cn(
          'py-20 flex items-center justify-center',
          props.containerclass,
        )}
        style={{ perspective: '1000px' }}
      >
        <div
          ref={containerRef} // Assign the 'let' variable here
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          class={cn(
            'flex items-center justify-center relative transition-transform duration-300 ease-out',
            props.class,
          )}
          style={{ 'transform-style': 'preserve-3d' }}
        >
          {props.children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  )
}

// --- CardBody Component ---

interface CardBodyProps {
  children: JSX.Element
  class?: string
}

export const CardBody: Component<CardBodyProps> = (props) => {
  return (
    <div class={cn('h-96 w-96 transform-3d *:transform-3d', props.class)}>
      {props.children}
    </div>
  )
}

// --- CardItem Component ---

interface CardItemProps {
  as?: string | Component
  children: JSX.Element
  class?: string
  translateX?: number | string
  translateY?: number | string
  translateZ?: number | string
  rotateX?: number | string
  rotateY?: number | string
  rotateZ?: number | string
  [key: string]: any // Allows passing other HTML attributes
}

export const CardItem: Component<CardItemProps> = (props) => {
  // Use mergeProps to set default values for props idiomatically
  const merged = mergeProps(
    {
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      as: 'div',
    },
    props,
  )

  // Use splitProps to separate our component props from 'rest'
  const [local, rest] = splitProps(merged, [
    'as',
    'children',
    'class',
    'translateX',
    'translateY',
    'translateZ',
    'rotateX',
    'rotateY',
    'rotateZ',
  ])

  let ref: HTMLElement | undefined
  const [isMouseEntered] = useMouseEnter()

  // createEffect runs when its dependencies (isMouseEntered) change
  createEffect(() => {
    if (!ref) return

    // We must *call* the accessor to get the value
    if (isMouseEntered()) {
      ref.style.transform = `translateX(${local.translateX}px) translateY(${local.translateY}px) translateZ(${local.translateZ}px) rotateX(${local.rotateX}deg) rotateY(${local.rotateY}deg) rotateZ(${local.rotateZ}deg)`
    } else {
      ref.style.transform = `translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`
    }
  })

  return (
    <Dynamic
      component={local.as} // Use the <Dynamic> component for the 'as' prop
      ref={ref}
      class={cn('w-fit transition duration-200 ease-linear', local.class)}
      {...rest} // Spread the remaining HTML attributes
    >
      {local.children}
    </Dynamic>
  )
}
