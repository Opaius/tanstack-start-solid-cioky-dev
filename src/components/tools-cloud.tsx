import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from 'solid-js'
import gsap from 'gsap'
import { createDeviceSize } from '../lib/createDeviceSize'
import { IconCloud } from './ui/icon-cloud'
import { DottProgress } from './ui/dott-progress'

function encodeSlug(slug: string): string {
  return `https://cdn.simpleicons.org/${slug}`
}
function decodeSlug(url: string): string {
  return url.replace('https://cdn.simpleicons.org/', '')
}
export function ToolsCloud() {
  const slugs = [
    'typescript',
    'react',
    'html5',
    'css',
    'nodedotjs',
    'nextdotjs',
    'postgresql',
    'docker',
    'git',
    'github',
    'figma',
    'tailwindcss',
    'bun',
    'penpot',
    'drizzle',
    'socketdotio',
    'redis',
    'shadcnui',
    'windsurf',
    'hetzner',
    'coolify',
    'cloudflare',
  ]
  const toolDescriptions: Record<
    string,
    { description: string; progress: number }
  > = {
    hetzner: {
      description:
        "Hetzner provides the high-performance, cost-effective cloud infrastructure that powers my projects. It's the solid foundation I build on.",
      progress: 70,
    },
    coolify: {
      description:
        'Coolify is my open-source, self-hostable Heroku alternative. It simplifies deploying my applications to my own servers with zero fuss.',
      progress: 60,
    },
    cloudflare: {
      description:
        'Cloudflare is my shield and my accelerator. I rely on it for rock-solid security, a global CDN, and keeping my applications fast and available.',
      progress: 80,
    },
    windsurf: {
      description:
        'I leverage Windsurf as my smart co-pilot for advanced code completion and intelligent refactoring, helping me streamline my entire workflow.',
      progress: 60,
    },
    shadcnui: {
      description:
        "Shadcn UI is my toolkit for crafting beautiful, accessible components. It's not a library; it's a starting point for building my own design system.",
      progress: 60,
    },
    socketdotio: {
      description:
        "When I need instant, bi-directional communication, Socket.io is my answer. It's the engine behind my live-updating, real-time applications.",
      progress: 60,
    },
    redis: {
      description:
        "Redis is all about speed. It's my go-to for high-performance, in-memory data storage, whether I'm caching data, managing sessions, or queuing jobs.",
      progress: 40,
    },
    drizzle: {
      description:
        'Drizzle ORM brings full TypeScript safety to my SQL database. It makes writing queries intuitive and managing my schema a breeze.',
      progress: 60,
    },
    penpot: {
      description:
        'Penpot is my open-source design tool of choice. I use it to collaborate on UI/UX, from initial wireframes to pixel-perfect, interactive prototypes.',
      progress: 70,
    },
    typescript: {
      description:
        'Type safety is my safety net. TypeScript helps me write more predictable code while keeping the flexibility of JavaScript.',
      progress: 80,
    },
    react: {
      description:
        'React is my UI soulmate. I build dynamic, component-based interfaces that are as performant as they are beautiful.',
      progress: 80,
    },
    html5: {
      description:
        "The skeleton of the web. I craft semantic HTML that's accessible, SEO-friendly, and built to last.",
      progress: 90,
    },
    css: {
      description:
        'Where design meets code. I use CSS to create responsive layouts and micro-interactions that delight users.',
      progress: 80,
    },
    nodedotjs: {
      description:
        'JavaScript everywhere. I leverage Node.js to build fast, scalable server-side applications and APIs.',
      progress: 60,
    },
    nextdotjs: {
      description:
        'My go-to React framework. Next.js helps me build lightning-fast, SEO-optimized applications with minimal configuration.',
      progress: 80,
    },
    postgresql: {
      description:
        'When data integrity matters. I trust PostgreSQL for robust, complex data operations and rock-solid reliability.',
      progress: 50,
    },
    docker: {
      description:
        'Ship it, ship it right. Docker ensures my applications run consistently from development to production.',
      progress: 70,
    },
    git: {
      description:
        'Time travel for code. Git helps me experiment fearlessly and collaborate effectively.',
      progress: 50,
    },
    github: {
      description:
        'More than just code hosting. I use GitHub for version control, CI/CD, and open-source collaboration.',
      progress: 50,
    },
    figma: {
      description:
        'Where ideas take shape. I use Figma to design, prototype, and bring user experiences to life.',
      progress: 70,
    },
    tailwindcss: {
      description:
        'CSS on turbo mode. I use Tailwind to build beautiful, responsive interfaces at breakneck speed.',
      progress: 90,
    },
    bun: {
      description:
        'The future of JavaScript runtimes. I use Bun for its incredible speed and developer experience.',
      progress: 60,
    },
  }

  let titleRef: HTMLDivElement | undefined
  let descriptionRef: HTMLDivElement | undefined

  const icons = slugs.map((slug) => encodeSlug(slug))
  const [focusedIcon, setFocusedIcon] = createSignal<string | null>(
    encodeSlug('css'),
  )
  const deviceSize = createDeviceSize()
  createEffect(() => {
    const interval = setInterval(() => {
      setFocusedIcon(
        encodeSlug(slugs[Math.floor(Math.random() * slugs.length)]),
      )
    }, 5000)
    return () => clearInterval(interval)
  })
  const canvasSize = createMemo(() => {
    return {
      width: deviceSize.size() < 768 ? 300 : 600,
      height: deviceSize.size() < 768 ? 300 : 600,
    }
  })

  createEffect(() => {
    if (focusedIcon() && titleRef && descriptionRef) {
      // Reset initial state
      gsap.set([titleRef, descriptionRef], {
        opacity: 0,
        y: 20,
      })

      // Create animation
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.to(titleRef, {
        opacity: 1,
        y: 0,
        duration: 0.5,
      }).to(
        descriptionRef,
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
        },
        '-=0.3',
      ) // Start this animation 0.3s before the previous one ends

      // Cleanup function
      onCleanup(() => {
        tl.kill()
      })
    }
  })

  return (
    <div>
      <div>
        <Show when={focusedIcon()}>
          <div class="w-full flex flex-col items-center justify-center gap-4 text-center">
            <div
              ref={titleRef}
              class="capitalize max-w-md text-3xl font-bold bg-linear-to-r from-primary to-secondary w-full py-6 rounded-full"
            >
              {decodeSlug(focusedIcon()!).replace('dot', '.')}
            </div>
            <div
              ref={descriptionRef}
              class="max-w-md text-2xl px-10 bg-linear-to-r from-primary to-secondary w-full py-10 rounded-[2em] font-light leading-8"
            >
              {toolDescriptions[decodeSlug(focusedIcon()!)].description}
              <div class="mt-5 flex flex-col items-center justify-center gap-5">
                <span class="text-md font-medium  text-primary-800">
                  {toolDescriptions[decodeSlug(focusedIcon()!)].progress}%
                  knowledge
                </span>
                <DottProgress
                  progress={
                    toolDescriptions[decodeSlug(focusedIcon()!)].progress
                  }
                  dottColor="var(--color-accent-300)"
                  progressColor="var(--color-primary-800)"
                />
              </div>
            </div>
          </div>
        </Show>
      </div>
      <IconCloud
        images={icons}
        quality={2}
        focusedIcon={focusedIcon}
        onIconChange={setFocusedIcon}
        width={canvasSize().width}
        height={canvasSize().height}
      />
    </div>
  )
}
