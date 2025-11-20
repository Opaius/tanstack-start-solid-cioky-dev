import { createFileRoute } from '@tanstack/solid-router'
import Particles from '../components/ui/particle-background'
import { ProfileCard } from '../components/profile-card'
import { WhoAmIPills } from '../components/who-am-i-pills'
import {
  BgContainer,
  BgController,
} from '../components/ui/background-gradient-switch'
import { ToolsCloud } from '../components/tools-cloud'
import 'solid-devtools'
import { HeaderNav } from '../components/header-nav'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <div class="w-full">
      <HeaderNav />
      <div class="relative w-full h-screen">
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
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-10">
            <ProfileCard />
          </div>
        </div>
      </div>
      <BgController
        options={{
          start: 'top 70%',
          end: 'top 69.9%',
          duration: 0.4,
          ease: 'power1.inOut',
        }}
      >
        <BgContainer as="section" class="h-full" bgEnd="var(--color-accent)">
          <WhoAmIPills />
        </BgContainer>
        <BgContainer
          bgEnd="var(--color-primary)"
          class="w-full h-full flex items-center justify-center"
          as="section"
        >
          <ToolsCloud />
        </BgContainer>
      </BgController>
    </div>
  )
}
