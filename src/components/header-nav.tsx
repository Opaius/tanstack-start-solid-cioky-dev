import { Button } from '@kobalte/core/button'
import { CardNav } from './ui/card-nav'

export function HeaderNav() {
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
    <CardNav logo="cioky.dev" button={<Button>Button</Button>} items={items} />
  )
}
