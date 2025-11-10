import { createFileRoute } from '@tanstack/solid-router'
import { CardNav } from '../components/card-nav'
import { Button } from '../components/ui/button'
import Particles from '../components/particle-background'
import LetterGlitch from '../components/letter-glitch'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const items = [
    {
      label: 'About',
      bg: 'var(--color-primary)',
      textColor: '#fff',
      links: [
        {
          label: 'My Job Experience',
          ariaLabel: 'About Job Experience',
          href: '/#job-experience',
        },
        {
          label: 'My Skills',
          ariaLabel: 'My Skills',
          href: '/#skills',
        },
        {
          label: 'My Tools',
          ariaLabel: 'My Tools',
          href: '/#tools',
        },
      ],
    },
    {
      label: 'Projects',
      bg: 'var(--color-secondary)',
      textColor: '#fff',
      links: [
        {
          label: 'My Projects',
          ariaLabel: 'My Projects',
          href: '/projects',
        },
      ],
    },
    {
      label: 'Contact',
      bg: 'var(--color-accent)',
      textColor: 'var(--color-text)',
      links: [
        {
          label: 'Email',
          ariaLabel: 'Email me',
          href: 'mailto:ciocan.sebastian45@gmail.com',
        },
        {
          label: 'Instagram',
          ariaLabel: 'Instagram',
          href: 'https://instagram.com/ciokydev',
        },
        {
          label: 'LinkedIn',
          ariaLabel: 'LinkedIn',
          href: 'https://www.linkedin.com/in/sebastian-ciocan-a5aa5138b',
        },
      ],
    },
  ]
  return (
    <div class="w-full">
      <CardNav
        logo="cioky.dev"
        button={<Button>Button</Button>}
        items={items}
      />
      <div class="absolute inset-0 w-full h-full">
        <Particles
          particleColors={[
            'var(--color-secondary)',
            'var(--color-primary)',
            'var(--color-accent)',
          ]}
          particleCount={1000}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false}
        />
      </div>
      <LetterGlitch
        glitchColors={[
          'var(--color-primary)',
          'var(--color-secondary)',
          'var(--color-accent)',
        ]}
        updateFrequency={0.05}
        gridColumns={20}
      />
    </div>
  )
}
