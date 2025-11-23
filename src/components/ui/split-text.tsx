import {
  children,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  onMount,
} from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText as GSAPSplitText } from 'gsap/SplitText'
import type { JSX, ParentComponent } from 'solid-js'

gsap.registerPlugin(ScrollTrigger, GSAPSplitText)

export interface SplitTextProps {
  class?: string
  delay?: number
  duration?: number
  ease?: string | ((t: number) => number)
  splitType?: 'chars' | 'words' | 'lines' | 'words, chars'
  from?: gsap.TweenVars
  to?: gsap.TweenVars
  threshold?: number
  rootMargin?: string
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div'
  textAlign?: JSX.CSSProperties['text-align']
  onLetterAnimationComplete?: () => void
}

interface CustomHTMLElement extends HTMLElement {
  _rbsplitInstance?: GSAPSplitText
}

const MARGIN_REGEX = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/

const SplitText: ParentComponent<SplitTextProps> = (props) => {
  const merged = mergeProps(
    {
      delay: 100,
      duration: 0.6,
      ease: 'power3.out',
      splitType: 'chars' as const,
      from: { opacity: 0, y: 40 },
      to: { opacity: 1, y: 0 },
      threshold: 0.1,
      rootMargin: '-100px',
      tag: 'div' as const, // Default to div to better handle mixed block/inline children
      textAlign: 'center' as const,
      class: '',
    },
    props,
  )

  let ref: CustomHTMLElement | undefined
  const [fontsLoaded, setFontsLoaded] = createSignal(false)

  // Resolve children to track updates
  const resolvedChildren = children(() => merged.children)

  // Stabilize config objects to prevent unnecessary re-runs
  const stableFrom = createMemo(() => merged.from, undefined, {
    equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  })

  const stableTo = createMemo(() => merged.to, undefined, {
    equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  })

  onMount(() => {
    if (document.fonts.status === 'loaded') {
      setFontsLoaded(true)
    } else {
      document.fonts.ready.then(() => {
        setFontsLoaded(true)
      })
    }
  })

  createEffect(() => {
    const isLoaded = fontsLoaded()
    // Track children changes so we re-split if content updates
    resolvedChildren()
    const delay = merged.delay
    const duration = merged.duration
    const ease = merged.ease
    const splitType = merged.splitType
    const threshold = merged.threshold
    const rootMargin = merged.rootMargin

    const fromConfig = stableFrom()
    const toConfig = stableTo()

    if (!ref || !isLoaded) return

    const el = ref

    // 1. Manual Revert Prevention
    if (el._rbsplitInstance) {
      try {
        el._rbsplitInstance.revert()
      } catch (_) {
        // ignore
      }
      el._rbsplitInstance = undefined
    }

    const ctx = gsap.context(() => {
      // Start Calculation
      const startPct = (1 - threshold) * 100
      const marginMatch = MARGIN_REGEX.exec(rootMargin)
      const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0
      const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px'
      const sign =
        marginValue === 0
          ? ''
          : marginValue < 0
            ? `-=${Math.abs(marginValue)}${marginUnit}`
            : `+=${marginValue}${marginUnit}`
      const start = `top ${startPct}%${sign}`

      const splitInstance = new GSAPSplitText(el, {
        type: splitType,
        smartWrap: true,
        // autoSplit for lines can be tricky with mixed components,
        // so we only use it if explicitly requested for lines
        autoSplit: splitType === 'lines',
        linesClass: 'split-line',
        wordsClass: 'split-word',
        charsClass: 'split-char',
        reduceWhiteSpace: false,
        onSplit: (self: GSAPSplitText) => {
          gsap.set(el, { visibility: 'visible' })

          // CORE LOGIC: Target Selection
          // Instead of relying solely on self.words/chars (which only contain the text nodes GSAP split),
          // we select ALL direct children of the container.
          // This captures the 'div's GSAP created for text AND your custom 'GradientText' components
          // in the exact order they appear in the DOM.
          let targets: Array<Element> | HTMLCollection = []

          // If we are splitting into lines, GSAP wraps everything in divs, so self.lines is usually safe.
          if (splitType.includes('lines') && self.lines.length > 0) {
            targets = self.lines
          } else {
            // For chars/words, we grab the direct children.
            // This assumes the "mixed" content is flattened by GSAP's split process.
            targets = el.children
          }

          gsap.fromTo(
            targets,
            { ...fromConfig },
            {
              ...toConfig,
              duration: duration,
              ease: ease,
              stagger: delay / 1000,
              scrollTrigger: {
                trigger: el,
                start,
                once: true,
                fastScrollEnd: true,
                anticipatePin: 0.4,
              },
              onComplete: () => {
                merged.onLetterAnimationComplete?.()
              },
              willChange: 'transform, opacity',
              force3D: true,
            },
          )
        },
      })

      el._rbsplitInstance = splitInstance
    }, ref)

    onCleanup(() => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === el) st.kill()
      })

      if (el._rbsplitInstance) {
        try {
          el._rbsplitInstance.revert()
        } catch (_) {
          // ignore
        }
        el._rbsplitInstance = undefined
      }

      ctx.revert()
    })
  })

  return (
    <Dynamic
      component={merged.tag}
      ref={ref}
      class={`split-parent inline-block whitespace-normal ${merged.class}`}
      style={{
        'text-align': merged.textAlign,
        'word-wrap': 'break-word',
        contain: 'paint layout',
        visibility: 'hidden',
        'will-change': 'transform, opacity',
      }}
    >
      {resolvedChildren()}
    </Dynamic>
  )
}

export default SplitText
