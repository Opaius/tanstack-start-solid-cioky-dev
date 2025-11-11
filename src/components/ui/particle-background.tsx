import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  onMount,
} from 'solid-js'
import { Camera, Geometry, Mesh, Program, Renderer } from 'ogl'
import gsap from 'gsap'
import { hexToRgb } from '../../lib/utils'
import type { Component } from 'solid-js'

/**
 * @interface ParticlesProps
 * @description Defines the props for the Particles component.
 * @property {number} [particleCount=200] - The total number of particles to render.
 * @property {number} [particleSpread=10] - The radius of the sphere in which particles are distributed.
 * @property {number} [speed=0.1] - The animation speed of the particles.
 * @property {Array<string>} [particleColors] - An array of CSS variable strings for particle colors.
 * @property {boolean} [moveParticlesOnHover=false] - Whether particles should react to mouse movement.
 * @property {number} [particleHoverFactor=1] - The intensity of the particle movement on hover.
 * @property {boolean} [alphaParticles=false] - Toggles whether particles have a soft, transparent edge.
 * @property {number} [particleBaseSize=100] - The base size of each particle.
 * @property {number} [sizeRandomness=1] - The degree of random variation in particle size.
 * @property {number} [cameraDistance=20] - The distance of the camera from the particle origin.
 * @property {boolean} [disableRotation=false] - Disables the automatic rotation of the particle system.
 * @property {string} [class] - Additional CSS classes to apply to the container element.
 */
interface ParticlesProps {
  particleCount?: number
  particleSpread?: number
  speed?: number
  particleColors?: Array<string>
  moveParticlesOnHover?: boolean
  particleHoverFactor?: number
  alphaParticles?: boolean
  particleBaseSize?: number
  sizeRandomness?: number
  cameraDistance?: number
  disableRotation?: boolean
  class?: string
}

// Default colors for the particles, using CSS variables for theming.
const defaultColors: Array<string> = [
  'var(--color-background)',
  'var(--color-primary-500)',
  'var(--color-accent-500)',
]

/**
 * @function isWebglSupported
 * @description Checks if the browser supports WebGL.
 * @returns {boolean} True if WebGL is supported, false otherwise.
 */
const isWebglSupported = (): boolean => {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    )
  } catch (e) {
    return false
  }
}

// GLSL vertex shader code for positioning and sizing particles.
const vertex = /* glsl */ `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;
  
  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;
  
  varying vec4 vRandom;
  varying vec3 vColor;
  
  void main() {
    vRandom = random;
    vColor = color;
    
    // Spread particles in a spherical volume
    vec3 pos = position * uSpread;
    pos.z *= 10.0; // Stretch the dist  ribution along the z-axis
    
    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    
    // Animate particle positions using sine waves and random values for a natural, floating effect
    float t = uTime;
    mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
    mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
    mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);
    
    vec4 mvPos = viewMatrix * mPos;

    // Calculate particle size, adjusting for perspective
    if (uSizeRandomness == 0.0) {
      gl_PointSize = uBaseSize;
    } else {
      // Apply size randomness and scale by distance to create a 3D perspective effect
      gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
    }
    
    gl_Position = projectionMatrix * mvPos;
  }
`

// GLSL fragment shader for coloring the particles.
const fragment = /* glsl */ `
  precision highp float;
  
  uniform float uTime;
  uniform float uAlphaParticles;
  varying vec4 vRandom;
  varying vec3 vColor;
  
  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5)); // Distance from the center of the point
    
    // Determine if particles should be solid circles or have soft, alpha-blended edges
    if(uAlphaParticles < 0.5) {
      // Discard pixels outside the circular shape for hard edges
      if(d > 0.5) {
        discard;
      }
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), 1.0);
    } else {
      // Use smoothstep for a soft, anti-aliased edge
      float circle = smoothstep(0.5, 0.4, d) * 0.8;
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), circle);
    }
  }
`
/**
 * @component Particles
 * @description A SolidJS component that renders an animated 3D particle background using OGL (a minimal WebGL library) and GSAP.
 * It creates a spherical distribution of particles that float and can optionally react to mouse movement.
 * @param {ParticlesProps} props - The properties to customize the particle system.
 * @returns {JSX.Element} A div element that contains the WebGL canvas or a fallback message.
 */
