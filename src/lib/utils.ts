import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'

/**
 * Combines multiple class names and merges Tailwind CSS classes
 * @param inputs - Class names or class name objects to be combined
 * @returns A single string of combined and optimized class names
 */
export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

/**
 * Resolves a CSS variable to its computed value
 * @param color - The CSS variable (e.g., 'var(--color-primary)') or direct color value
 * @returns The computed color value or the original color if not a CSS variable
 * @throws Logs an error if the CSS variable cannot be resolved
 */
export const getComputedColor = (color: string): string => {
  // Skip computation during server-side rendering
  if (typeof window === 'undefined' && typeof document === 'undefined')
    return color

  // Base case: Not a variable
  if (!color.startsWith('var(--')) {
    return color
  }

  try {
    // Extract the variable name (e.g., '--color-primary' from 'var(--color-primary)')
    const varName = color.substring(4, color.length - 1)
    const resolvedColor = getComputedStyle(
      document.documentElement,
    ).getPropertyValue(varName)

    const trimmedColor = resolvedColor.trim()

    return trimmedColor
  } catch (e) {
    console.error('Could not resolve CSS variable:', color, e)
    return '#FFFFFF' // Fallback to white if resolution fails
  }
}

/**
 * Converts a color string to normalized RGB values (0-1 range)
 * Supports both hex colors and CSS variables that resolve to RGB
 * @param color - Color string (hex, rgb, or CSS variable)
 * @returns Tuple of [r, g, b] values in 0-1 range
 */
export function hexToRgb(
  color: string,
  normalize: boolean = false,
): [number, number, number] {
  // Handle CSS variables by resolving them once
  if (color.startsWith('var(--')) {
    const resolvedColor = getComputedColor(color)
    // If the resolved color is still a CSS variable, fall back to a default
    if (resolvedColor.startsWith('var(--')) {
      console.warn(
        `Could not fully resolve CSS variable: ${color}. ` +
          `Falling back to white.`,
      )
      return [255, 255, 255]
    }
    // Recursively call hexToRgb with the resolved color
    // (safe because we already checked for CSS variables)
    return hexToRgb(resolvedColor, normalize)
  }

  // Check if the color is already an RGB string
  const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
  if (rgbMatch) {
    const [r, g, b] = rgbMatch
      .slice(1)
      .map((val) => (normalize ? parseInt(val) / 255 : parseInt(val)))
    return [r, g, b]
  }

  // Check if the input is a valid hex color
  if (!/^#?([0-9A-F]{3}){1,2}$/i.test(color)) {
    console.error('Invalid hex color:', color)
    return [255, 255, 255]
  }

  // Process hex colors
  let hex = color.replace(/^#/, '')
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('')
  }

  const int = parseInt(hex, 16)
  const r = ((int >> 16) & 255) / (normalize ? 255 : 1)
  const g = ((int >> 8) & 255) / (normalize ? 255 : 1)
  const b = (int & 255) / (normalize ? 255 : 1)
  return [r, g, b]
}

export function interpolateColor(
  start: [number, number, number],
  end: [number, number, number],
  factor: number,
): string {
  const result = {
    r: Math.round(start[0] + (end[0] - start[0]) * factor),
    g: Math.round(start[1] + (end[1] - start[1]) * factor),
    b: Math.round(start[2] + (end[2] - start[2]) * factor),
  }
  return `rgb(${result.r}, ${result.g}, ${result.b})`
}
