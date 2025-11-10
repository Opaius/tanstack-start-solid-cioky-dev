/**
 * @file letter-glitch.tsx
 * @description A SolidJS component that renders a "digital rain" or "matrix" style
 * animation of glitching letters on an HTML5 canvas.
 *
 * This component is highly customizable, allowing control over colors, speed,
 * character sets, and visual effects like vignettes. It is optimized for performance
 * by using a canvas and minimizing redraws.
 */
import { Show, createEffect, mergeProps, onCleanup, onMount } from 'solid-js'
import { getComputedColor, hexToRgb, interpolateColor } from '../lib/utils'
import { createDeviceSize } from '../lib/createDeviceSize'
import type { Component } from 'solid-js'

// --- Component Props Interface ---
/**
 * Defines the props for the LetterGlitch component.
 * @property {Array<string>} [glitchColors] - An array of CSS color strings to use for the letters.
 * @property {number} [glitchSpeed] - The delay (in ms) between letter update cycles. Lower is faster.
 * @property {boolean} [centerVignette] - If true, adds a soft vignette effect to the center.
 * @property {boolean} [outerVignette] - If true, adds a vignette effect around the edges.
 * @property {boolean} [smooth] - If true, colors transition smoothly; otherwise, they change instantly.
 * @property {string} [characters] - The string of characters to use in the animation.
 * @property {number} [updateFrequency] - The percentage of letters to update each cycle (0.0 to 1.0).
 * @property {boolean} [pause] - If true, pauses the animation loop.
 * @property {number} [gridColumns] - The number of columns in the letter grid, affecting character size.
 * @property {string} [fontFamily] - The CSS font-family to use for rendering letters.
 */
interface LetterGlitchProps {
  glitchColors?: Array<string>
  glitchSpeed?: number
  centerVignette?: boolean
  outerVignette?: boolean
  smooth?: boolean
  characters?: string
  updateFrequency?: number
  pause?: boolean
  gridColumns?: number
  fontFamily?: string
}

// --- Default Prop Values ---
const defaultProps = {
  glitchColors: ['#2b4539', '#61dca3', '#61b3dc'],
  glitchSpeed: 50,
  centerVignette: false,
  outerVignette: true,
  smooth: true,
  characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789',
  updateFrequency: 0.05,
  pause: false,
  gridColumns: 80,
  fontFamily: 'monospace',
}

/**
 * A component that renders a "digital rain" animation of glitching letters on a canvas.
 * It is highly customizable and optimized for performance.
 */
