import { IconCloud } from './ui/icon-cloud'

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
  const icons = slugs.map(
    (slug) => `https://cdn.simpleicons.org/${slug}/${slug}`,
  )
  return <IconCloud icons={icons}></IconCloud>
}
