import { PillSandbox } from './ui/matterjs-pill-sandbox'
import type { Pill } from './ui/pill-sandbox'

export function WhoAmIPills() {
  const categories = [
    {
      name: 'my_core_identity',
      color: 'var(--color-primary)',
    },
    {
      name: 'my_core_strengths',
      color: 'var(--color-secondary)',
    },
    {
      name: 'my_traits_and_interests',
      color: 'var(--color-accent)',
    },
  ]
  const whoAmIPills: Array<Pill> = [
    { text: 'Full-Stack Developer', size: 'lg', category: categories[0].name },
    { text: 'UI/UX Designer', size: 'lg', category: categories[0].name },
    { text: 'Innovator', size: 'lg', category: categories[0].name },
    { text: 'Software Engineer', size: 'md', category: categories[0].name },
    { text: 'Creative Coder', size: 'md', category: categories[0].name },
    { text: 'Team Leader', size: 'md', category: categories[0].name },
    { text: 'Maker', size: 'md', category: categories[0].name },
    { text: 'Builder', size: 'md', category: categories[0].name },
    { text: 'Efficient AI User', size: 'lg', category: categories[0].name },

    { text: 'Problem Solver', size: 'lg', category: categories[1].name },
    { text: 'Creative Thinker', size: 'lg', category: categories[1].name },
    { text: 'Product-Minded', size: 'lg', category: categories[1].name },
    { text: 'Communicator', size: 'md', category: categories[1].name },
    { text: 'Collaborator', size: 'md', category: categories[1].name },
    { text: 'Strategic Planner', size: 'md', category: categories[1].name },
    { text: 'User-Centric', size: 'md', category: categories[1].name },
    { text: 'Analytical', size: 'sm', category: categories[1].name },
    { text: 'Decision Maker', size: 'sm', category: categories[1].name },
    { text: 'Process Optimizer', size: 'sm', category: categories[1].name },

    { text: 'Curious', size: 'lg', category: categories[2].name },
    { text: 'Lifelong Learner', size: 'lg', category: categories[2].name },
    { text: 'Gamer', size: 'lg', category: categories[2].name },
    { text: 'Tech Enthusiast', size: 'md', category: categories[2].name },
    { text: 'Detail-Oriented', size: 'md', category: categories[2].name },
    { text: 'Music Aficionado', size: 'md', category: categories[2].name },
    { text: 'Rock & Roll', size: 'lg', category: categories[2].name },
    { text: 'Adaptable', size: 'md', category: categories[2].name },
    { text: 'Sci-Fi Fan', size: 'sm', category: categories[2].name },
    { text: 'Coffee Lover', size: 'sm', category: categories[2].name },
    { text: 'Anime Lover', size: 'md', category: categories[2].name },
  ]
  return (
    <PillSandbox
      pills={whoAmIPills}
      categories={categories}
      containerClass="w-full h-[150vh] md:h-[90vh]"
    />
  )
}