const LetterGlitch: Component<LetterGlitchProps> = (props) => {
  // --- Prop Merging ---
  // Merge user-provided props with defaults to ensure all values are defined.
  const merged = mergeProps(defaultProps, props)

  // --- State & Reactivity ---
  // A reactive utility to track device size for canvas resizing.
  const device = createDeviceSize()

  // --- Component-level variables ---
  let canvasRef: HTMLCanvasElement | undefined
  let animationFrameId: number | null = null
  // Stores the state of each letter in the grid (char, color, etc.).
  let letters: Array<{
    char: string
    color: string
    targetColor: string
    colorProgress: number
  }> = []
  // Stores the dimensions of the grid.
  let grid = { columns: 0, rows: 0 }
  let context: CanvasRenderingContext2D | null = null
  // Tracks the timestamp of the last glitch update to control the speed.
  let lastGlitchTime = Date.now()

  // --- Calculated size variables for optimization ---
  let calculatedCharWidth = 10
  let calculatedCharHeight = 20
  let calculatedFontSize = 16

  // Pre-parse colors and characters to avoid recalculation in the animation loop.
  const parsedGlitchColors = merged.glitchColors.map(getComputedColor)
  const lettersAndSymbols = Array.from(merged.characters)

  // --- Helper Functions ---

  /**
   * Selects a random character from the available character set.
   * @returns {string} A single random character.
   */
  const getRandomChar = () => {
    return lettersAndSymbols[
      Math.floor(Math.random() * lettersAndSymbols.length)
    ]
  }

  /**
   * Selects a random color from the parsed glitch colors.
   * @returns {string} A random color string.
   */
  const getRandomColor = () => {
    return parsedGlitchColors[
      Math.floor(Math.random() * parsedGlitchColors.length)
    ]
  }

  /**
   * Initializes the `letters` array with random characters and colors based on grid dimensions.
   * @param {number} columns - The number of columns in the grid.
   * @param {number} rows - The number of rows in the grid.
   */
  const initializeLetters = (columns: number, rows: number) => {
    grid = { columns, rows }
    const totalLetters = columns * rows
    letters = Array.from({ length: totalLetters }, () => ({
      char: getRandomChar(),
      color: getRandomColor(),
      targetColor: getRandomColor(),
      colorProgress: 1, // Start fully at the initial color.
    }))
  }

  /**
   * Resizes the canvas to fit its parent container while respecting device pixel ratio.
   * It also recalculates grid dimensions and re-initializes the letters.
   */
  const resizeCanvas = () => {
    const canvas = canvasRef
    if (!canvas) return
    const parent = canvas.parentElement

    if (!parent) {
      console.warn('LetterGlitch: Canvas parent element not found.')
      return
    }

    // Adjust for high-DPI screens to keep rendering sharp.
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = parent.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    // Scale the canvas context to match the device pixel ratio.
    if (context) {
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // --- Optimization: Calculate character sizes based on grid resolution ---
    calculatedCharWidth = rect.width / merged.gridColumns
    calculatedCharHeight = calculatedCharWidth * 2 // Maintain a 1:2 aspect ratio.
    calculatedFontSize = calculatedCharWidth * 1.6 // Tie font size to character width.

    const columns = merged.gridColumns
    const rows = Math.ceil(rect.height / calculatedCharHeight)

    initializeLetters(columns, rows)
    drawLetters() // Perform an initial full draw after resizing.
  }

  /**
   * Clears and redraws all letters on the canvas based on their current state.
   */
  const drawLetters = () => {
    if (!context || letters.length === 0) return
    const ctx = context

    letters.forEach((letter, index) => {
      const x = (index % grid.columns) * calculatedCharWidth
      const y = Math.floor(index / grid.columns) * calculatedCharHeight
      ctx.clearRect(x, y, calculatedCharWidth, calculatedCharHeight)
      ctx.font = `${calculatedFontSize}px ${merged.fontFamily}`
      ctx.textBaseline = 'top'
      ctx.fillStyle = letter.color
      ctx.fillText(letter.char, x, y)
    })
  }

  /**
   * Randomly updates a subset of letters in the grid, changing their character and target color.
   */
  const updateLetters = () => {
    if (letters.length === 0) return

    const updateCount = Math.max(
      1,
      Math.floor(letters.length * merged.updateFrequency),
    )

    for (let i = 0; i < updateCount; i++) {
      const index = Math.floor(Math.random() * letters.length)
      if (!letters[index]) continue

      letters[index].char = getRandomChar()
      letters[index].targetColor = getRandomColor()

      // If not smooth, instantly apply the new color. Otherwise, reset progress for transition.
      if (!merged.smooth) {
        letters[index].color = letters[index].targetColor
        letters[index].colorProgress = 1
      } else {
        letters[index].colorProgress = 0
      }
    }
  }

  /**
   * Handles the smooth color transitions for letters whose colors are changing.
   * @returns {boolean} `true` if any letter's color was updated, indicating a redraw is needed.
   */
  const handleSmoothTransitions = () => {
    let needsRedraw = false
    letters.forEach((letter) => {
      if (letter.colorProgress < 1) {
        letter.colorProgress += 0.05 // Increment the transition progress.
        if (letter.colorProgress > 1) letter.colorProgress = 1

        const startRgb = hexToRgb(letter.color)
        const endRgb = hexToRgb(letter.targetColor)

        // Interpolate between the start and end colors.
        letter.color = interpolateColor(startRgb, endRgb, letter.colorProgress)
        needsRedraw = true
      }
    })
    return needsRedraw
  }

  /**
   * The main animation loop, managed by requestAnimationFrame.
   */
  const animate = () => {
    animationFrameId = requestAnimationFrame(animate)

    // Pause the animation if the `pause` prop is true.
    if (merged.pause) {
      return
    }

    const now = Date.now()
    let needsDraw = false

    // Check if it's time to update the letters based on glitchSpeed.
    if (now - lastGlitchTime >= merged.glitchSpeed) {
      updateLetters()
      needsDraw = true
      lastGlitchTime = now
    }

    // If smooth transitions are enabled, check if any colors need updating.
    if (merged.smooth) {
      const smoothNeedsDraw = handleSmoothTransitions()
      if (smoothNeedsDraw) needsDraw = true
    }

    // Only redraw the canvas if something has changed.
    if (needsDraw) {
      drawLetters()
    }
  }

  // --- Effects ---
  // `onMount` is used for one-time setup when the component is added to the DOM.
  onMount(() => {
    const canvas = canvasRef
    if (!canvas) return

    context = canvas.getContext('2d')
    resizeCanvas() // Initial setup of canvas size and letters
    animate() // Start the animation loop.

    // `onCleanup` ensures we stop the animation when the component is removed.
    onCleanup(() => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    })
  })

  // `createEffect` listens for changes in reactive dependencies and re-runs.
  // Here, it triggers a canvas resize whenever the debounced device size changes.
  createEffect(() => {
    // This effect depends on device.size()
    // We don't need to use the value, just to depend on it.
    // The empty function call `device.size()` creates the subscription.
    device.size()

    // We also need to re-run this if the gridColumns prop changes.
    merged.gridColumns

    if (context) {
      resizeCanvas()
    }
  })

  // --- Render ---
  return (
    <div class="relative w-full h-full bg-black overflow-hidden">
      <canvas ref={canvasRef} class="block w-full h-full" />

      {/* Optional vignette overlays */}
      <Show when={merged.outerVignette}>
        <div class="absolute top-0 left-0 w-full h-full pointer-events-none bg-[radial-gradient(circle,rgba(0,0,0,0)_60%,rgba(0,0,0,1)_100%)]"></div>
      </Show>

      <Show when={merged.centerVignette}>
        <div class="absolute top-0 left-0 w-full h-full pointer-events-none bg-[radial-gradient(circle,rgba(0,0,0,0.8)_0%,rgba(0,0,0,0)_60%)]"></div>
      </Show>
    </div>
  )
}

export default LetterGlitch
