import { Show, mergeProps } from 'solid-js'
import { cn, getComputedColor } from '../../lib/utils'
import type { ParentComponent } from 'solid-js'

interface GradientTextProps {
  class?: string
  colors?: Array<string>
  animationSpeed?: number
  showBorder?: boolean
}

const GradientText: ParentComponent<GradientTextProps> = (props) => {
  // Use mergeProps to handle default values while maintaining reactivity
  const merged = mergeProps(
    {
      colors: ['#ffaa40', '#9c40ff', '#ffaa40'],
      animationSpeed: 8,
      showBorder: false,
      class: '',
    },
    props,
  )

  // Computed style for the gradient
  const gradientStyle = () => {
    const resolvedColors = merged.colors.map(getComputedColor)
    return {
      'background-image': `linear-gradient(to right, ${resolvedColors.join(', ')})`,
      'animation-duration': `${merged.animationSpeed}s`,
    }
  }

  return (
    <>
      <style>
        {`
          .gradient-text-anim {
            animation-name: gradient-text-keyframes;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
          }
          @keyframes gradient-text-keyframes {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>
      <div
        class={cn(
          'relative justify-center font-medium backdrop-blur transition-shadow duration-500 ',
          merged.class,
        )}
      >
        <Show when={merged.showBorder}>
          <div
            class="absolute inset-0 bg-cover z-0 pointer-events-none gradient-text-anim"
            style={{
              ...gradientStyle(),
              'background-size': '300% 100%',
            }}
          >
            <div
              class="absolute inset-0 bg-black  z-[-1]"
              style={{
                width: 'calc(100% - 2px)',
                height: 'calc(100% - 2px)',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>
        </Show>
        <div
          class="inline-block relative z-2 text-transparent bg-cover gradient-text-anim"
          style={{
            ...gradientStyle(),
            'background-clip': 'text',
            '-webkit-background-clip': 'text',
            'background-size': '300% 100%',
          }}
        >
          {merged.children}
        </div>
      </div>
    </>
  )
}

export default GradientText