const Particles: Component<ParticlesProps> = (props) => {
  // Merge user-provided props with default values to ensure all options are set.
  const merged = mergeProps(
    {
      particleCount: 200,
      particleSpread: 10,
      speed: 0.1,
      particleColors: defaultColors,
      moveParticlesOnHover: false,
      particleHoverFactor: 1,
      alphaParticles: false,
      particleBaseSize: 100,
      sizeRandomness: 1,
      cameraDistance: 20,
      disableRotation: false,
    },
    props,
  )

  // A ref to hold the container div element for the WebGL canvas.
  let containerRef: HTMLDivElement | undefined
  // A plain object to store the latest normalized mouse position (-1 to 1).
  const mousePos = { x: 0, y: 0 }
  // A signal to track WebGL support.
  const [webglSupported, setWebglSupported] = createSignal(true)

  // onMount runs once after the component's DOM elements are mounted.
  onMount(() => {
    if (!isWebglSupported()) {
      setWebglSupported(false)
      console.warn('WebGL is not supported. Particle background is disabled.')
      return
    }
    if (!containerRef) return
    // Fade in the canvas container for a smooth appearance.
    gsap.fromTo(containerRef, { opacity: 0 }, { opacity: 1, duration: 1 })
  })

  // Memoize expensive particle data generation.
  // This recalculates only when particleCount or particleColors change.
  const particleData = createMemo(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined')
      return {
        positions: new Float32Array([]),
        randoms: new Float32Array([]),
        colors: new Float32Array([]),
      }
    const count = merged.particleCount
    const positions = new Float32Array(count * 3)
    const randoms = new Float32Array(count * 4)
    const colors = new Float32Array(count * 3)

    const palette =
      merged.particleColors.length > 0 ? merged.particleColors : defaultColors
    const fallbackColor = hexToRgb(palette[0] ?? '#000000')

    for (let i = 0; i < count; i++) {
      let x: number, y: number, z: number, len: number
      do {
        x = Math.random() * 2 - 1
        y = Math.random() * 2 - 1
        z = Math.random() * 2 - 1
        len = x * x + y * y + z * z
      } while (len > 1 || len === 0)
      const r = Math.cbrt(Math.random())
      positions.set([x * r, y * r, z * r], i * 3)
      randoms.set(
        [Math.random(), Math.random(), Math.random(), Math.random()],
        i * 4,
      )

      // Handle potential invalid color strings gracefully.
      try {
        const colorStr = palette[Math.floor(Math.random() * palette.length)]
        const col = hexToRgb(colorStr, true)
        colors.set(col, i * 3)
      } catch (e) {
        console.warn(
          `Invalid color string in particleColors. Using fallback.`,
          e,
        )
        colors.set(fallbackColor, i * 3)
      }
    }
    return { positions, randoms, colors }
  })

  // createEffect re-runs when its dependencies change, rebuilding the WebGL scene.
  createEffect(() => {
    if (!webglSupported() || !containerRef) return

    const container = containerRef
    const data = particleData() // Depend on memoized data.
    const renderer = new Renderer({ depth: false, alpha: true })
    const gl = renderer.gl
    container.appendChild(gl.canvas)
    gl.clearColor(0, 0, 0, 0)

    const camera = new Camera(gl, { fov: 15 })
    camera.position.set(0, 0, merged.cameraDistance)

    const resize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      renderer.setSize(width, height)
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height })
    }
    window.addEventListener('resize', resize, false)
    resize()

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      mousePos.x = x
      mousePos.y = y
    }

    if (merged.moveParticlesOnHover) {
      container.addEventListener('mousemove', handleMouseMove)
    }

    const geometry = new Geometry(gl, {
      position: { size: 3, data: data.positions },
      random: { size: 4, data: data.randoms },
      color: { size: 3, data: data.colors },
    })

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: merged.particleSpread },
        uBaseSize: { value: merged.particleBaseSize },
        uSizeRandomness: { value: merged.sizeRandomness },
        uAlphaParticles: { value: merged.alphaParticles ? 1 : 0 },
      },
      transparent: true,
      depthTest: false,
    })

    const particles = new Mesh(gl, { mode: gl.POINTS, geometry, program })

    let animationFrameId: number
    let lastTime = performance.now()
    let elapsed = 0

    const update = (t: number) => {
      animationFrameId = requestAnimationFrame(update)
      const delta = t - lastTime
      lastTime = t
      elapsed += delta * merged.speed

      program.uniforms.uTime.value = elapsed * 0.001

      if (merged.moveParticlesOnHover) {
        particles.position.x = -mousePos.x * merged.particleHoverFactor
        particles.position.y = -mousePos.y * merged.particleHoverFactor
      } else {
        particles.position.x = 0
        particles.position.y = 0
      }

      if (!merged.disableRotation) {
        particles.rotation.x = Math.sin(elapsed * 0.0002) * 0.1
        particles.rotation.y = Math.cos(elapsed * 0.0005) * 0.15
        particles.rotation.z += 0.01 * merged.speed
      }

      renderer.render({ scene: particles, camera })
    }

    animationFrameId = requestAnimationFrame(update)

    onCleanup(() => {
      window.removeEventListener('resize', resize)
      if (merged.moveParticlesOnHover) {
        container.removeEventListener('mousemove', handleMouseMove)
      }
      cancelAnimationFrame(animationFrameId)
      if (container.contains(gl.canvas)) {
        container.removeChild(gl.canvas)
      }
    })
  })

  return (
    <div
      ref={containerRef}
      class={`relative w-full h-full ${merged.class || ''}`}
    >
      <Show when={!webglSupported()}>
        <div class="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
          <p>WebGL is not supported on this browser.</p>
        </div>
      </Show>
    </div>
  )
}

export default Particles
